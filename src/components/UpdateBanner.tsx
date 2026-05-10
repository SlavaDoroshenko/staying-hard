import { useState } from "react";
import { useUpdaterStore } from "@/stores/updater";
import { applyUpdate } from "@/lib/engine/updater";

/**
 * Slim banner shown at the top of the shell when a new release is available.
 * Single primary action ("обновить и перезапустить") + dismiss-for-session.
 */
export function UpdateBanner() {
  const { available, dismissed, dismiss } = useUpdaterStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!available || dismissed) return null;

  async function install() {
    if (!available || busy) return;
    setError(null);
    setBusy(true);
    try {
      await applyUpdate(available);
      // App restarts; this line shouldn't be reached.
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <div className="border-b border-border/40 bg-surface-2/40 px-12 py-3">
      <div className="mx-auto flex max-w-[640px] items-center justify-between gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3">
            <span className="caption">обновление</span>
            <span className="text-[14px] text-foreground">
              доступна v{available.version}.
            </span>
          </div>
          {error && (
            <div className="mt-1 max-w-[480px] truncate font-mono text-[11px] text-destructive">
              {error}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-baseline gap-4 font-mono text-[11px] uppercase tracking-[0.16em]">
          <button
            type="button"
            onClick={install}
            disabled={busy}
            className="text-accent hover:text-foreground disabled:opacity-50"
          >
            {busy ? "ставится…" : "обновить и перезапустить"}
          </button>
          <button
            type="button"
            onClick={dismiss}
            disabled={busy}
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            позже
          </button>
        </div>
      </div>
    </div>
  );
}
