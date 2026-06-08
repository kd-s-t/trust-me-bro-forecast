import path from "node:path";
import { syncBinanceIncrementalToDb } from "@/lib/binance/syncMarketToDb";
import { injectBetPurchasePoint } from "@/lib/chartBetMarker";
import { loadFxConfig } from "@/lib/fxConfig";
import { DEFAULT_HISTORY_SYMBOL, loadHistoryFromDb } from "@/lib/db/history";
import type { PricePoint } from "@/lib/history";

/** Chart loads sampled points from Postgres (Kaggle bulk + Binance live ticks). */
export async function loadHistory(): Promise<PricePoint[]> {
  try {
    await syncBinanceIncrementalToDb(DEFAULT_HISTORY_SYMBOL);
  } catch {
    /* chart still works from existing DB rows */
  }

  const points = await loadHistoryFromDb(DEFAULT_HISTORY_SYMBOL);
  const { pesoPerUsd } = loadFxConfig(process.cwd());
  return injectBetPurchasePoint(points, pesoPerUsd);
}
