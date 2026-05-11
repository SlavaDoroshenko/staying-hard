import { invoke } from "@tauri-apps/api/core";
import {
  deleteLogById,
  getLogByTaskAndSlot,
  insertLog,
  updateLogStatus,
} from "@/lib/db/logs";
import { getTask, updateTask } from "@/lib/db/tasks";
import { computeNextFire } from "@/lib/schedule/next-fire";
import type { TaskStatus } from "@/types/task";

export interface ResolveInput {
  taskId: string;
  scheduledAt: number;
  status: Extract<TaskStatus, "completed" | "skipped" | "missed">;
  quickAction?: string;
}

function notifLabel(taskId: string, scheduledAt: number) {
  return `notif-${taskId}-${scheduledAt}`;
}

export async function resolveNotification(input: ResolveInput): Promise<void> {
  // If the engine already inserted a pending log when it fired this slot,
  // UPDATE it. Otherwise (user pre-completed before the engine fired) INSERT.
  // One log per (task, scheduledAt) — no double-logging, no phantom "missed".
  const existing = await getLogByTaskAndSlot(input.taskId, input.scheduledAt);
  const completedAt = input.status === "completed" ? Date.now() : null;
  const quickAction = input.quickAction ?? null;

  if (existing && existing.id != null) {
    await updateLogStatus(existing.id, input.status, completedAt, quickAction);
  } else {
    await insertLog({
      taskId: input.taskId,
      scheduledAt: input.scheduledAt,
      completedAt,
      status: input.status,
      quickAction,
    });
  }

  // Advance the task's cycle when the user resolves a slot from Today.
  // The engine does this when it fires; but if the user pre-completes (or
  // post-marks a slot the engine never fired because nextFireAt got stale),
  // the schedule otherwise stays stuck on the old date and the same row
  // keeps appearing on subsequent days. Only advance if this resolution is
  // newer than what's recorded — protects against out-of-order clicks for
  // interval tasks where lastFireAt should track the LATEST fire.
  try {
    const task = await getTask(input.taskId);
    if (
      task &&
      (task.lastFireAt == null || input.scheduledAt > task.lastFireAt)
    ) {
      const nextFireAt = computeNextFire(
        task.schedule,
        new Date(),
        input.scheduledAt,
      );
      await updateTask(input.taskId, {
        lastFireAt: input.scheduledAt,
        nextFireAt,
      });
    }
  } catch (err) {
    console.warn("task advancement after resolve failed", err);
  }

  // Mark the window as internally resolved so a subsequent close() bypasses
  // the hard-window CloseRequested guard. Closing the window itself is done
  // by the caller (NotificationShell) via `getCurrentWindow().close()` —
  // direct webview API, no extra invoke round-trip that could hang.
  const label = notifLabel(input.taskId, input.scheduledAt);
  try {
    await invoke("mark_notification_resolved", { label });
  } catch (err) {
    console.warn("mark_notification_resolved failed", err);
  }
}

/**
 * Undo a completion. Deletes the log for (task, slot) entirely. With the
 * single-log model the slot just disappears — no leftover pending → missed
 * sweep, no phantom "missed" row appearing after the user undoes.
 */
export async function unresolveCompletion(input: {
  taskId: string;
  scheduledAt: number;
}): Promise<void> {
  const existing = await getLogByTaskAndSlot(input.taskId, input.scheduledAt);
  if (existing && existing.id != null) {
    await deleteLogById(existing.id);
  }
}
