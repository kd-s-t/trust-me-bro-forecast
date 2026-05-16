import { randomUUID } from "node:crypto";
import { unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { downloadDatasetZip } from "@/lib/kaggle/download";
import { extractBtcCsvFromZip } from "@/lib/kaggle/csv";
import { fetchKaggleDatasetVersion } from "@/lib/kaggle/metadata";
import { writeFullHistoryJsonFromCsv } from "@/lib/history/csvToFullJson";
import { replaceSymbolHistoryFromJson } from "@/lib/history/jsonToDb";
import { countHistoryPoints } from "./history";
import { patchSyncJob } from "./syncJobs";
import { upsertSyncState } from "./syncState";

/** Kaggle BTC minute set is ~7.5M rows — reject interrupted writes. */
const MIN_FULL_ROWS = 7_000_000;
const MIN_FULL_JSON_BYTES = 100_000_000;

function formatMb(bytes: number): string {
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

export type SyncKaggleResult = {
  inserted: number;
  rows: number;
  jsonBytes: number;
  newMaxTimeMs: number | null;
  csvInnerPath: string;
  kaggleVersion: number | null;
};

type SyncProgress = {
  phase: string;
  message: string;
};

/**
 * Update data: Kaggle zip → CSV (temp) → full JSON (temp) → replace all rows in Postgres.
 */
export async function syncKaggleFull(
  symbol: string,
  onProgress?: (p: SyncProgress) => Promise<void>,
): Promise<SyncKaggleResult> {
  await onProgress?.({
    phase: "download",
    message: "Downloading full dataset from Kaggle…",
  });

  const zipPath = join(tmpdir(), `btc-kaggle-sync-${randomUUID()}.zip`);
  const csvPath = join(tmpdir(), `btc-csv-sync-${randomUUID()}.csv`);
  const jsonPath = join(tmpdir(), `btc-json-sync-${randomUUID()}.json`);

  await downloadDatasetZip(zipPath);

  try {
    await onProgress?.({
      phase: "extract",
      message: "Extracting Kaggle CSV…",
    });
    const extracted = await extractBtcCsvFromZip(zipPath, csvPath);

    await onProgress?.({
      phase: "json",
      message: "Converting CSV → JSON (all rows)…",
    });
    const built = await writeFullHistoryJsonFromCsv(csvPath, jsonPath);
    if (built.rows < MIN_FULL_ROWS || built.bytes < MIN_FULL_JSON_BYTES) {
      throw new Error(
        `Incomplete export: ${built.rows.toLocaleString()} rows (${formatMb(built.bytes)}). Expected ~7.5M rows — try again.`,
      );
    }

    await onProgress?.({
      phase: "import",
      message: `Inserting JSON → Postgres (${built.rows.toLocaleString()} rows)…`,
    });
    const imported = await replaceSymbolHistoryFromJson(
      symbol,
      jsonPath,
      async (inserted) => {
        await onProgress?.({
          phase: "import",
          message: `Postgres insert… ${inserted.toLocaleString()} rows`,
        });
      },
    );

    let kaggleVersion: number | null = null;
    try {
      const meta = await fetchKaggleDatasetVersion();
      kaggleVersion = meta.versionNumber;
    } catch {
      /* optional */
    }

    await upsertSyncState(symbol, {
      max_time_ms: built.lastTimeMs,
      kaggle_version_number: kaggleVersion,
      csv_bytes: extracted.size,
      csv_inner_path: extracted.innerPath,
    });

    return {
      inserted: imported.inserted,
      rows: built.rows,
      jsonBytes: built.bytes,
      newMaxTimeMs: built.lastTimeMs,
      csvInnerPath: extracted.innerPath,
      kaggleVersion,
    };
  } finally {
    for (const p of [zipPath, csvPath, jsonPath]) {
      try {
        unlinkSync(p);
      } catch {
        /* ignore */
      }
    }
  }
}

/** Background job for Update data button → POST /api/history */
export async function runSyncJob(jobId: string, symbol: string): Promise<void> {
  await patchSyncJob(jobId, {
    status: "running",
    phase: "starting",
    message: "Starting Kaggle sync…",
  });

  try {
    const result = await syncKaggleFull(symbol, async (p) => {
      await patchSyncJob(jobId, {
        phase: p.phase,
        message: p.message,
      });
    });

    const total = await countHistoryPoints(symbol);
    await patchSyncJob(jobId, {
      status: "completed",
      phase: "done",
      message: [
        `Postgres · ${total.toLocaleString()} rows`,
        `JSON ${formatMb(result.jsonBytes)}`,
        `latest ${result.newMaxTimeMs !== null ? new Date(result.newMaxTimeMs).toISOString().slice(0, 10) : "—"}`,
      ].join(" · "),
      scanned: result.rows,
      uploadedBytes: result.jsonBytes,
      newMaxTimeMs: result.newMaxTimeMs,
      kaggleVersion: result.kaggleVersion,
      r2Key: null,
      error: null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await patchSyncJob(jobId, {
      status: "failed",
      phase: "error",
      message: "Sync failed",
      error: message,
    });
    throw e;
  }
}
