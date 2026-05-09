import { useEffect, useMemo, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { X } from "lucide-react";
import { resolveNotification } from "@/lib/engine/actions";
import { playNotificationSound } from "@/lib/sound";
import {
  CATEGORY_LABEL_RU,
  type NotificationLevel,
  type TaskCategory,
} from "@/types/task";
import { cn } from "@/lib/cn";

interface NotifParams {
  taskId: string;
  scheduledAt: number;
  level: NotificationLevel;
  title: string;
  category: TaskCategory;
}

function readParams(): NotifParams | null {
  const sp = new URLSearchParams(window.location.search);
  const taskId = sp.get("task_id");
  const scheduledAt = Number(sp.get("scheduled_at"));
  const level = sp.get("level") as NotificationLevel | null;
  const title = sp.get("title");
  if (
    !taskId ||
    !scheduledAt ||
    !title ||
    (level !== "soft" && level !== "hard")
  ) {
    return null;
  }
  return {
    taskId,
    scheduledAt,
    level,
    title,
    category: (sp.get("category") as TaskCategory) ?? "food",
  };
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

const QUICK_FOOD = [
  { id: "delivery", label: "заказал доставку" },
  { id: "fast", label: "съел что-то быстрое" },
] as const;

export function NotificationShell() {
  const params = useMemo(readParams, []);
  const [confirmingSkip, setConfirmingSkip] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!params) return;
    playNotificationSound(params.level);
  }, [params]);

  if (!params) {
    return (
      <div className="flex h-screen items-center justify-center bg-background font-mono text-xs text-muted-foreground">
        notification params missing — search: {window.location.search || "(empty)"}
      </div>
    );
  }

  const isHard = params.level === "hard";
  const isFood = params.category === "food";
  const scheduled = new Date(params.scheduledAt);
  const time = `${pad(scheduled.getHours())}:${pad(scheduled.getMinutes())}`;

  async function complete(quickAction?: string) {
    if (busy) return;
    setBusy(true);
    try {
      await resolveNotification({
        taskId: params!.taskId,
        scheduledAt: params!.scheduledAt,
        status: "completed",
        quickAction,
      });
    } catch (err) {
      console.error(err);
    } finally {
      // Always reset — if Tauri close() succeeded the window is already
      // tearing down; if it failed we need to let the user retry.
      setBusy(false);
    }
  }

  async function skip() {
    if (busy) return;
    setBusy(true);
    try {
      await resolveNotification({
        taskId: params!.taskId,
        scheduledAt: params!.scheduledAt,
        status: "skipped",
      });
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  async function dismiss() {
    try {
      await getCurrentWindow().close();
    } catch (err) {
      console.error("dismiss failed", err);
    }
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background p-10">
      {!isHard && (
        <button
          type="button"
          onClick={dismiss}
          aria-label="закрыть"
          className="absolute right-5 top-5 text-faint-foreground transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <div className="relative w-full max-w-[480px]">
        <span aria-hidden className="dot-accent absolute -left-3 top-2" />

        <div className="caption flex items-center gap-2">
          <span>{CATEGORY_LABEL_RU[params.category]}</span>
          <span className="text-faint-foreground">·</span>
          <span className="font-mono tabular-nums normal-case tracking-normal">
            {time}
          </span>
        </div>

        <h1 className="mt-4 font-display text-[42px] leading-[1.05] tracking-[-0.02em] text-foreground">
          {params.title.toLowerCase()}.
        </h1>

        {isFood && (
          <div className="mt-8 flex flex-col">
            {QUICK_FOOD.map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => complete(q.id)}
                disabled={busy}
                className="group flex items-baseline justify-between border-b border-border/40 py-3 text-left text-[15px] text-foreground hover:border-accent/60 hover:text-accent disabled:opacity-50"
              >
                <span>{q.label}</span>
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors group-hover:text-accent">
                  →
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-10 blur-swap" data-busy={busy}>
          {isHard ? (
            confirmingSkip ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={skip}
                  disabled={busy}
                  className="flex-1 rounded-md border border-destructive/40 bg-transparent px-4 py-3 font-mono text-[12px] uppercase tracking-[0.16em] text-destructive hover:bg-destructive/10"
                >
                  точно пропускаю
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingSkip(false)}
                  className="rounded-md px-3 py-3 text-[13px] text-muted-foreground hover:text-foreground"
                >
                  отмена
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-6">
                <button
                  type="button"
                  onClick={() => complete()}
                  disabled={busy}
                  className="flex-1 rounded-md bg-accent px-5 py-3 font-mono text-[12px] uppercase tracking-[0.16em] text-accent-foreground hover:bg-accent/90"
                >
                  сделал
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingSkip(true)}
                  className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
                >
                  пропускаю осознанно
                </button>
              </div>
            )
          ) : (
            <div className="flex items-center gap-6">
              {!isFood && (
                <button
                  type="button"
                  onClick={() => complete()}
                  disabled={busy}
                  className="flex-1 rounded-md bg-accent px-5 py-3 font-mono text-[12px] uppercase tracking-[0.16em] text-accent-foreground hover:bg-accent/90"
                >
                  готово
                </button>
              )}
              <button
                type="button"
                onClick={skip}
                disabled={busy}
                className={cn(
                  "font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground",
                  isFood && "ml-auto",
                )}
              >
                {isFood ? "не буду" : "пропускаю"}
              </button>
            </div>
          )}
        </div>

        {isHard && (
          <p className="mt-10 max-w-[420px] font-display text-[14px] italic leading-relaxed text-muted-foreground">
            это уведомление нельзя закрыть крестиком — оно про вещи, которые
            легко пропускаются на автомате.
          </p>
        )}
      </div>
    </div>
  );
}
