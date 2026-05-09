import type { Schedule } from "@/types/task";

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;

function parseHHMM(s: string): { h: number; m: number } {
  const [h, m] = s.split(":").map(Number);
  return { h: h ?? 0, m: m ?? 0 };
}

function setLocalTime(d: Date, h: number, m: number): Date {
  const out = new Date(d);
  out.setHours(h, m, 0, 0);
  return out;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/**
 * Returns true if `now` falls inside the active window [from, to] in wall-clock
 * minutes-of-day. Handles windows that wrap across midnight (e.g. 12:00→03:00).
 */
function isInsideWindow(now: Date, from: string, to: string): boolean {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const fromM = parseHHMM(from).h * 60 + parseHHMM(from).m;
  const toM = parseHHMM(to).h * 60 + parseHHMM(to).m;
  if (fromM <= toM) return nowMinutes >= fromM && nowMinutes <= toM;
  return nowMinutes >= fromM || nowMinutes <= toM;
}

function nextWindowStart(now: Date, from: string): Date {
  const { h, m } = parseHHMM(from);
  const todayStart = setLocalTime(now, h, m);
  if (todayStart.getTime() > now.getTime()) return todayStart;
  return addDays(todayStart, 1);
}

/**
 * Given a Schedule and the current Date, return the next firing time as
 * a unix-ms timestamp (local wall-clock interpretation).
 *
 * `lastFireAt` (optional) — if the schedule already fired, use this to advance
 * (mainly used for `interval` and `every_n_days`).
 */
export function computeNextFire(
  schedule: Schedule,
  now: Date = new Date(),
  lastFireAt: number | null = null,
): number {
  switch (schedule.type) {
    case "fixed_times": {
      const candidates = schedule.times.map((t) => {
        const { h, m } = parseHHMM(t);
        return setLocalTime(now, h, m);
      });
      const future = candidates
        .map((d) => (d.getTime() > now.getTime() ? d : addDays(d, 1)))
        .sort((a, b) => a.getTime() - b.getTime());
      return future[0]!.getTime();
    }

    case "daily": {
      const { h, m } = parseHHMM(schedule.time);
      const today = setLocalTime(now, h, m);
      return today.getTime() > now.getTime()
        ? today.getTime()
        : addDays(today, 1).getTime();
    }

    case "every_n_days": {
      const { h, m } = parseHHMM(schedule.time);
      if (lastFireAt == null) {
        const today = setLocalTime(now, h, m);
        return today.getTime() > now.getTime()
          ? today.getTime()
          : addDays(today, 1).getTime();
      }
      const last = new Date(lastFireAt);
      const next = setLocalTime(addDays(last, schedule.n), h, m);
      if (next.getTime() <= now.getTime()) {
        const daysBehind = Math.ceil(
          (now.getTime() - next.getTime()) / MS_PER_DAY,
        );
        return addDays(next, daysBehind).getTime();
      }
      return next.getTime();
    }

    case "interval": {
      const inWindow = isInsideWindow(now, schedule.activeFrom, schedule.activeTo);
      if (!inWindow) {
        return nextWindowStart(now, schedule.activeFrom).getTime();
      }
      const stepMs = schedule.intervalMinutes * MS_PER_MINUTE;

      let candidate: number;
      if (lastFireAt == null) {
        const { h, m } = parseHHMM(schedule.activeFrom);
        const windowStart = setLocalTime(now, h, m);
        candidate =
          windowStart.getTime() <= now.getTime()
            ? windowStart.getTime()
            : windowStart.getTime() - MS_PER_DAY;
      } else {
        candidate = lastFireAt;
      }

      // Advance step-by-step until strictly past `now`. Catches up across
      // missed slots (e.g. system was asleep, app was closed). Capped to
      // prevent runaway loops on absurd inputs.
      let guard = 0;
      while (candidate <= now.getTime() && guard < 10_000) {
        candidate += stepMs;
        guard++;
      }

      if (
        isInsideWindow(new Date(candidate), schedule.activeFrom, schedule.activeTo)
      ) {
        return candidate;
      }
      return nextWindowStart(now, schedule.activeFrom).getTime();
    }
  }
}
