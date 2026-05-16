import { randomUUID } from "node:crypto";
import { unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { downloadDatasetZip } from "@/lib/kaggle/download";
import { extractBtcCsvFromZip, streamBtcCsvFile } from "@/lib/kaggle/csv";
import { fetchKaggleDatasetVersion } from "@/lib/kaggle/metadata";
import { runMigrations } from "./migrate";
import { getSyncState, upsertSyncState } from "./syncState";
import { getSql } from "./sql";

const BATCH = 5_000;

export type SyncParseMode = "skipped" | "full" | "tail";

export type SyncKaggleResult = {
  inserted: number;
  scanned: number;
  skippedExisting: number;
  previousMaxTimeMs: number | null;
  newMaxTimeMs: number | null;
  csvPath: string;
  skippedDownload: boolean;
  parseMode: SyncParseMode;
};

async function getMaxTimeMs(symbol: string): Promise<number | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT MAX(time_ms) AS max_time_ms
    FROM price_points
    WHERE symbol = ${symbol}
  `) as { max_time_ms: string | number | null }[];
  const raw = rows[0]?.max_time_ms;
  if (raw === null || raw === undefined) {
    return null;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

async function insertBatch(
  symbol: string,
  points: { timeMs: number; price: number }[],
): Promise<void> {
  if (points.length === 0) {
    return;
  }
  const sql = getSql();
  await sql`
    INSERT INTO price_points ${sql(
      points.map((p) => ({
        symbol,
        time_ms: p.timeMs,
        price: p.price,
        amount: 1,
      })),
    )}
    ON CONFLICT (symbol, time_ms) DO NOTHING
  `;
}

/**
 * Sync Kaggle → Postgres from the latest DB timestamp forward.
 * Skips download when Kaggle dataset version is unchanged; tail-reads CSV
 * when the file grew (append-only updates).
 */
export async function syncKaggleToDb(symbol: string): Promise<SyncKaggleResult> {
  await runMigrations();
  const previousMaxTimeMs = await getMaxTimeMs(symbol);
  const afterMs = previousMaxTimeMs ?? -1;
  const state = await getSyncState(symbol);

  let kaggleVersion: number | null = null;
  try {
    const meta = await fetchKaggleDatasetVersion();
    kaggleVersion = meta.versionNumber;
    if (
      state !== null &&
      kaggleVersion === state.kaggle_version_number &&
      previousMaxTimeMs !== null
    ) {
      return {
        inserted: 0,
        scanned: 0,
        skippedExisting: 0,
        previousMaxTimeMs,
        newMaxTimeMs: previousMaxTimeMs,
        csvPath: state.csv_inner_path ?? "",
        skippedDownload: true,
        parseMode: "skipped",
      };
    }
  } catch {
    /* metadata optional; continue with download */
  }

  const zipPath = join(tmpdir(), `btc-kaggle-sync-${randomUUID()}.zip`);
  const csvPath = join(tmpdir(), `btc-csv-sync-${randomUUID()}.csv`);
  await downloadDatasetZip(zipPath);

  let scanned = 0;
  let inserted = 0;
  let skippedExisting = 0;
  let newMaxTimeMs = previousMaxTimeMs;
  let batch: { timeMs: number; price: number }[] = [];
  let innerPath = "";
  let parseMode: SyncParseMode = "full";

  const flush = async (): Promise<void> => {
    if (batch.length === 0) {
      return;
    }
    await insertBatch(symbol, batch);
    inserted += batch.length;
    batch = [];
  };

  try {
    const extracted = await extractBtcCsvFromZip(zipPath, csvPath);
    innerPath = extracted.innerPath;
    const csvSize = extracted.size;

    const useTail =
      state !== null &&
      state.csv_bytes > 0 &&
      csvSize > state.csv_bytes &&
      previousMaxTimeMs !== null;

    const fromByte = useTail ? state.csv_bytes : 0;
    parseMode = fromByte > 0 ? "tail" : "full";

    await streamBtcCsvFile(
      csvPath,
      async (row) => {
        scanned++;
        if (row.timeMs <= afterMs) {
          skippedExisting++;
          return;
        }
        batch.push(row);
        if (newMaxTimeMs === null || row.timeMs > newMaxTimeMs) {
          newMaxTimeMs = row.timeMs;
        }
        if (batch.length >= BATCH) {
          await flush();
        }
      },
      { fromByte },
    );
    await flush();

    await upsertSyncState(symbol, {
      max_time_ms: newMaxTimeMs ?? previousMaxTimeMs,
      kaggle_version_number: kaggleVersion,
      csv_bytes: csvSize,
      csv_inner_path: innerPath,
    });
  } finally {
    for (const p of [zipPath, csvPath]) {
      try {
        unlinkSync(p);
      } catch {
        /* ignore */
      }
    }
  }

  return {
    inserted,
    scanned,
    skippedExisting,
    previousMaxTimeMs,
    newMaxTimeMs,
    csvPath: innerPath,
    skippedDownload: false,
    parseMode,
  };
}
