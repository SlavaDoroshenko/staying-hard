import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Pause, Play, Plus } from "lucide-react";
import {
  CATEGORY_LABEL_RU,
  type RecurringTask,
  type TaskCategory,
} from "@/types/task";
import { listAllTasks, updateTask } from "@/lib/db/tasks";
import { formatSchedule } from "@/lib/schedule/format";
import { cn } from "@/lib/cn";

interface Props {
  pageCaption: string;
  pageTitle: string;
  emptyText: string;
  categories: readonly TaskCategory[];
  basePath: "/schedule" | "/zones";
  groupByCategory: boolean;
}

export function TaskListView({
  pageCaption,
  pageTitle,
  emptyText,
  categories,
  basePath,
  groupByCategory,
}: Props) {
  const [tasks, setTasks] = useState<RecurringTask[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    listAllTasks()
      .then((all) => setTasks(all.filter((t) => categories.includes(t.category))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [categories]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const grouped = useMemo(() => {
    const result = new Map<TaskCategory, RecurringTask[]>();
    for (const cat of categories) result.set(cat, []);
    for (const t of tasks) result.get(t.category)?.push(t);
    return result;
  }, [tasks, categories]);

  return (
    <div className="mx-auto max-w-[640px] px-12 py-16">
      <header className="mb-12 flex items-end justify-between">
        <div>
          <div className="caption">{pageCaption}</div>
          <h1 className="mt-3 font-display text-[44px] leading-[1.05] tracking-[-0.02em]">
            {pageTitle}
          </h1>
        </div>
        <Link
          to={`${basePath}/new`}
          className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-3 w-3" />
          добавить
        </Link>
      </header>

      {loading ? (
        <p className="font-display italic text-muted-foreground">загрузка…</p>
      ) : tasks.length === 0 ? (
        <p className="font-display text-[18px] italic text-muted-foreground">
          {emptyText}
        </p>
      ) : groupByCategory ? (
        <div className="space-y-12">
          {[...grouped.entries()].map(([cat, items]) => {
            if (items.length === 0) return null;
            return (
              <section key={cat}>
                <div className="caption mb-4">{CATEGORY_LABEL_RU[cat]}</div>
                <ul>
                  {items.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      basePath={basePath}
                      onChanged={refresh}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <ul>
          {tasks.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              basePath={basePath}
              onChanged={refresh}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function TaskRow({
  task,
  basePath,
  onChanged,
}: {
  task: RecurringTask;
  basePath: string;
  onChanged: () => void;
}) {
  const [toggling, setToggling] = useState(false);

  async function togglePause() {
    if (toggling) return;
    setToggling(true);
    try {
      await updateTask(task.id, { active: !task.active });
      onChanged();
    } finally {
      setToggling(false);
    }
  }

  return (
    <li className="group relative flex items-stretch border-t border-border/40">
      <Link
        to={`${basePath}/${task.id}`}
        className={cn(
          "flex flex-1 items-baseline justify-between gap-6 py-3 pr-3 transition-colors",
          !task.active && "opacity-50",
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3">
            <span className="text-[15px] text-foreground transition-colors group-hover:text-accent">
              {task.title}
            </span>
            {task.notificationLevel === "hard" && (
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint-foreground">
                жёсткое
              </span>
            )}
            {!task.active && (
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint-foreground">
                на паузе
              </span>
            )}
          </div>
          <div className="mt-1 truncate font-mono text-[12px] tabular-nums text-muted-foreground">
            {formatSchedule(task.schedule)}
            {task.estimateMinutes ? ` · ~${task.estimateMinutes} мин` : ""}
          </div>
        </div>
        <span
          aria-hidden
          className="font-mono text-[12px] text-faint-foreground transition-colors group-hover:text-accent"
        >
          →
        </span>
      </Link>
      <button
        type="button"
        onClick={togglePause}
        disabled={toggling}
        aria-label={task.active ? "пауза" : "включить"}
        title={task.active ? "поставить на паузу" : "включить"}
        className={cn(
          "flex shrink-0 items-center justify-center px-3 transition-opacity hover:text-foreground",
          task.active
            ? "text-faint-foreground opacity-0 group-hover:opacity-100"
            : "text-muted-foreground opacity-100",
        )}
      >
        {task.active ? (
          <Pause className="h-3.5 w-3.5" />
        ) : (
          <Play className="h-3.5 w-3.5" />
        )}
      </button>
    </li>
  );
}
