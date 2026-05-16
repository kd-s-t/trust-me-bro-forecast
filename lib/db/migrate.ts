import { seedUsers } from "./users";
import { getSql } from "./sql";

export async function runMigrations(): Promise<void> {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS price_points (
      symbol TEXT NOT NULL,
      time_ms BIGINT NOT NULL,
      price DOUBLE PRECISION NOT NULL,
      amount DOUBLE PRECISION NOT NULL DEFAULT 1,
      PRIMARY KEY (symbol, time_ms)
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS price_points_symbol_time_idx
      ON price_points (symbol, time_ms)
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS sync_state (
      symbol TEXT PRIMARY KEY,
      max_time_ms BIGINT,
      kaggle_version_number INTEGER,
      csv_bytes BIGINT NOT NULL DEFAULT 0,
      csv_inner_path TEXT,
      synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await seedUsers();
}
