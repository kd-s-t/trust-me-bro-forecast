import { fetchBinanceMinuteKlinesSince, fetchBinanceTickerPrice } from "@/lib/binance/market";
import { syncBinanceIncrementalToDb } from "@/lib/binance/syncMarketToDb";
import { HOUR_24_MS } from "@/lib/chart/historyView";
import { DEFAULT_HISTORY_SYMBOL, loadHistoryRangeFromDb } from "@/lib/db/history";
import type { PricePoint } from "@/lib/history";
import { mergePricePoints } from "@/lib/history/mergePricePoints";

/** Last 24h: 1m Binance + DB ticks (unsampled). */
export async function loadHistory24h(
  symbol: string = DEFAULT_HISTORY_SYMBOL,
): Promise<PricePoint[]> {
  const endMs = Date.now();
  const startMs = endMs - HOUR_24_MS;

  try {
    await syncBinanceIncrementalToDb(symbol);
  } catch {
    /* use whatever is already in DB */
  }

  const [dbPoints, minutes] = await Promise.all([
    loadHistoryRangeFromDb(symbol, startMs, endMs),
    fetchBinanceMinuteKlinesSince(startMs - 60_000),
  ]);

  let points = mergePricePoints(dbPoints, minutes);

  try {
    const price = await fetchBinanceTickerPrice();
    points = mergePricePoints(points, [
      { timeMs: endMs, price, amount: 1 },
    ]);
  } catch {
    /* keep merged minutes */
  }

  return points.filter((p) => p.timeMs >= startMs && p.timeMs <= endMs);
}
