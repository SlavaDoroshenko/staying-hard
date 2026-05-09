import { getCurrentWindow } from "@tauri-apps/api/window";
import { seedDefaultsIfEmpty } from "@/lib/db/seed";
import { recomputeAllNextFire, startEngine } from "./engine";

let initStarted = false;

/**
 * Boot DB, seed defaults, recompute next-fire, and start the scheduler engine.
 * Idempotent. Only runs once per main-window lifecycle.
 */
export async function bootApp(): Promise<void> {
  if (initStarted) return;
  initStarted = true;

  const win = getCurrentWindow();
  if (win.label !== "main") return;

  await seedDefaultsIfEmpty();
  await recomputeAllNextFire();
  await startEngine();
}
