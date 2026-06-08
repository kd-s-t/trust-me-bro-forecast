const DEFAULT_MS = 15_000;

/** Client-safe poll interval when auto sync is on (default 15s). */
export function binanceTickIntervalMs(): number {
  const raw = process.env.NEXT_PUBLIC_BINANCE_TICK_INTERVAL_MS?.trim();
  if (raw === undefined || raw === "") {
    return DEFAULT_MS;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 5_000) {
    return DEFAULT_MS;
  }
  return Math.min(n, 300_000);
}

/** Default on (every N ms). Set NEXT_PUBLIC_BINANCE_TICK_AUTO=false to disable. */
export function binanceTickAutoEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_BINANCE_TICK_AUTO?.trim().toLowerCase();
  if (raw === "false" || raw === "0" || raw === "off") {
    return false;
  }
  return true;
}
