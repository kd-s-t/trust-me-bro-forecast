import { randomUUID } from "node:crypto";
import { unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { downloadDatasetZip } from "@/lib/kaggle/download";
import { extractBtcCsvFromZip } from "@/lib/kaggle/csv";
import { writeFullHistoryJsonFromCsv } from "@/lib/history/csvToFullJson";
import {
  getPublicHistoryJsonPath,
  removeLegacyPublicCsv,
  removePublicHistoryJson,
} from "@/lib/history/publicHistory";
import { isR2WriteEnabled } from "@/lib/r2/config";
import { uploadHistoryJson } from "@/lib/r2/historyStorage";
import { runMigrations } from "./migrate";
import { patchSyncJob } from "./syncJobs";

/** Kaggle BTC minute set is ~7.5M rows — reject interrupted writes. */
const MIN_FULL_ROWS = 7_000_000;
const MIN_FULL_JSON_BYTES = 100_000_000;

function formatMb(bytes: number): string {
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

function requireR2ForSync(): void {
  if (!isR2WriteEnabled()) {
    throw new Error(
      "R2 is required for Update data. Set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET in .env",
    );
  }
}

/**
 * Update data: Kaggle CSV (temp) → full JSON in `public/` + R2. Every row, no sampling.
 */
export async function runSyncJob(jobId: string, symbol: string): Promise<void> {
  void symbol;
  requireR2ForSync();
  await runMigrations();

  await patchSyncJob(jobId, {
    status: "running",
    phase: "starting",
    message: "Starting sync…",
  });

  const zipPath = join(tmpdir(), `btc-kaggle-sync-${randomUUID()}.zip`);
  const csvPath = join(tmpdir(), `btc-csv-sync-${randomUUID()}.csv`);
  const jsonPath = getPublicHistoryJsonPath();

  try {
    await patchSyncJob(jobId, {
      phase: "download",
      message: "Downloading full dataset from Kaggle…",
    });
    await downloadDatasetZip(zipPath);

    await patchSyncJob(jobId, {
      phase: "extract",
      message: "Extracting Kaggle CSV (temp)…",
    });
    await extractBtcCsvFromZip(zipPath, csvPath);

    await patchSyncJob(jobId, {
      phase: "json",
      message: "Converting all rows → public/btc-price-history.json…",
    });
    const built = await writeFullHistoryJsonFromCsv(csvPath, jsonPath);
    await removeLegacyPublicCsv();

    if (built.rows < MIN_FULL_ROWS || built.bytes < MIN_FULL_JSON_BYTES) {
      await removePublicHistoryJson();
      throw new Error(
        `Incomplete history: ${built.rows.toLocaleString()} rows (${formatMb(built.bytes)}). Need ~7.5M rows. Delete the file and run Update data again, or use: npm run db:sync`,
      );
    }

    await patchSyncJob(jobId, {
      phase: "upload",
      message: "Uploading full JSON to R2…",
    });
    const r2Uploaded = await uploadHistoryJson(jsonPath);
    if (r2Uploaded.bytes < MIN_FULL_JSON_BYTES) {
      throw new Error(
        `R2 upload is only ${formatMb(r2Uploaded.bytes)} — expected full JSON`,
      );
    }

    await patchSyncJob(jobId, {
      status: "completed",
      phase: "done",
      message: [
        `public/btc-price-history.json ${formatMb(built.bytes)} · ${built.rows.toLocaleString()} rows`,
        `R2 ${r2Uploaded.key} ${formatMb(r2Uploaded.bytes)}`,
      ].join(" · "),
      scanned: built.rows,
      uploadedBytes: r2Uploaded.bytes,
      newMaxTimeMs: built.lastTimeMs,
      kaggleVersion: null,
      r2Key: r2Uploaded.key,
      error: null,
    });
  } catch (e) {
    await removePublicHistoryJson().catch(() => {});
    const message = e instanceof Error ? e.message : String(e);
    await patchSyncJob(jobId, {
      status: "failed",
      phase: "error",
      message: "Sync failed",
      error: message,
    });
    throw e;
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
