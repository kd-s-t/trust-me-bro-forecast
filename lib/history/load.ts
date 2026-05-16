import type { PricePoint } from "@/lib/history";
import { DEFAULT_HISTORY_SYMBOL, loadHistoryFromDb } from "@/lib/db/history";

/** Chart loads sampled points from Postgres (full history stays in DB). */
export async function loadHistory(): Promise<PricePoint[]> {
  return loadHistoryFromDb(DEFAULT_HISTORY_SYMBOL);
}
