import { access, readFile, stat, unlink } from "node:fs/promises";
import { join } from "node:path";
import type { PricePoint } from "@/lib/history";
import { parsePriceDocument } from "@/lib/history";
import { getAppRoot } from "@/lib/appRoot";

/** Full Kaggle history as JSON — every row (~500MB–1GB+). */
export const HISTORY_JSON_FILENAME = "btc-price-history.json";
const LEGACY_CSV_FILENAME = "btc-price-history.csv";

export function getPublicHistoryJsonPath(): string {
  return join(getAppRoot(), "public", HISTORY_JSON_FILENAME);
}

export async function publicHistoryJsonExists(): Promise<boolean> {
  try {
    await access(getPublicHistoryJsonPath());
    return true;
  } catch {
    return false;
  }
}

export async function publicHistoryJsonBytes(): Promise<number> {
  const { size } = await stat(getPublicHistoryJsonPath());
  return size;
}

export async function removePublicHistoryJson(): Promise<void> {
  try {
    await unlink(getPublicHistoryJsonPath());
  } catch {
    /* ignore */
  }
}

/** Remove old CSV if present (we only keep JSON in `public/`). */
export async function removeLegacyPublicCsv(): Promise<void> {
  try {
    await unlink(join(getAppRoot(), "public", LEGACY_CSV_FILENAME));
  } catch {
    /* ignore */
  }
}

export async function loadPublicHistoryJson(): Promise<PricePoint[]> {
  const raw = await readFile(getPublicHistoryJsonPath(), "utf8");
  return parsePriceDocument(JSON.parse(raw) as unknown, HISTORY_JSON_FILENAME);
}
