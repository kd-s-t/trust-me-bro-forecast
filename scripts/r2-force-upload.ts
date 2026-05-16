/**
 * Force Kaggle → public/btc-price-history.json + R2 (all rows).
 */
import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import { unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { downloadDatasetZip } from "../lib/kaggle/download";
import { extractBtcCsvFromZip } from "../lib/kaggle/csv";
import { writeFullHistoryJsonFromCsv } from "../lib/history/csvToFullJson";
import {
  getPublicHistoryJsonPath,
  removeLegacyPublicCsv,
} from "../lib/history/publicHistory";
import { isR2WriteEnabled } from "../lib/r2/config";
import { uploadHistoryJson } from "../lib/r2/historyStorage";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(ROOT, ".env") });

async function main(): Promise<void> {
  const zipPath = join(tmpdir(), `btc-kaggle-force-${randomUUID()}.zip`);
  const csvPath = join(tmpdir(), `btc-csv-force-${randomUUID()}.csv`);
  const jsonPath = getPublicHistoryJsonPath();
  try {
    console.log("Downloading Kaggle…");
    await downloadDatasetZip(zipPath);
    console.log("Extracting CSV (temp)…");
    await extractBtcCsvFromZip(zipPath, csvPath);
    console.log("Converting all rows to JSON…");
    const built = await writeFullHistoryJsonFromCsv(csvPath, jsonPath);
    await removeLegacyPublicCsv();
    console.log(
      `Saved ${jsonPath} (${built.bytes.toLocaleString()} bytes, ${String(built.rows)} rows)`,
    );
    if (isR2WriteEnabled()) {
      console.log("Uploading full JSON to R2…");
      const result = await uploadHistoryJson(jsonPath);
      console.log(
        `R2: ${result.bucket}/${result.key} (${result.bytes.toLocaleString()} bytes)`,
      );
    }
  } finally {
    for (const p of [zipPath, csvPath]) {
      try {
        unlinkSync(p);
      } catch {
        /* ignore */
      }
    }
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
