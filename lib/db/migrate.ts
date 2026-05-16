import { seedUsers } from "./users";
import { getSql } from "./sql";

export async function runMigrations(): Promise<void> {
  const sql = getSql();

  await sql`
    DROP TABLE IF EXISTS price_points
  `;
  await sql`
    DROP TABLE IF EXISTS sync_state
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS sync_jobs (
      id UUID PRIMARY KEY,
      symbol TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT,
      phase TEXT,
      scanned BIGINT NOT NULL DEFAULT 0,
      uploaded_bytes BIGINT NOT NULL DEFAULT 0,
      new_max_time_ms BIGINT,
      kaggle_version INTEGER,
      r2_key TEXT,
      error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS sync_jobs_symbol_status_idx
      ON sync_jobs (symbol, status, updated_at DESC)
  `;

  await seedUsers();
}
