import { useEffect, useState } from "react";
import {
  getDaySummary,
  getStreak,
  getTopMissed,
  getWeekSummary,
  type DaySummary,
  type TopMissed,
} from "@/lib/stats/summary";
import { CATEGORY_LABEL_RU } from "@/types/task";
import { cn } from "@/lib/cn";

const RU_DOW_SHORT = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

export function StatsView() {
  const [today, setToday] = useState<DaySummary | null>(null);
  const [week, setWeek] = useState<DaySummary[] | null>(null);
  const [streak, setStreak] = useState<number | null>(null);
  const [missed, setMissed] = useState<TopMissed[] | null>(null);

  useEffect(() => {
    const now = new Date();
    Promise.all([
      getDaySummary(now),
      getWeekSummary(now),
      getStreak(now),
      getTopMissed(14, 5),
    ])
      .then(([t, w, s, m]) => {
        setToday(t);
        setWeek(w);
        setStreak(s);
        setMissed(m);
      })
      .catch((err) => console.error(err));
  }, []);

  const loading = !today || !week || streak === null || !missed;

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
                пропущено осознанно — {today.skipped} · автоматически — {today.missed}
              </div>
            )}
          </section>

          <section>
            <div className="caption mb-6">неделя</div>
            <WeekStrip days={week} />
          </section>

          <section className="grid grid-cols-2 gap-12">
            <div>
              <div className="caption mb-3">streak</div>
              <div className="flex items-baseline gap-3">
                <span className="font-display text-[64px] leading-none tracking-[-0.03em] text-foreground">
                  {streak}
                </span>
                <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                  {streak === 1 ? "день" : "дней"} подряд
                </span>
              </div>
              <p className="mt-3 max-w-[260px] font-display text-[13px] italic text-faint-foreground">
                дней подряд, где хотя бы что-то было сделано.
              </p>
            </div>

            <div>
              <div className="caption mb-3">14 дней без</div>
              {missed.length === 0 ? (
                <p className="font-display italic text-muted-foreground">
                  ничего не пропускалось.
                </p>
              ) : (
                <ul className="space-y-2">
                  {missed.map((m) => (
                    <li
                      key={m.taskId}
                      className="flex items-baseline justify-between gap-4 border-b border-border/40 pb-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-[14px]">{m.title}</div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint-foreground">
                          {CATEGORY_LABEL_RU[m.category].toLowerCase()}
                        </div>
                      </div>
                      <span className="font-mono text-[14px] tabular-nums text-muted-foreground">
                        ×{m.count}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function WeekStrip({ days }: { days: DaySummary[] }) {
  const maxRatio = Math.max(0.001, ...days.map((d) => d.ratio));
  return (
    <div className="grid grid-cols-7 gap-3">
      {days.map((d, i) => {
        const heightPct = d.total === 0 ? 0 : Math.max(8, (d.ratio / maxRatio) * 100);
        const isToday = i === days.length - 1;
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
                {d.total === 0
                  ? "—"
                  : `${d.completed}/${d.total}`}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
