import { getBoolSetting } from "@/lib/db/settings";

const SOUND_KEY = "sound_enabled";

/**
 * Soft two-tone beep. Two short sine bursts ~150ms apart, low volume,
 * exponential decay — closer to a phone notification than a system error.
 * Late-night-friendly: no high overtones.
 */
export async function playNotificationSound(
  variant: "soft" | "hard" | "emergency" = "soft",
  options: { force?: boolean } = {},
): Promise<void> {
  if (!options.force) {
    try {
      const enabled = await getBoolSetting(SOUND_KEY, true);
      if (!enabled) return;
    } catch {
      /* setting missing — default to enabled */
    }
  }

  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();

    const tone = (start: number, freq: number, dur: number, gain: number) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      env.gain.setValueAtTime(0, ctx.currentTime + start);
      env.gain.linearRampToValueAtTime(gain, ctx.currentTime + start + 0.02);
      env.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + start + dur,
      );
      osc.connect(env);
      env.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur);
    };

    if (variant === "emergency") {
      tone(0, 520, 0.3, 0.18);
      tone(0.18, 440, 0.3, 0.18);
      tone(0.36, 520, 0.4, 0.18);
    } else if (variant === "hard") {
      tone(0, 440, 0.25, 0.16);
      tone(0.18, 540, 0.35, 0.16);
    } else {
      tone(0, 540, 0.18, 0.12);
      tone(0.13, 660, 0.25, 0.1);
    }

    setTimeout(() => ctx.close(), 800);
  } catch (err) {
    console.warn("notification sound failed", err);
  }
}
