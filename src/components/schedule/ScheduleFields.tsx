import { Plus, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Schedule } from "@/types/task";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function isValidTime(s: string): boolean {
  return TIME_RE.test(s);
}

interface Props {
  value: Schedule;
  onChange: (s: Schedule) => void;
  allowedTypes?: readonly Schedule["type"][];
}

const TYPE_OPTIONS: { id: Schedule["type"]; label: string; hint: string }[] = [
  {
    id: "fixed_times",
    label: "конкретные времена",
    hint: "например 13:00, 17:00, 21:00",
  },
  { id: "interval", label: "интервалом", hint: "каждые N минут в окне" },
  { id: "daily", label: "ежедневно", hint: "одно время каждый день" },
  {
    id: "every_n_days",
    label: "каждые N дней",
    hint: "n=3 — каждые 3 дня в указанное время",
  },
];

export function ScheduleFields({ value, onChange, allowedTypes }: Props) {
  const visibleOptions = allowedTypes
    ? TYPE_OPTIONS.filter((o) => allowedTypes.includes(o.id))
    : TYPE_OPTIONS;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="caption">тип расписания</div>
        <div className="flex flex-col">
          {visibleOptions.map((opt) => {
            const active = value.type === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => switchType(opt.id, value, onChange)}
                className={cn(
                  "flex items-baseline justify-between border-b border-border/40 py-3 text-left transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className={cn(
                      "h-1 w-1 rounded-full transition-colors",
                      active
                        ? "bg-accent shadow-[0_0_10px_hsl(var(--accent)/0.55)]"
                        : "bg-transparent",
                    )}
                  />
                  <span className="text-[15px]">{opt.label}</span>
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-faint-foreground">
                  {opt.hint}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="caption">когда срабатывает</div>
        {value.type === "fixed_times" && (
          <FixedTimesEditor value={value.times} onChange={(times) => onChange({ ...value, times })} />
        )}
        {value.type === "interval" && (
          <IntervalEditor value={value} onChange={onChange} />
        )}
        {value.type === "daily" && (
          <DailyEditor value={value} onChange={onChange} />
        )}
        {value.type === "every_n_days" && (
          <EveryNDaysEditor value={value} onChange={onChange} />
        )}
      </div>
    </div>
  );
}

function switchType(
  next: Schedule["type"],
  current: Schedule,
  onChange: (s: Schedule) => void,
) {
  if (next === current.type) return;
  switch (next) {
    case "fixed_times":
      return onChange({ type: "fixed_times", times: ["13:00"] });
    case "interval":
      return onChange({
        type: "interval",
        intervalMinutes: 90,
        activeFrom: "12:00",
        activeTo: "03:00",
      });
    case "daily":
      return onChange({ type: "daily", time: "12:30" });
    case "every_n_days":
      return onChange({ type: "every_n_days", n: 3, time: "22:00" });
  }
}

function TimeInput({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel?: string;
}) {
  const valid = isValidTime(value);
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      className={cn(
        "w-[88px] bg-transparent font-mono text-[15px] tabular-nums text-foreground outline-none",
        "border-b border-border/60 pb-1 focus:border-accent",
        !valid && "border-destructive/60 text-destructive",
      )}
    />
  );
}

function NumberField({
  value,
  onChange,
  suffix,
  min = 1,
  max,
}: {
  value: number;
  onChange: (n: number) => void;
  suffix: string;
  min?: number;
  max?: number;
}) {
  return (
    <span className="inline-flex items-baseline gap-2">
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
        className="w-16 border-b border-border/60 bg-transparent pb-1 font-mono text-[15px] tabular-nums text-foreground outline-none focus:border-accent"
      />
      <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-faint-foreground">
        {suffix}
      </span>
    </span>
  );
}

function FixedTimesEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-3">
        {value.map((t, i) => (
          <div key={i} className="flex items-baseline gap-1">
            <TimeInput
              value={t}
              onChange={(next) => {
                const arr = [...value];
                arr[i] = next;
                onChange(arr);
              }}
              ariaLabel={`время #${i + 1}`}
            />
            {value.length > 1 && (
              <button
                type="button"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                className="text-faint-foreground hover:text-destructive"
                aria-label="удалить время"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...value, "12:00"])}
          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-3 w-3" />
          добавить
        </button>
      </div>
    </div>
  );
}

function IntervalEditor({
  value,
  onChange,
}: {
  value: Extract<Schedule, { type: "interval" }>;
  onChange: (s: Schedule) => void;
}) {
  return (
    <div className="space-y-3 font-body text-[15px]">
      <div className="flex flex-wrap items-baseline gap-3">
        <span>каждые</span>
        <NumberField
          value={value.intervalMinutes}
          onChange={(n) => onChange({ ...value, intervalMinutes: n })}
          suffix="мин"
          min={1}
        />
      </div>
      <div className="flex flex-wrap items-baseline gap-3">
        <span>в окне</span>
        <TimeInput
          value={value.activeFrom}
          onChange={(activeFrom) => onChange({ ...value, activeFrom })}
          ariaLabel="окно с"
        />
        <span className="font-mono text-faint-foreground">→</span>
        <TimeInput
          value={value.activeTo}
          onChange={(activeTo) => onChange({ ...value, activeTo })}
          ariaLabel="окно до"
        />
      </div>
      <p className="font-display text-[13px] italic text-faint-foreground">
        окно может пересекать полночь — например 12:00 → 03:00.
      </p>
    </div>
  );
}

function DailyEditor({
  value,
  onChange,
}: {
  value: Extract<Schedule, { type: "daily" }>;
  onChange: (s: Schedule) => void;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-3 font-body text-[15px]">
      <span>каждый день в</span>
      <TimeInput
        value={value.time}
        onChange={(time) => onChange({ ...value, time })}
        ariaLabel="время"
      />
    </div>
  );
}

function EveryNDaysEditor({
  value,
  onChange,
}: {
  value: Extract<Schedule, { type: "every_n_days" }>;
  onChange: (s: Schedule) => void;
}) {
  return (
    <div className="space-y-3 font-body text-[15px]">
      <div className="flex flex-wrap items-baseline gap-3">
        <span>каждые</span>
        <NumberField
          value={value.n}
          onChange={(n) => onChange({ ...value, n })}
          suffix="дн"
          min={1}
        />
      </div>
      <div className="flex flex-wrap items-baseline gap-3">
        <span>в</span>
        <TimeInput
          value={value.time}
          onChange={(time) => onChange({ ...value, time })}
          ariaLabel="время"
        />
      </div>
    </div>
  );
}

export { isValidTime };
