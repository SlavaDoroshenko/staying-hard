import { listAllTasks } from "@/lib/db/tasks";
import { listLogsForRange } from "@/lib/db/logs";
import { startOfDay, endOfDay } from "@/lib/time/day";
import type { TaskCategory } from "@/types/task";

export interface DaySummary {
  date: Date;
  total: number;
  completed: number;
  skipped: number;
  missed: number;
  ratio: number;
}

export async function getDaySummary(d: Date): Promise<DaySummary> {
  const from = startOfDay(d).getTime();
  const to = endOfDay(d).getTime();
  const logs = await listLogsForRange(from, to);
  const completed = logs.filter((l) => l.status === "completed").length;
  const skipped = logs.filter((l) => l.status === "skipped").length;
  const missed = logs.filter((l) => l.status === "missed").length;
  const total = logs.length;
  return {
    date: d,
    total,
    completed,
    skipped,
    missed,
    ratio: total === 0 ? 0 : completed / total,
  };
}

export async function getWeekSummary(today: Date = new Date()): Promise<DaySummary[]> {
  const out: DaySummary[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push(await getDaySummary(d));
  }
  return out;
}

/**
 * 5-week calendar grid (35 days) aligned Monday-Sunday. Last cell = today.
 * Future days inside the current week return zeroed summaries — render as
 * empty cells in the heatmap.
 */
export async function getMonthSummary(today: Date = new Date()): Promise<DaySummary[]> {
  const out: DaySummary[] = [];
  const dow = today.getDay(); // 0=Sun
  const mondayOffset = dow === 0 ? 6 : dow - 1;
  const start = new Date(today);
  start.setDate(start.getDate() - mondayOffset - 28);
  for (let i = 0; i < 35; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    out.push(await getDaySummary(d));
  }
  return out;
}

/**
 * Walk back from today while at least one task was completed each day.
 * Returns the streak length and the date it started.
 */
export async function getStreakWithStart(
  today: Date = new Date(),
): Promise<{ days: number; since: Date | null }> {
  let streak = 0;
  let since: Date | null = null;
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const summary = await getDaySummary(d);
    if (summary.total === 0) {
      if (i === 0) return { days: 0, since: null };
      continue;
    }
    if (summary.completed > 0) {
      streak++;
      since = d;
    } else {
      break;
    }
  }
  return { days: streak, since };
}

export interface TopMissed {
  taskId: string;
  title: string;
  category: TaskCategory;
  count: number;
}

export async function getTopMissed(
  daysBack: number = 14,
  topN: number = 5,
): Promise<TopMissed[]> {
  const to = endOfDay(new Date()).getTime();
  const from = startOfDay(new Date(Date.now() - daysBack * 86400_000)).getTime();
  const logs = await listLogsForRange(from, to);
  const tasks = await listAllTasks();
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const counts = new Map<string, number>();
  for (const log of logs) {
    if (log.status === "missed" || log.status === "skipped") {
      counts.set(log.taskId, (counts.get(log.taskId) ?? 0) + 1);
    }
  }
  const entries: TopMissed[] = [];
  for (const [taskId, count] of counts) {
    const task = taskById.get(taskId);
    if (!task) continue;
    entries.push({
      taskId,
      title: task.title,
      category: task.category,
      count,
    });
  }
  entries.sort((a, b) => b.count - a.count);
  return entries.slice(0, topN);
}

/**
 * Streak = number of consecutive days ending today where at least one task
 * was completed. If today has zero logs (no tasks were due yet), it doesn't
 * break the streak — we look back to the previous active day.
 */
export async function getStreak(today: Date = new Date()): Promise<number> {
  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const summary = await getDaySummary(d);
    if (summary.total === 0) {
      // No tasks were due that day; doesn't extend or break the streak.
      // For the FIRST day (i=0) treat as zero streak.
      if (i === 0) return 0;
      continue;
    }
    if (summary.completed > 0) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
