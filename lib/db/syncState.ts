import { getSql } from "./sql";

export type SyncState = {
  symbol: string;
  max_time_ms: number | null;
  kaggle_version_number: number | null;
  csv_bytes: number;
  csv_inner_path: string | null;
};

type SyncStateRow = {
  symbol: string;
  max_time_ms: string | number | null;
  kaggle_version_number: number | null;
  csv_bytes: string | number;
  csv_inner_path: string | null;
};

export async function getSyncState(symbol: string): Promise<SyncState | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT symbol, max_time_ms, kaggle_version_number, csv_bytes, csv_inner_path
    FROM sync_state
    WHERE symbol = ${symbol}
  `) as SyncStateRow[];
  const r = rows[0];
  if (r === undefined) {
    return null;
  }
  return {
    symbol: r.symbol,
    max_time_ms:
      r.max_time_ms === null || r.max_time_ms === undefined
        ? null
        : Number(r.max_time_ms),
    kaggle_version_number: r.kaggle_version_number,
    csv_bytes: Number(r.csv_bytes),
    csv_inner_path: r.csv_inner_path,
  };
}

export async function upsertSyncState(
  symbol: string,
  patch: {
    max_time_ms: number | null;
    kaggle_version_number: number | null;
    csv_bytes: number;
    csv_inner_path: string;
  },
): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO sync_state (
      symbol,
      max_time_ms,
      kaggle_version_number,
      csv_bytes,
      csv_inner_path,
      synced_at
    ) VALUES (
      ${symbol},
      ${patch.max_time_ms},
      ${patch.kaggle_version_number},
      ${patch.csv_bytes},
      ${patch.csv_inner_path},
      NOW()
    )
    ON CONFLICT (symbol) DO UPDATE SET
      max_time_ms = EXCLUDED.max_time_ms,
      kaggle_version_number = EXCLUDED.kaggle_version_number,
      csv_bytes = EXCLUDED.csv_bytes,
      csv_inner_path = EXCLUDED.csv_inner_path,
      synced_at = NOW()
  `;
}
