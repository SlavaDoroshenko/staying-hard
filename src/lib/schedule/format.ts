import type { Schedule } from "@/types/task";

export function formatSchedule(schedule: Schedule): string {
  switch (schedule.type) {
    case "fixed_times":
      return schedule.times.join(", ");
    case "interval":
      return `каждые ${schedule.intervalMinutes} мин · ${schedule.activeFrom}–${schedule.activeTo}`;
    case "daily":
      return `ежедневно в ${schedule.time}`;
    case "every_n_days":
      return schedule.n === 1
        ? `ежедневно в ${schedule.time}`
        : `каждые ${schedule.n} дней в ${schedule.time}`;
  }
}

export function formatTimeOfDay(ms: number | null | undefined): string {
  if (ms == null) return "—";
  const d = new Date(ms);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}
