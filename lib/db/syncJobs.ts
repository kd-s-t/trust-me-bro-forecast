import { randomUUID } from "node:crypto";
import { getSql } from "./sql";

export type SyncJobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

export type SyncJob = {
  id: string;
  symbol: string;
  status: SyncJobStatus;
  message: string | null;
  phase: string | null;
  scanned: number;
  uploadedBytes: number;
  newMaxTimeMs: number | null;
  kaggleVersion: number | null;
  r2Key: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

type SyncJobRow = {
  id: string;
  symbol: string;
  status: string;
  message: string | null;
  phase: string | null;
  scanned: string | number;
  uploaded_bytes: string | number;
  new_max_time_ms: string | number | null;
  kaggle_version: number | null;
  r2_key: string | null;
  error: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

function rowToJob(r: SyncJobRow): SyncJob {
  return {
    id: r.id,
    symbol: r.symbol,
    status: r.status as SyncJobStatus,
    message: r.message,
    phase: r.phase,
    scanned: Number(r.scanned),
    uploadedBytes: Number(r.uploaded_bytes),
    newMaxTimeMs:
      r.new_max_time_ms === null || r.new_max_time_ms === undefined
        ? null
        : Number(r.new_max_time_ms),
    kaggleVersion: r.kaggle_version,
    r2Key: r.r2_key,
    error: r.error,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

export async function createSyncJob(symbol: string): Promise<SyncJob> {
  const sql = getSql();
  const id = randomUUID();
  const rows = (await sql`
    INSERT INTO sync_jobs (id, symbol, status, message, phase)
    VALUES (${id}, ${symbol}, 'pending', 'Queued', 'queued')
    RETURNING *
  `) as SyncJobRow[];
  return rowToJob(rows[0]!);
}

export async function getSyncJob(id: string): Promise<SyncJob | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT *
    FROM sync_jobs
    WHERE id = ${id}
  `) as SyncJobRow[];
  const r = rows[0];
  return r === undefined ? null : rowToJob(r);
}

export async function findRunningSyncJob(symbol: string): Promise<SyncJob | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT *
    FROM sync_jobs
    WHERE symbol = ${symbol}
      AND status IN ('pending', 'running')
    ORDER BY created_at DESC
    LIMIT 1
  `) as SyncJobRow[];
  const r = rows[0];
  return r === undefined ? null : rowToJob(r);
}

export async function getLastCompletedKaggleVersion(
  symbol: string,
): Promise<number | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT kaggle_version
    FROM sync_jobs
    WHERE symbol = ${symbol}
      AND status IN ('completed', 'skipped')
      AND kaggle_version IS NOT NULL
    ORDER BY updated_at DESC
    LIMIT 1
  `) as { kaggle_version: number | null }[];
  return rows[0]?.kaggle_version ?? null;
}

export async function patchSyncJob(
  id: string,
  patch: {
    status?: SyncJobStatus;
    message?: string;
    phase?: string;
    scanned?: number;
    uploadedBytes?: number;
    newMaxTimeMs?: number | null;
    kaggleVersion?: number | null;
    r2Key?: string | null;
    error?: string | null;
  },
): Promise<void> {
  const sql = getSql();
  const existing = await getSyncJob(id);
  if (existing === null) {
    return;
  }

  await sql`
    UPDATE sync_jobs
    SET
      status = ${patch.status ?? existing.status},
      message = ${patch.message ?? existing.message},
      phase = ${patch.phase ?? existing.phase},
      scanned = ${patch.scanned ?? existing.scanned},
      uploaded_bytes = ${patch.uploadedBytes ?? existing.uploadedBytes},
      new_max_time_ms = ${patch.newMaxTimeMs !== undefined ? patch.newMaxTimeMs : existing.newMaxTimeMs},
      kaggle_version = ${patch.kaggleVersion !== undefined ? patch.kaggleVersion : existing.kaggleVersion},
      r2_key = ${patch.r2Key !== undefined ? patch.r2Key : existing.r2Key},
      error = ${patch.error !== undefined ? patch.error : existing.error},
      updated_at = NOW()
    WHERE id = ${id}
  `;
}
