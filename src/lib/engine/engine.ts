import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { computeNextFire } from "@/lib/schedule/next-fire";
import { listActiveTasks, updateTask } from "@/lib/db/tasks";
import {
  getLogByTaskAndSlot,
  insertLog,
  markPendingMissed,
} from "@/lib/db/logs";
import { detectEmergencies } from "@/lib/stats/emergency";
import { buildWeekReview } from "@/lib/stats/review";
import { getSetting, setSetting } from "@/lib/db/settings";

let started = false;
let busy = false;

export async function startEngine(): Promise<void> {
  if (started) return;
  started = true;

  await listen<number>("scheduler/tick", async (event) => {
    if (busy) return;
    busy = true;
    try {
      await processDueTasks(event.payload);
    } catch (err) {
      console.error("engine tick failed", err);
    } finally {
      busy = false;
    }
  });

  await processDueTasks(Date.now());
}

const EMERGENCY_DEDUP_MS = 4 * 60 * 60 * 1000; // re-fire same emergency at most every 4h

async function processDueTasks(nowMs: number): Promise<void> {
  // Sweep stale pending logs: a soft notification closed via X (or never
  // interacted with) leaves a `pending` log. After 5 minutes we accept that
  // the slot is missed. Generous enough that a thoughtful user mid-decision
  // doesn't get prematurely flagged.
  await markPendingMissed(nowMs - 5 * 60_000);

  // Emergency check (food 3d / hygiene 5d / cleaning 7d). Cheap query, runs
  // once per tick.
  await checkEmergencies(nowMs);

  // Sunday review at 22:00.
  await checkSundayReview(nowMs);

  const tasks = await listActiveTasks();
  const now = new Date(nowMs);
  for (const task of tasks) {
    if (task.nextFireAt == null || task.nextFireAt > nowMs) continue;
    // Each task is wrapped in its own try/catch so a single bad task
    // (e.g. malformed schedule JSON, transient SQL error, refused window
    // creation) doesn't abort the rest of the tick. The unprocessed task
    // self-heals on the next tick if its data becomes valid.
    try {
      const existing = await getLogByTaskAndSlot(task.id, task.nextFireAt);

      if (!existing) {
        await invoke("open_notification_window", {
          payload: {
            taskId: task.id,
            title: task.title,
            category: task.category,
            level: task.notificationLevel,
            scheduledAt: task.nextFireAt,
            estimateMinutes: task.estimateMinutes ?? null,
          },
        });

        await insertLog({
          taskId: task.id,
          scheduledAt: task.nextFireAt,
          completedAt: null,
          status: "pending",
        });
      }

      const fired = task.nextFireAt;
      const next = computeNextFire(task.schedule, now, fired);
      await updateTask(task.id, {
        lastFireAt: fired,
        nextFireAt: next,
      });
    } catch (err) {
      console.error(`[engine] task ${task.id} failed`, err);
    }
  }
}

const SIX_DAYS_MS = 6 * 86_400_000;

async function checkSundayReview(nowMs: number): Promise<void> {
  const now = new Date(nowMs);
  if (now.getDay() !== 0) return; // not Sunday
  if (now.getHours() !== 22) return; // 22:00–22:59 only

  const lastShown = await getSetting("sunday_review_lastShown");
  if (lastShown && nowMs - Number(lastShown) < SIX_DAYS_MS) return;

  try {
    const review = await buildWeekReview(now);
    await invoke("open_review_window", {
      dataJson: encodeURIComponent(JSON.stringify(review)),
    });
    await setSetting("sunday_review_lastShown", String(nowMs));
  } catch (err) {
    console.error("sunday review failed", err);
  }
}

async function checkEmergencies(nowMs: number): Promise<void> {
  const emergencies = await detectEmergencies(new Date(nowMs));
  for (const e of emergencies) {
    const dedupKey = `emergency_${e.category}_lastShown`;
    const lastShown = await getSetting(dedupKey);
    if (lastShown && nowMs - Number(lastShown) < EMERGENCY_DEDUP_MS) continue;

    try {
      await invoke("open_emergency_window", {
        payload: {
          category: e.category,
          daysWithout: e.daysWithout,
          message: e.message,
        },
      });
      await setSetting(dedupKey, String(nowMs));
    } catch (err) {
      console.error("emergency notification failed", err);
    }
  }
}

export async function recomputeAllNextFire(now: Date = new Date()): Promise<void> {
  const tasks = await listActiveTasks();
  for (const task of tasks) {
    // Critical: pass the task's *last actual fire*, not its planned next fire.
    // For every_n_days the math is `lastFireAt + N`, so feeding nextFireAt
    // shifts the schedule N days forward on every app restart.
    const next = computeNextFire(
      task.schedule,
      now,
      task.lastFireAt ?? null,
    );
    if (next !== task.nextFireAt) {
      await updateTask(task.id, { nextFireAt: next });
    }
  }
}
