import { invoke } from "@tauri-apps/api/core";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { useUpdaterStore } from "@/stores/updater";

const INITIAL_DELAY_MS = 10_000; // poll 10s after boot
const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000;

let started = false;

/** Start the update poller. Idempotent. */
export function startUpdater(): void {
  if (started) return;
  started = true;

  setTimeout(() => {
    void runCheck();
    setInterval(runCheck, DAILY_INTERVAL_MS);
  }, INITIAL_DELAY_MS);
}

async function runCheck(): Promise<void> {
  try {
    const update = await check();
    if (update) {
      console.log("[updater] available:", update.version);
      useUpdaterStore.getState().setAvailable(update);
    }
  } catch (err) {
    // Common in dev (no real endpoint), or when offline. Silent.
    console.warn("[updater] check failed:", err);
  }
}

export async function applyUpdate(update: Update): Promise<void> {
  await update.downloadAndInstall();
  await invoke("restart_app");
}
