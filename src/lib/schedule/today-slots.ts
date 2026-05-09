import type { RecurringTask } from "@/types/task";

function parseTime(t: string): { h: number; m: number } {
  const parts = t.split(":");
  return { h: Number(parts[0] ?? 0), m: Number(parts[1] ?? 0) };
}

function setLocalTime(d: Date, h: number, m: number): Date {
  const out = new Date(d);
  out.setHours(h, m, 0, 0);
  return out;
}

/**
 * Enumerate every scheduled slot for `task` whose timestamp falls within
 * [dayStartMs, dayEndMs]. Independent of whether the engine actually fired —
 * the Today UI shows the day's plan, not just past fires.
 *
 * - fixed_times: every entry whose HH:MM falls today.
 * - daily: today at the configured time.
 * - every_n_days: today only if `nextFireAt` or `lastFireAt` lands today.
 *   We don't reverse-engineer the cadence beyond what the task already records.
 * - interval: every step inside the active window. Window may wrap past
 *   midnight, so previous-day's window contributing to this morning's slots
 *   is also enumerated.
 */
export function generateSlotsForDay(
  task: RecurringTask,
  dayStartMs: number,
  dayEndMs: number,
): number[] {
  const dayDate = new Date(dayStartMs);
  const slots = new Set<number>();
  const within = (ts: number) => ts >= dayStartMs && ts <= dayEndMs;

  switch (task.schedule.type) {
    case "fixed_times": {
      for (const t of task.schedule.times) {
        const { h, m } = parseTime(t);
        const slot = setLocalTime(dayDate, h, m).getTime();
        if (within(slot)) slots.add(slot);
      }
      break;
    }
    case "daily": {
      const { h, m } = parseTime(task.schedule.time);
      const slot = setLocalTime(dayDate, h, m).getTime();
      if (within(slot)) slots.add(slot);
      break;
    }
    case "every_n_days": {
      if (task.nextFireAt != null && within(task.nextFireAt)) {
        slots.add(task.nextFireAt);
      }
      if (task.lastFireAt != null && within(task.lastFireAt)) {
        slots.add(task.lastFireAt);
      }
      break;
    }
    case "interval": {
      const { intervalMinutes, activeFrom, activeTo } = task.schedule;
      const stepMs = intervalMinutes * 60_000;
      const from = parseTime(activeFrom);
      const to = parseTime(activeTo);
      const wraps = from.h * 60 + from.m > to.h * 60 + to.m;

      // Today-starting window
      const ws = setLocalTime(dayDate, from.h, from.m);
      const weDate = new Date(dayDate);
      if (wraps) weDate.setDate(weDate.getDate() + 1);
      const we = setLocalTime(weDate, to.h, to.m);

      for (let c = ws.getTime(); c <= we.getTime(); c += stepMs) {
        if (within(c)) slots.add(c);
      }

      // Previous-day window can spill into today's early hours
      if (wraps) {
        const prev = new Date(dayDate);
        prev.setDate(prev.getDate() - 1);
        const wsP = setLocalTime(prev, from.h, from.m);
        const weP = setLocalTime(dayDate, to.h, to.m);
        for (let c = wsP.getTime(); c <= weP.getTime(); c += stepMs) {
          if (within(c)) slots.add(c);
        }
      }
      break;
    }
  }

  return [...slots].sort((a, b) => a - b);
}
