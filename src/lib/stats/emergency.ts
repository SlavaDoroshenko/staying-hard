import { listAllTasks } from "@/lib/db/tasks";
import { listLogsForRange } from "@/lib/db/logs";
import { startOfDay, endOfDay } from "@/lib/time/day";
import type { TaskCategory } from "@/types/task";

export interface EmergencyCheck {
  category: Exclude<TaskCategory, "water">;
  daysWithout: number;
  threshold: number;
  message: string;
}

const DAY_MS = 86_400_000;

const RULES: {
  category: EmergencyCheck["category"];
  threshold: number;
  message: string;
}[] = [
  {
    category: "food",
    threshold: 3,
    message:
      "3 дня без полноценной еды. Тело работает на резервах. Закажи доставку — это две минуты.",
  },
  {
    category: "hygiene",
    threshold: 5,
    message:
      "5 дней без душа. Это не про эстетику — про микрофлору и сон. 10 минут сейчас.",
  },
  {
    category: "cleaning",
    threshold: 7,
    message:
      "7 дней без уборки. Среда обитания влияет на ментальное состояние. Хотя бы посуда.",
  },
];

const LOOKBACK_DAYS = 14;

/**
 * Detect emergency conditions. Returns 0..N triggered emergencies.
 *
 * Rules:
 * - For each category, find the most recent `completed` log.
 * - If `now - lastCompleted >= threshold days`, an emergency is active.
 * - Grace period: if the user has NO completed logs in the lookback window
 *   at all (fresh install, just seeded), suppress all emergencies — we don't
 *   know what their baseline is yet.
 */
export async function detectEmergencies(
  now: Date = new Date(),
): Promise<EmergencyCheck[]> {
  const tasks = await listAllTasks();
  const taskById = new Map(tasks.map((t) => [t.id, t]));

  const fromMs = startOfDay(
    new Date(now.getTime() - LOOKBACK_DAYS * DAY_MS),
  ).getTime();
  const toMs = endOfDay(now).getTime();
  const logs = await listLogsForRange(fromMs, toMs);

  // Suppress only on truly fresh installs (no logs at all in the lookback
  // window). If the user has been *missing* tasks, that's exactly the case
  // emergency mode is for — don't gate it off.
  if (logs.length === 0) return [];

  const lastCompletedByCategory: Record<EmergencyCheck["category"], number> = {
    food: 0,
    hygiene: 0,
    cleaning: 0,
  };

  for (const log of logs) {
    if (log.status !== "completed" || log.completedAt == null) continue;
    const task = taskById.get(log.taskId);
    if (!task) continue;
    if (task.category === "water") continue;
    const cat = task.category as EmergencyCheck["category"];
    if (log.completedAt > lastCompletedByCategory[cat]) {
      lastCompletedByCategory[cat] = log.completedAt;
    }
  }

  const out: EmergencyCheck[] = [];
  for (const rule of RULES) {
    const last = lastCompletedByCategory[rule.category];
    if (last === 0) continue; // no record at all → don't fire (fresh user / empty category)
    const daysWithout = Math.floor((now.getTime() - last) / DAY_MS);
    if (daysWithout >= rule.threshold) {
      out.push({
        category: rule.category,
        daysWithout,
        threshold: rule.threshold,
        message: rule.message,
      });
    }
  }
  return out;
}
