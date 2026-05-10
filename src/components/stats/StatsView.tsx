import { useEffect, useMemo, useState } from "react";
import {
  getDaySummary,
  getMonthSummary,
  getStreakWithStart,
  getTopMissed,
  getWeekSummary,
  type DaySummary,
  type TopMissed,
} from "@/lib/stats/summary";
import { CATEGORY_LABEL_RU } from "@/types/task";
import { cn } from "@/lib/cn";

const RU_DOW_SHORT = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
const RU_DOW_GRID = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

const RU_MONTH_GENITIVE = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

function formatDate(d: Date): string {
  return `${d.getDate()} ${RU_MONTH_GENITIVE[d.getMonth()]}`;
}

export function StatsView() {
  const [today, setToday] = useState<DaySummary | null>(null);
  const [week, setWeek] = useState<DaySummary[] | null>(null);
  const [month, setMonth] = useState<DaySummary[] | null>(null);
  const [streak, setStreak] = useState<{
    days: number;
    since: Date | null;
  } | null>(null);
  const [missed, setMissed] = useState<TopMissed[] | null>(null);

  useEffect(() => {
    const now = new Date();
    Promise.all([
      getDaySummary(now),
      getWeekSummary(now),
      getMonthSummary(now),
      getStreakWithStart(now),
      getTopMissed(14, 5),
    ])
      .then(([t, w, m, s, miss]) => {
        setToday(t);
        setWeek(w);
        setMonth(m);
        setStreak(s);
        setMissed(miss);
      })
      .catch((err) => console.error(err));
  }, []);

  const loading = !today || !week || !month || !streak || !missed;

  return (
    <div className="mx-auto max-w-[640px] px-12 py-16">
      <header className="mb-12">
        <div className="caption">статистика</div>
        <h1 className="mt-3 font-display text-[44px] leading-[1.05] tracking-[-0.02em]">
          как живёшь.
        </h1>
      </header>

      {loading ? (
        <p className="font-display italic text-muted-foreground">собираю…</p>
      ) : (
        <div className="space-y-16">
          <TodaySection today={today} />
          <WeekSection week={week} />
          <MonthSection month={month} />
          <StreakSection streak={streak} />
          <MissedSection missed={missed} />
        </div>
      )}
    </div>
  );
}

function TodaySection({ today }: { today: DaySummary }) {
  return (
    <section>
      <div className="caption mb-4">сегодня</div>
      <div className="flex items-baseline gap-4">
        <span className="font-display text-[88px] leading-none tracking-[-0.03em] text-foreground">
          {today.completed}
          <span className="text-faint-foreground">/{today.total || "—"}</span>
        </span>
        <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
          задач сделано
        </span>
      </div>
      {today.total > 0 && (
        <div className="mt-3 font-mono text-[12px] tabular-nums text-faint-foreground">
          пропущено осознанно — {today.skipped} · автоматически —{" "}
          {today.missed}
        </div>
      )}
    </section>
  );
}

function WeekSection({ week }: { week: DaySummary[] }) {
  const maxRatio = Math.max(0.001, ...week.map((d) => d.ratio));
  return (
    <section>
      <div className="caption mb-6">неделя</div>
      <div className="grid grid-cols-7 gap-3">
        {week.map((d, i) => {
          const heightPct =
            d.total === 0 ? 0 : Math.max(8, (d.ratio / maxRatio) * 100);
          const isToday = i === week.length - 1;
          return (
            <div key={i} className="flex flex-col items-stretch gap-2">
              <div className="relative h-24 w-full overflow-hidden rounded-sm border border-border/40">
                <div
                  className={cn(
                    "absolute inset-x-0 bottom-0 transition-[height]",
                    isToday ? "bg-accent/80" : "bg-muted-foreground/40",
                  )}
                  style={{ height: `${heightPct}%` }}
                />
                {d.total === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] text-faint-foreground">
                    —
                  </div>
                )}
              </div>
              <div className="text-center">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint-foreground">
                  {RU_DOW_SHORT[d.date.getDay()]}
                </div>
                <div className="font-mono text-[11px] tabular-nums text-muted-foreground">
                  {d.total === 0 ? "—" : `${d.completed}/${d.total}`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MonthSection({ month }: { month: DaySummary[] }) {
  const todayMs = useMemo(() => new Date().setHours(23, 59, 59, 999), []);
  const rows = useMemo(() => {
    const out: DaySummary[][] = [];
    for (let i = 0; i < month.length; i += 7) {
      out.push(month.slice(i, i + 7));
    }
    return out;
  }, [month]);

  function cellShade(d: DaySummary, ms: number): string {
    if (ms > todayMs) return "bg-transparent border border-border/30"; // future
    if (d.total === 0) return "bg-surface-2/40 border border-border/30";
    const r = d.ratio;
    if (r >= 0.75) return "bg-accent";
    if (r >= 0.5) return "bg-accent/65";
    if (r >= 0.25) return "bg-accent/40";
    if (r > 0) return "bg-accent/20";
    return "bg-destructive/30 border border-destructive/40";
  }

  return (
    <section>
      <div className="caption mb-3">пять недель</div>
      <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.16em] text-faint-foreground">
        ярче ячейка — больше сделано в тот день
      </p>
      <div className="space-y-1.5">
        <div className="grid grid-cols-7 gap-1.5">
          {RU_DOW_GRID.map((d) => (
            <div
              key={d}
              className="text-center font-mono text-[10px] uppercase tracking-[0.16em] text-faint-foreground"
            >
              {d}
            </div>
          ))}
        </div>
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-7 gap-1.5">
            {row.map((d) => {
              const ms = d.date.getTime();
              const isToday =
                d.date.toDateString() === new Date().toDateString();
              return (
                <div
                  key={ms}
                  className={cn(
                    "aspect-square rounded-sm transition-colors",
                    cellShade(d, ms),
                    isToday && "ring-1 ring-accent ring-offset-1 ring-offset-background",
                  )}
                  title={`${d.date.getDate()}.${d.date.getMonth() + 1} · ${d.completed}/${d.total}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

function StreakSection({
  streak,
}: {
  streak: { days: number; since: Date | null };
}) {
  return (
    <section>
      <div className="caption mb-3">streak</div>
      <div className="flex items-baseline gap-3">
        <span className="font-display text-[72px] leading-none tracking-[-0.03em] text-foreground">
          {streak.days}
        </span>
        <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
          {streak.days === 1 ? "день" : "дней"} подряд
        </span>
      </div>
      {streak.since && streak.days > 0 ? (
        <p className="mt-3 font-display text-[14px] italic text-muted-foreground">
          с {formatDate(streak.since)}. сорвётся если не сделаешь сегодня хотя
          бы одно.
        </p>
      ) : (
        <p className="mt-3 max-w-[320px] font-display text-[14px] italic text-faint-foreground">
          пока ни одного дня. сделай хотя бы одну задачу сегодня — счёт пошёл.
        </p>
      )}
    </section>
  );
}

function MissedSection({ missed }: { missed: TopMissed[] }) {
  if (missed.length === 0) {
    return (
      <section>
        <div className="caption mb-3">14 дней без</div>
        <p className="font-display italic text-muted-foreground">
          ничего не пропускалось.
        </p>
      </section>
    );
  }
  return (
    <section>
      <div className="caption mb-3">слабые места · 14 дней</div>
      <ol className="space-y-2">
        {missed.map((m, i) => (
          <li
            key={m.taskId}
            className="flex items-baseline justify-between gap-4 border-b border-border/40 pb-2"
          >
            <div className="flex min-w-0 items-baseline gap-3">
              <span className="font-mono text-[11px] tabular-nums text-faint-foreground">
                {i + 1}
              </span>
              <div className="min-w-0">
                <div className="truncate text-[14px]">{m.title}</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint-foreground">
                  {CATEGORY_LABEL_RU[m.category].toLowerCase()}
                </div>
              </div>
            </div>
            <span className="font-mono text-[14px] tabular-nums text-muted-foreground">
              ×{m.count}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
