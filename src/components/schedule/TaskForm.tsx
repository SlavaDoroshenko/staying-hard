import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import {
  CATEGORY_LABEL_RU,
  type NotificationLevel,
  type RecurringTask,
  type Schedule,
  TASK_CATEGORIES,
  type TaskCategory,
} from "@/types/task";
import { ScheduleSchema } from "@/types/task";
import {
  deleteTask as dbDeleteTask,
  getTask,
  insertTask,
  updateTask as dbUpdateTask,
} from "@/lib/db/tasks";
import { computeNextFire } from "@/lib/schedule/next-fire";
import { cn } from "@/lib/cn";
import { ScheduleFields } from "./ScheduleFields";

interface Props {
  taskId: string | null;
  defaultCategory: TaskCategory;
  allowedCategories: readonly TaskCategory[];
  allowedScheduleTypes?: readonly Schedule["type"][];
  backTo: string;
  caption: string;
  newH1: string;
  titlePlaceholder: string;
}

interface FormState {
  title: string;
  category: TaskCategory;
  notificationLevel: NotificationLevel;
  active: boolean;
  estimateMinutes: string; // form-level string for empty support
  schedule: Schedule;
}

const DEFAULT_FORM = (cat: TaskCategory): FormState => ({
  title: "",
  category: cat,
  notificationLevel: "soft",
  active: true,
  estimateMinutes: "",
  schedule:
    cat === "cleaning"
      ? { type: "every_n_days", n: 3, time: "22:00" }
      : cat === "water"
        ? {
            type: "interval",
            intervalMinutes: 90,
            activeFrom: "12:00",
            activeTo: "03:00",
          }
        : cat === "hygiene"
          ? { type: "daily", time: "12:30" }
          : { type: "fixed_times", times: ["13:00", "17:00", "21:00", "01:00"] },
});

function formFromTask(task: RecurringTask): FormState {
  return {
    title: task.title,
    category: task.category,
    notificationLevel: task.notificationLevel,
    active: task.active,
    estimateMinutes: task.estimateMinutes ? String(task.estimateMinutes) : "",
    schedule: task.schedule,
  };
}

export function TaskForm({
  taskId,
  defaultCategory,
  allowedCategories,
  allowedScheduleTypes,
  backTo,
  caption,
  newH1,
  titlePlaceholder,
}: Props) {
  const navigate = useNavigate();
  const isNew = taskId === null;
  const [form, setForm] = useState<FormState>(() => DEFAULT_FORM(defaultCategory));
  const [loaded, setLoaded] = useState(isNew);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    getTask(taskId!)
      .then((task) => {
        if (cancelled) return;
        if (!task) {
          setError("задача не найдена.");
        } else {
          setForm(formFromTask(task));
        }
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) {
          setError("ошибка загрузки.");
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isNew, taskId]);

  const scheduleValid = useMemo(() => {
    return ScheduleSchema.safeParse(form.schedule).success;
  }, [form.schedule]);

  const canSubmit = form.title.trim().length > 0 && scheduleValid && loaded && !busy;

  async function save() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const trimmedTitle = form.title.trim();
      const estimate =
        form.estimateMinutes.trim() === ""
          ? null
          : Number(form.estimateMinutes);
      const next = computeNextFire(form.schedule);
      if (isNew) {
        await insertTask({
          id:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          category: form.category,
          title: trimmedTitle,
          schedule: form.schedule,
          notificationLevel: form.notificationLevel,
          active: form.active,
          estimateMinutes: estimate,
          nextFireAt: next,
        });
      } else {
        await dbUpdateTask(taskId!, {
          title: trimmedTitle,
          schedule: form.schedule,
          notificationLevel: form.notificationLevel,
          active: form.active,
          estimateMinutes: estimate,
          nextFireAt: next,
        });
      }
      navigate(backTo);
    } catch (err) {
      console.error(err);
      setError("не удалось сохранить.");
      setBusy(false);
    }
  }

  async function remove() {
    if (isNew) return;
    setBusy(true);
    try {
      await dbDeleteTask(taskId!);
      navigate(backTo);
    } catch {
      setError("не удалось удалить.");
      setBusy(false);
    }
  }

  if (!loaded) {
    return (
      <div className="mx-auto max-w-[640px] px-12 py-16 font-display italic text-muted-foreground">
        загрузка…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[640px] px-12 py-16">
      <button
        type="button"
        onClick={() => navigate(backTo)}
        className="mb-10 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        назад
      </button>

      <header className="mb-12">
        <div className="caption">{caption}</div>
        <h1 className="mt-3 font-display text-[40px] leading-[1.05] tracking-[-0.02em]">
          {isNew ? newH1 : (form.title.trim() || "без названия") + "."}
        </h1>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="space-y-12"
      >
        <Field caption="название">
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder={titlePlaceholder}
            className="w-full bg-transparent border-b border-border/60 pb-2 text-[18px] font-display text-foreground outline-none focus:border-accent"
          />
        </Field>

        {allowedCategories.length > 1 && (
          <Field caption="категория">
            <CategoryRow
              value={form.category}
              allowed={allowedCategories}
              onChange={(category) => setForm({ ...form, category })}
            />
          </Field>
        )}

        <ScheduleFields
          value={form.schedule}
          onChange={(schedule) => setForm({ ...form, schedule })}
          allowedTypes={allowedScheduleTypes}
        />

        <Field caption="уровень уведомления">
          <LevelRow
            value={form.notificationLevel}
            onChange={(notificationLevel) =>
              setForm({ ...form, notificationLevel })
            }
          />
        </Field>

        {form.category === "cleaning" && (
          <Field caption="оценка времени, мин">
            <input
              type="number"
              min={1}
              inputMode="numeric"
              value={form.estimateMinutes}
              onChange={(e) =>
                setForm({ ...form, estimateMinutes: e.target.value })
              }
              placeholder="10"
              className="w-24 bg-transparent border-b border-border/60 pb-2 font-mono text-[15px] tabular-nums text-foreground outline-none focus:border-accent"
            />
          </Field>
        )}

        <Field caption="активна">
          <ToggleRow
            value={form.active}
            onChange={(active) => setForm({ ...form, active })}
          />
        </Field>

        <div className="flex items-center gap-6 border-t border-border/40 pt-8">
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-md bg-accent px-5 py-3 font-mono text-[12px] uppercase tracking-[0.16em] text-accent-foreground hover:bg-accent/90 disabled:opacity-40"
          >
            {isNew ? "создать" : "сохранить"}
          </button>

          <button
            type="button"
            onClick={() => navigate(backTo)}
            disabled={busy}
            className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
          >
            отмена
          </button>

          {!isNew && (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="ml-auto inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-faint-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
              удалить
            </button>
          )}
        </div>

        {error && (
          <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-destructive">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}

function Field({
  caption,
  children,
}: {
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="caption">{caption}</div>
      {children}
    </div>
  );
}

function CategoryRow({
  value,
  allowed,
  onChange,
}: {
  value: TaskCategory;
  allowed: readonly TaskCategory[];
  onChange: (cat: TaskCategory) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {allowed.map((cat) => {
        const active = value === cat;
        return (
          <button
            key={cat}
            type="button"
            onClick={() => onChange(cat)}
            className={cn(
              "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-[13px] transition-colors",
              active
                ? "border-accent text-foreground"
                : "border-border/40 text-muted-foreground hover:border-border-strong hover:text-foreground",
            )}
          >
            {active && <span aria-hidden className="dot-accent" />}
            {CATEGORY_LABEL_RU[cat].toLowerCase()}
          </button>
        );
      })}
    </div>
  );
}

function LevelRow({
  value,
  onChange,
}: {
  value: NotificationLevel;
  onChange: (l: NotificationLevel) => void;
}) {
  const items: { id: NotificationLevel; label: string; hint: string }[] = [
    { id: "soft", label: "мягкое", hint: "можно закрыть крестиком" },
    { id: "hard", label: "жёсткое", hint: "только готово / пропускаю" },
  ];
  return (
    <div className="flex flex-col">
      {items.map((it) => {
        const active = value === it.id;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            className={cn(
              "flex items-baseline justify-between border-b border-border/40 py-3 text-left transition-colors",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="flex items-center gap-3">
              <span
                aria-hidden
                className={cn(
                  "h-1 w-1 rounded-full",
                  active
                    ? "bg-accent shadow-[0_0_10px_hsl(var(--accent)/0.55)]"
                    : "bg-transparent",
                )}
              />
              <span className="text-[15px]">{it.label}</span>
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-faint-foreground">
              {it.hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ToggleRow({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between border-b border-border/40 py-3"
    >
      <span className="text-[15px]">
        {value ? "да, включена" : "нет, на паузе"}
      </span>
      <span
        aria-hidden
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
          value ? "bg-accent" : "bg-border-strong",
        )}
      >
        <span
          className={cn(
            "block h-4 w-4 rounded-full bg-foreground shadow-sm transition-transform",
            value ? "translate-x-[1.125rem]" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}

export const _internal = { TASK_CATEGORIES };
