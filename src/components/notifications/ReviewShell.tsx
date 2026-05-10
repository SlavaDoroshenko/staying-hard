import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface ReviewParams {
  food: { done: number; total: number };
  hygiene: { done: number; total: number };
  cleaning: { done: number; total: number };
  topMissed: { title: string; dayName: string } | null;
}

function readParams(): ReviewParams | null {
  const sp = new URLSearchParams(window.location.search);
  const raw = sp.get("data");
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw));
  } catch {
    return null;
  }
}

export function ReviewShell() {
  const [params] = useState(readParams);

  if (!params) {
    return (
      <div className="flex h-screen items-center justify-center bg-background font-mono text-xs text-muted-foreground">
        review params missing
      </div>
    );
  }

  async function dismiss() {
    try {
      await getCurrentWindow().close();
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === "Escape") {
        e.preventDefault();
        void dismiss();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background p-12">
      <div className="relative w-full max-w-[560px]">
        <div className="caption">воскресный обзор</div>

        <h1 className="mt-4 font-display text-[56px] leading-[0.95] tracking-[-0.025em] text-foreground">
          неделя.
        </h1>

        <dl className="mt-10 space-y-3">
          <Row label="ел вовремя" value={params.food} />
          <Row label="душ" value={params.hygiene} />
          <Row label="уборка" value={params.cleaning} />
        </dl>

        {params.topMissed && (
          <p className="mt-10 max-w-[480px] font-display text-[16px] italic leading-snug text-muted-foreground">
            чаще всего пропускал: {params.topMissed.title}{" "}
            {params.topMissed.dayName}.
          </p>
        )}

        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-faint-foreground">
          без осуждения · только факты
        </p>

        <div className="mt-12">
          <button
            type="button"
            onClick={dismiss}
            className="rounded-md bg-accent px-6 py-3 font-mono text-[12px] uppercase tracking-[0.16em] text-accent-foreground hover:bg-accent/90"
          >
            понял
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: { done: number; total: number };
}) {
  return (
    <div className="flex items-baseline justify-between border-b border-border/40 pb-2">
      <dt className="text-[15px] text-muted-foreground">{label}</dt>
      <dd className="font-mono text-[18px] tabular-nums text-foreground">
        {value.done}
        <span className="text-faint-foreground">/{value.total}</span>
      </dd>
    </div>
  );
}
