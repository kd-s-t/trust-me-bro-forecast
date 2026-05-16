import type { PricePoint } from "@/lib/history";
import {
  loadPublicHistoryJson,
  publicHistoryJsonExists,
} from "@/lib/history/publicHistory";
import { getHistoryJsonFromRemote } from "@/lib/r2/historyStorage";
import { isR2HistoryEnabled } from "@/lib/r2/config";

/** Full history JSON — every row from `public/btc-price-history.json` or R2. */
export async function loadHistory(): Promise<PricePoint[]> {
  if (await publicHistoryJsonExists()) {
    return loadPublicHistoryJson();
  }

  if (isR2HistoryEnabled()) {
    return getHistoryJsonFromRemote();
  }

  throw new Error(
    "No price JSON yet. Click Update data to build public/btc-price-history.json.",
  );
}
