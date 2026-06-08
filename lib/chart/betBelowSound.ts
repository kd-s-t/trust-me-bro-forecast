let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }
  const Ctor =
    window.AudioContext ??
    (
      window as Window & {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext;
  if (Ctor === undefined) {
    return null;
  }
  if (sharedCtx === null) {
    sharedCtx = new Ctor();
  }
  return sharedCtx;
}

function tone(
  ctx: AudioContext,
  freqHz: number,
  startSec: number,
  durationSec: number,
  peakGain = 0.12,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freqHz;
  osc.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0, startSec);
  gain.gain.linearRampToValueAtTime(peakGain, startSec + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startSec + durationSec);
  osc.start(startSec);
  osc.stop(startSec + durationSec + 0.02);
}

/** Short two-tone chime when price is below your buy. */
export function playBetBelowAlertSound(): void {
  const ctx = getAudioContext();
  if (ctx === null) {
    return;
  }

  void (async () => {
    try {
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      const t = ctx.currentTime;
      tone(ctx, 880, t, 0.14);
      tone(ctx, 587, t + 0.16, 0.22);
    } catch {
      /* autoplay blocked or unsupported */
    }
  })();
}

/** Resume audio after a user gesture (no sound). Helps 6h alerts play later. */
export function unlockBetBelowAlertSound(): void {
  const ctx = getAudioContext();
  if (ctx === null) {
    return;
  }
  void ctx.resume().catch(() => {
    /* autoplay policy */
  });
}
