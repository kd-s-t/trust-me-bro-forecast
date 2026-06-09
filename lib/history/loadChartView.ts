import {
  fetchBinanceKlinesSince,
  fetchBinanceTickerPrice,
} from "@/lib/binance/market";
import { syncBinanceIncrementalToDb } from "@/lib/binance/syncMarketToDb";
import { injectBetPurchasePoint } from "@/lib/chartBetMarker";
import {
  type ChartHistoryView,
  chartViewBinanceInterval,
  chartViewLookbackMs,
} from "@/lib/chart/historyView";
import { DEFAULT_HISTORY_SYMBOL, loadHistoryRangeFromDb } from "@/lib/db/history";
import { loadFxConfig } from "@/lib/fxConfig";
import type { PricePoint } from "@/lib/history";
import { mergePricePoints } from "@/lib/history/mergePricePoints";

/** Binance klines + DB ticks for the selected chart interval/window. */
export async function loadHistoryForChartView(
  view: ChartHistoryView,
  symbol: string = DEFAULT_HISTORY_SYMBOL,
): Promise<PricePoint[]> {
  const endMs = Date.now();
  const startMs = endMs - chartViewLookbackMs(view);
  const interval = chartViewBinanceInterval(view) as
    | "15m"
    | "1h"
    | "4h"
    | "1d";

  try {
    await syncBinanceIncrementalToDb(symbol);
  } catch {
    /* use whatever is already in DB */
  }

  const [dbPoints, klines] = await Promise.all([
    loadHistoryRangeFromDb(symbol, startMs, endMs),
    fetchBinanceKlinesSince(interval, startMs - 60_000),
  ]);

  let points = mergePricePoints(dbPoints, klines);

  try {
    const price = await fetchBinanceTickerPrice();
    points = mergePricePoints(points, [{ timeMs: endMs, price, amount: 1 }]);
  } catch {
    /* keep merged klines */
  }

  points = points.filter((p) => p.timeMs >= startMs && p.timeMs <= endMs);

  const { pesoPerUsd } = loadFxConfig(process.cwd());
  return injectBetPurchasePoint(points, pesoPerUsd);
}
