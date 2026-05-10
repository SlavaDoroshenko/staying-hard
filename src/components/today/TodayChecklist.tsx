import { useEffect, useMemo, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { useTodayStore } from "@/stores/today";
import {
  CATEGORY_LABEL_RU,
  type RecurringTask,
  type TaskCategory,
  type TaskLog,
} from "@/types/task";
import { formatTimeOfDay } from "@/lib/schedule/format";
import { generateSlotsForDay } from "@/lib/schedule/today-slots";
import { todayRangeMs } from "@/lib/time/day";
import { resolveNotification, unresolveCompletion } from "@/lib/engine/actions";
import { cn } from "@/lib/cn";

const CATEGORY_ORDER: TaskCategory[] = ["food", "water", "hygiene", "cleaning"];

interface RowItem {
  task: RecurringTask;
  scheduledAt: number;
  log?: TaskLog;
}

function buildRows(
  tasks: RecurringTask[],
  logs: TaskLog[],
  now: Date,
): Record<TaskCategory, RowItem[]> {
  const result: Record<TaskCategory, RowItem[]> = {
    food: [],
    water: [],
    hygiene: [],
    cleaning: [],
  };

  const { from: dayStart, to: dayEnd } = todayRangeMs(now);

  // Index today's logs by (taskId → scheduledAt → log)
  const logsByTask = new Map<string, Map<number, TaskLog>>();
  for (const log of logs) {
    let m = logsByTask.get(log.taskId);
    if (!m) {
      m = new Map();
      logsByTask.set(log.taskId, m);
    }
    m.set(log.scheduledAt, log);
  }

  for (const t of tasks) {
    const planned = generateSlotsForDay(t, dayStart, dayEnd);
    const taskLogs = logsByTask.get(t.id) ?? new Map<number, TaskLog>();

    // Union: planned slots + any logged slot (including ones that aren't on
    // the canonical grid because the user moved/edited the schedule mid-day).
    const allSlots = new Set<number>(planned);
    for (const ts of taskLogs.keys()) allSlots.add(ts);

    // Fallback: brand-new task with no logs and no slot today (e.g.
    // every_n_days where today isn't a fire day) — show the next-fire row so
    // the user can still see/click it.
    if (allSlots.size === 0 && t.nextFireAt != null) {
      allSlots.add(t.nextFireAt);
    }

    for (const ts of [...allSlots].sort((a, b) => a - b)) {
      result[t.category].push({
        task: t,
        scheduledAt: ts,
        log: taskLogs.get(ts),
      });
    }
  }

  return result;
}

function useNow(onDayChange?: () => void): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let lastDay = new Date().getDate();
    const id = setInterval(() => {
      const next = new Date();
      const today = next.getDate();
      if (today !== lastDay) {
        lastDay = today;
        onDayChange?.();
      }
      setNow(next);
    }, 30_000);
    return () => clearInterval(id);
  }, [onDayChange]);
  return now;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

const RU_DOW = [
  "воскресенье",
  "понедельник",
  "вторник",
  "среда",
  "четверг",
  "пятница",
  "суббота",
];

const RU_MONTH = [
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

export function TodayChecklist() {
  const { tasks, logs, refresh } = useTodayStore();
  const now = useNow(refresh);

  useEffect(() => {
    refresh();
    const unlistenPromise = listen("scheduler/tick", () => {
      refresh();
    });
    return () => {
      unlistenPromise.then((fn) => fn()).catch(() => {});
    };
  }, [refresh]);

  const grouped = useMemo(() => buildRows(tasks, logs, now), [tasks, logs, now]);

  const total = Object.values(grouped).reduce((s, arr) => s + arr.length, 0);
  const done = Object.values(grouped).reduce(
    (s, arr) => s + arr.filter((r) => r.log?.status === "completed").length,
    0,
  );

  return (
    <div className="mx-auto max-w-[640px] px-12 py-16">
      <header className="mb-16">
        <div className="caption">сегодня</div>
        <h1 className="mt-3 font-display text-[60px] leading-[0.95] tracking-[-0.025em] text-foreground">
          {now.getDate()} {RU_MONTH[now.getMonth()]}
          <span className="mx-3 text-faint-foreground">·</span>
          <span className="font-display italic text-muted-foreground">
            {RU_DOW[now.getDay()]}
          </span>
        </h1>
        <div className="mt-4 flex items-baseline gap-4 font-mono text-[13px] tabular-nums text-muted-foreground">
          <span>
            {pad(now.getHours())}:{pad(now.getMinutes())}
          </span>
          <span aria-hidden className="h-px w-8 bg-border" />
          <span>
            {done}/{total} сделано
          </span>
        </div>
        {total > 0 && (
          <div
            aria-hidden
            className="relative mt-4 h-[3px] w-full overflow-hidden rounded-full bg-surface-2/60"
          >
            <div
              className="absolute inset-y-0 left-0 bg-accent transition-[width] duration-300 ease-out"
              style={{ width: `${Math.round((done / total) * 100)}%` }}
            />
          </div>
        )}
      </header>

      <div className="space-y-12">
        {CATEGORY_ORDER.map((cat) => {
          const items = grouped[cat];
          if (items.length === 0) return null;
          return (
            <section key={cat}>
              <div className="caption mb-4">{CATEGORY_LABEL_RU[cat]}</div>
              <ul>
                {items.map((item, i) => (
                  <TodayRow
                    key={`${item.task.id}-${item.scheduledAt}`}
                    item={item}
                    nowMs={now.getTime()}
                    isFirst={i === 0}
                    onComplete={() => refresh()}
                  />
                ))}
              </ul>
            </section>
          );
        })}
        {total === 0 && (
          <div className="font-display text-2xl italic text-muted-foreground">
            на сегодня ничего не запланировано.
          </div>
        )}
        {total > 0 && done === total && (
          <div className="mt-12 border-t border-border/40 pt-8">
            <p className="font-display text-[22px] italic text-foreground">
              всё на сегодня сделано.
            </p>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.16em] text-faint-foreground">
              отдыхай · {done} из {total}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function TodayRow({
  item,
  nowMs,
  isFirst,
  onComplete,
}: {
  item: RowItem;
  nowMs: number;
  isFirst: boolean;
  onComplete: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const status = item.log?.status;
  const completed = status === "completed";
  const skipped = status === "skipped";
  // A past slot with no log = the user wasn't around / engine wasn't running.
  // Treat as missed so the user sees the gap. 5-min buffer matches the
  // pending-sweep grace window so nothing flips between buckets.
  const isImplicitMissed =
    !item.log && item.scheduledAt < nowMs - 5 * 60_000;
  const missed = status === "missed" || isImplicitMissed;
  const isDue =
    !completed &&
    !missed &&
    item.scheduledAt <= nowMs &&
    status !== "skipped";

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      if (completed) {
        await unresolveCompletion({
          taskId: item.task.id,
          scheduledAt: item.scheduledAt,
        });
      } else {
        await resolveNotification({
          taskId: item.task.id,
          scheduledAt: item.scheduledAt,
          status: "completed",
        });
      }
      onComplete();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li
      className={cn(
        "group relative grid grid-cols-[88px_1fr_auto] items-baseline gap-6 border-t border-border/40 py-3 first:border-t-transparent",
        !isFirst && "first:border-t",
      )}
    >
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className="absolute inset-0 -mx-3 rounded-md bg-transparent transition-colors hover:bg-surface-2/40"
        aria-label={
          completed
            ? `отметить невыполненной: ${item.task.title}`
            : `выполнить ${item.task.title}`
        }
      />

      <div className="pointer-events-none relative flex items-center gap-2 font-mono text-[13px] tabular-nums">
        {isDue && <span aria-hidden className="dot-accent" />}
        <span
          className={cn(
            isDue ? "text-foreground" : "text-muted-foreground",
            completed && "text-faint-foreground",
          )}
        >
          {formatTimeOfDay(item.scheduledAt)}
        </span>
      </div>

      <div
        className={cn(
          "strikethrough-anim pointer-events-none relative font-body text-[15px] leading-snug",
          completed && "text-faint-foreground",
          missed && "text-muted-foreground",
        )}
        data-done={completed}
      >
        {item.task.title}
        {item.task.estimateMinutes ? (
          <span className="ml-3 font-mono text-[12px] text-faint-foreground">
            ~{item.task.estimateMinutes} мин
          </span>
        ) : null}
      </div>

      <div className="pointer-events-none relative font-mono text-[11px] uppercase tracking-[0.16em]">
        {completed ? (
          <span className="inline-flex items-center gap-1.5 text-accent/80 transition-colors group-hover:text-foreground">
            <span className="group-hover:hidden">сделано</span>
            <span className="hidden group-hover:inline">отменить</span>
            <span className="text-faint-foreground transition-colors group-hover:text-foreground">
              ×
            </span>
          </span>
        ) : skipped ? (
          <span className="text-muted-foreground">пропуск</span>
        ) : missed ? (
          <span className="text-destructive/80">пропущено</span>
        ) : (
          <span className="text-faint-foreground">—</span>
        )}
      </div>
    </li>
  );
}
