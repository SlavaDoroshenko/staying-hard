import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { playNotificationSound } from "@/lib/sound";
import { CATEGORY_LABEL_RU, type TaskCategory } from "@/types/task";

interface EmergencyParams {
  category: Exclude<TaskCategory, "water">;
  daysWithout: number;
  message: string;
}

function readParams(): EmergencyParams | null {
  const sp = new URLSearchParams(window.location.search);
  const category = sp.get("category");
  const daysWithout = Number(sp.get("days"));
  const message = sp.get("message");
  if (
    !message ||
    !daysWithout ||
    (category !== "food" && category !== "hygiene" && category !== "cleaning")
  ) {
    return null;
  }
  return { category, daysWithout, message };
}

const COUNTDOWN_SECONDS = 5;

export function EmergencyShell() {
  const [params] = useState(readParams);
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    if (params) playNotificationSound("emergency");
  }, [params]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter" && secondsLeft <= 0) {
        e.preventDefault();
        void getCurrentWindow().close();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [secondsLeft]);

  if (!params) {
    return (
      <div className="flex h-screen items-center justify-center bg-background font-mono text-xs text-muted-foreground">
        emergency params missing
      </div>
    );
  }

  const canDismiss = secondsLeft <= 0;

  async function acknowledge() {
    if (!canDismiss) return;
    try {
      await getCurrentWindow().close();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background p-12">
      <div className="relative w-full max-w-[640px]">
        <div className="caption text-destructive/80">
          аварийный режим · {CATEGORY_LABEL_RU[params.category].toLowerCase()} ·{" "}
          {params.daysWithout} дн
        </div>

        <h1 className="mt-4 font-display text-[64px] leading-[0.95] tracking-[-0.025em] text-foreground">
          стоп.
        </h1>

        <p className="mt-8 max-w-[560px] font-display text-[22px] leading-snug text-foreground">
          {params.message}
        </p>

        <p className="mt-6 font-display text-[14px] italic text-muted-foreground">
          без осуждения. это просто факт, который ты, скорее всего, не замечал.
        </p>

        <div className="mt-12 flex items-center gap-6">
          <button
            type="button"
            onClick={acknowledge}
            disabled={!canDismiss}
            className="rounded-md border border-destructive/60 bg-transparent px-6 py-3 font-mono text-[12px] uppercase tracking-[0.16em] text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:border-faint-foreground disabled:text-faint-foreground"
          >
            {canDismiss ? "понял" : `подожди ${secondsLeft}…`}
          </button>
        </div>
      </div>
    </div>
  );
}
