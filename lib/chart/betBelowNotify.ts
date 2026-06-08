/** Remind while underwater at most once per interval (chart open or reload). */
export const BET_BELOW_NOTIFY_INTERVAL_MS = 6 * 60 * 60 * 1000;

const STORAGE_KEY = "bet-below-last-notify-at";

export function getLastBetBelowNotifyAt(): number | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (raw === null) {
    return null;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function recordBetBelowNotify(atMs: number = Date.now()): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.setItem(STORAGE_KEY, String(atMs));
}

export function clearLastBetBelowNotifyAt(): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.removeItem(STORAGE_KEY);
}

export function shouldNotifyBetBelow(nowMs: number = Date.now()): boolean {
  const last = getLastBetBelowNotifyAt();
  if (last === null) {
    return true;
  }
  return nowMs - last >= BET_BELOW_NOTIFY_INTERVAL_MS;
}
