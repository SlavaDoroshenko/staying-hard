import { listAllTasks } from "@/lib/db/tasks";
import { listLogsForRange } from "@/lib/db/logs";
import { startOfDay, endOfDay } from "@/lib/time/day";

export interface WeekReview {
  food: { done: number; total: number };
  hygiene: { done: number; total: number };
  cleaning: { done: number; total: number };
  topMissed: { title: string; dayName: string } | null;
}

const RU_DOW_PHRASE = [
  "в воскресенье",
  "в понедельник",
  "во вторник",
  "в среду",
  "в четверг",
  "в пятницу",
  "в субботу",
];

const DAY_MS = 86_400_000;

/**
 * Build a 7-day summary ending at `now`. "Done" for a category means at least
 * one task in that category was completed that day.
 */
export async function buildWeekReview(
  now: Date = new Date(),
): Promise<WeekReview> {
  const tasks = await listAllTasks();
  const taskById = new Map(tasks.map((t) => [t.id, t]));

  const fromMs = startOfDay(new Date(now.getTime() - 6 * DAY_MS)).getTime();
  const toMs = endOfDay(now).getTime();
  const logs = await listLogsForRange(fromMs, toMs);

  const completedCatsPerDay: Record<string, Set<string>> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    completedCatsPerDay[d.toDateString()] = new Set();
  }

  for (const log of logs) {
    if (log.status !== "completed") continue;
    const task = taskById.get(log.taskId);
    if (!task) continue;
    const dKey = new Date(log.scheduledAt).toDateString();
    completedCatsPerDay[dKey]?.add(task.category);
  }

  const countDays = (cat: string) =>
    Object.values(completedCatsPerDay).filter((s) => s.has(cat)).length;

  const missCounts = new Map<string, number>();
  const missByDow = new Map<string, number[]>();
  for (const log of logs) {
    if (log.status !== "missed" && log.status !== "skipped") continue;
    const task = taskById.get(log.taskId);
    if (!task) continue;
    missCounts.set(task.title, (missCounts.get(task.title) ?? 0) + 1);
    const dow = new Date(log.scheduledAt).getDay();
    const arr = missByDow.get(task.title) ?? Array(7).fill(0);
    arr[dow]++;
    missByDow.set(task.title, arr);
  }

  let topMissed: WeekReview["topMissed"] = null;
  let maxCount = 0;
  for (const [title, count] of missCounts) {
    if (count > maxCount) {
      maxCount = count;
      const arr = missByDow.get(title)!;
      const peakDow = arr.indexOf(Math.max(...arr));
      topMissed = {
        title: title.toLowerCase(),
        dayName: RU_DOW_PHRASE[peakDow]!,
      };
    }
  }

  return {
    food: { done: countDays("food"), total: 7 },
    hygiene: { done: countDays("hygiene"), total: 7 },
    cleaning: { done: countDays("cleaning"), total: 7 },
    topMissed,
  };
}
