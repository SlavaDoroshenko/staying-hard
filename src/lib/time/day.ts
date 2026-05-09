export function startOfDay(d: Date = new Date()): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

export function endOfDay(d: Date = new Date()): Date {
  const out = new Date(d);
  out.setHours(23, 59, 59, 999);
  return out;
}

export function todayRangeMs(now: Date = new Date()): { from: number; to: number } {
  return { from: startOfDay(now).getTime(), to: endOfDay(now).getTime() };
}
