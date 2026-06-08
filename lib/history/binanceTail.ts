import type { PricePoint } from "@/lib/history";

function utcDayFromTimeMs(timeMs: number): string {
  return new Date(timeMs).toISOString().slice(0, 10);
}

function todayUtcDay(): string {
  return utcDayFromTimeMs(Date.now());
}

/** Daily Binance points to upsert: from last DB day through today (ticker for today). */
export function binanceTailPoints(
  lastHistoryTimeMs: number | null,
  klines: PricePoint[],
  livePrice: number | null,
): PricePoint[] {
  const byDay = new Map<string, PricePoint>();
  const lastDay =
    lastHistoryTimeMs !== null
      ? utcDayFromTimeMs(lastHistoryTimeMs)
      : null;

  for (let i = 0; i < klines.length; i++) {
    const p = klines[i]!;
    const day = utcDayFromTimeMs(p.timeMs);
    if (lastDay === null || day >= lastDay) {
      byDay.set(day, p);
    }
  }

  const today = todayUtcDay();
  if (livePrice !== null && Number.isFinite(livePrice) && livePrice > 0) {
    const existing = byDay.get(today);
    const timeMs =
      existing?.timeMs ??
      klines.find((p) => utcDayFromTimeMs(p.timeMs) === today)?.timeMs ??
      Date.UTC(
        Number(today.slice(0, 4)),
        Number(today.slice(5, 7)) - 1,
        Number(today.slice(8, 10)),
      );
    byDay.set(today, {
      timeMs,
      price: livePrice,
      amount: existing?.amount ?? 1,
    });
  }

  const out = [...byDay.values()];
  out.sort((a, b) => a.timeMs - b.timeMs);
  return out;
}

/** Replace the stale DB tail with Binance daily closes; refresh today with the live ticker. */
export function mergeLiveMarketIntoHistory(
  history: PricePoint[],
  klines: PricePoint[],
  livePrice: number | null,
): PricePoint[] {
  const lastMs =
    history.length > 0 ? history[history.length - 1]!.timeMs : null;
  const tail = binanceTailPoints(lastMs, klines, livePrice);
  if (tail.length === 0) {
    return history;
  }
  if (history.length === 0) {
    return tail;
  }
  const lastDay = utcDayFromTimeMs(lastMs!);
  const keep = history.filter((p) => utcDayFromTimeMs(p.timeMs) < lastDay);
  return [...keep, ...tail];
}
