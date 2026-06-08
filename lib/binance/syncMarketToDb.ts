import {
  fetchBinanceLiveMarket,
  fetchBinanceMinuteKlinesSince,
  fetchBinanceTickerPrice,
} from "@/lib/binance/market";
import {
  getLatestSpot,
  upsertHistoryPoints,
} from "@/lib/db/history";
import { bumpSyncStateMaxTime } from "@/lib/db/syncState";
import type { PricePoint } from "@/lib/history";
import { binanceTailPoints } from "@/lib/history/binanceTail";
import { maybeExecuteAutoTrade, type AutoTradeResult } from "@/lib/binance/autoTrade";
import { anyAutoTradeEnabled } from "@/lib/binance/featureFlags";

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

export type BinanceSyncResult = {
  upserted: number;
  price: number;
  timeMs: number;
  fromTimeMs: number | null;
  autoTrade: AutoTradeResult | null;
};

async function persistPoints(
  symbol: string,
  points: PricePoint[],
): Promise<number> {
  if (points.length === 0) {
    return 0;
  }
  const upserted = await upsertHistoryPoints(symbol, points);
  const maxMs = points.reduce(
    (m, p) => (p.timeMs > m ? p.timeMs : m),
    points[0]!.timeMs,
  );
  await bumpSyncStateMaxTime(symbol, maxMs);
  return upserted;
}

/** Daily klines: refresh stale tail when Binance data is far behind DB. */
export async function syncBinanceDailyTailToDb(
  symbol: string,
): Promise<{ upserted: number }> {
  const live = await fetchBinanceLiveMarket();
  let lastTimeMs: number | null = null;
  try {
    const latest = await getLatestSpot(symbol);
    lastTimeMs = latest.timeMs;
  } catch {
    lastTimeMs = null;
  }

  const points = binanceTailPoints(lastTimeMs, live.klines, live.price);
  const upserted = await persistPoints(symbol, points);
  return { upserted };
}

function dedupePoints(points: PricePoint[]): PricePoint[] {
  const byTime = new Map<number, PricePoint>();
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    byTime.set(p.timeMs, p);
  }
  return [...byTime.values()].sort((a, b) => a.timeMs - b.timeMs);
}

/**
 * From latest row in Postgres → now: fill 1m gaps if needed, then save live ticker.
 * Runs every 15s while the chart is open (and once on chart load).
 */
export async function syncBinanceIncrementalToDb(
  symbol: string,
): Promise<BinanceSyncResult> {
  let lastTimeMs: number | null = null;
  try {
    const latest = await getLatestSpot(symbol);
    lastTimeMs = latest.timeMs;
  } catch {
    const boot = await syncBinanceDailyTailToDb(symbol);
    const price = await fetchBinanceTickerPrice();
    const now = Date.now();
    const autoTrade = anyAutoTradeEnabled()
      ? await maybeExecuteAutoTrade(price)
      : null;
    return {
      upserted: boot.upserted,
      price,
      timeMs: now,
      fromTimeMs: null,
      autoTrade,
    };
  }

  const now = Date.now();
  const gap = now - lastTimeMs;
  const points: PricePoint[] = [];

  if (gap > DAY_MS) {
    await syncBinanceDailyTailToDb(symbol);
    try {
      const latest = await getLatestSpot(symbol);
      lastTimeMs = latest.timeMs;
    } catch {
      lastTimeMs = null;
    }
  }

  if (lastTimeMs !== null && now - lastTimeMs > MINUTE_MS) {
    const minutes = await fetchBinanceMinuteKlinesSince(lastTimeMs);
    for (let i = 0; i < minutes.length; i++) {
      points.push(minutes[i]!);
    }
  }

  const price = await fetchBinanceTickerPrice();
  points.push({ timeMs: now, price, amount: 1 });

  const merged = dedupePoints(points);
  const upserted = await persistPoints(symbol, merged);

  const autoTrade = anyAutoTradeEnabled()
    ? await maybeExecuteAutoTrade(price)
    : null;

  return {
    upserted,
    price,
    timeMs: now,
    fromTimeMs: lastTimeMs,
    autoTrade,
  };
}

/** @deprecated Use syncBinanceIncrementalToDb */
export async function syncBinanceMarketToDb(
  symbol: string,
): Promise<{ upserted: number }> {
  const r = await syncBinanceIncrementalToDb(symbol);
  return { upserted: r.upserted };
}
