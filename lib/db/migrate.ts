import { seedPredictionCatalog } from "./predictions";
import { seedResearchScenarioForecast } from "./seedResearchScenario";
import { seedUsers } from "./users";
import { getSql } from "./sql";

export async function runMigrations(): Promise<void> {
  const sql = getSql();

  await sql`
    ALTER TABLE IF EXISTS price_points RENAME TO history
  `;
  await sql`
    ALTER INDEX IF EXISTS price_points_symbol_time_idx RENAME TO history_symbol_time_idx
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS history (
      symbol TEXT NOT NULL,
      time_ms BIGINT NOT NULL,
      price DOUBLE PRECISION NOT NULL,
      amount DOUBLE PRECISION NOT NULL DEFAULT 1,
      PRIMARY KEY (symbol, time_ms)
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS history_symbol_time_idx
      ON history (symbol, time_ms)
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
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT
  `;
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT
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

  await sql`
    CREATE TABLE IF NOT EXISTS forecast_runs (
      id UUID PRIMARY KEY,
      symbol TEXT NOT NULL,
      horizon TEXT NOT NULL,
      start_time_ms BIGINT NOT NULL,
      end_time_ms BIGINT NOT NULL,
      start_price DOUBLE PRECISION NOT NULL,
      analysis TEXT NOT NULL,
      news_payload JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS forecast_runs_symbol_created_idx
      ON forecast_runs (symbol, created_at DESC)
  `;

  await sql`
    ALTER TABLE IF EXISTS forecast_points RENAME TO forecast
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS forecast (
      forecast_run_id UUID NOT NULL REFERENCES forecast_runs(id) ON DELETE CASCADE,
      time_ms BIGINT NOT NULL,
      price DOUBLE PRECISION NOT NULL,
      PRIMARY KEY (forecast_run_id, time_ms)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS prediction_categories (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS prediction_items (
      id TEXT NOT NULL,
      category_id TEXT NOT NULL REFERENCES prediction_categories(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT false,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (category_id, id)
    )
  `;

  await seedUsers();
  await seedPredictionCatalog();
  await seedResearchScenarioForecast();
}
