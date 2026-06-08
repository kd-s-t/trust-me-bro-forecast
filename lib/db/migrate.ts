import { seedPredictionCatalogForUser } from "./predictions";
import { seedResearchScenarioForecast } from "./seedResearchScenario";
import { seedUsers, seedUsernames } from "./users";
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
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT
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
      username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
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
      username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
      id TEXT NOT NULL,
      label TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (username, id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS prediction_items (
      username TEXT NOT NULL,
      id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      label TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT false,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (username, category_id, id),
      FOREIGN KEY (username, category_id)
        REFERENCES prediction_categories(username, id) ON DELETE CASCADE
    )
  `;

  await migrateUserScopedSchema(sql);
  await migrateBinanceAutoTradeLock(sql);

  await seedUsers();
  for (const username of seedUsernames()) {
    await seedPredictionCatalogForUser(username);
    await seedResearchScenarioForecast(username);
  }

  await sql`
    ALTER TABLE forecast_runs
    ADD CONSTRAINT forecast_runs_username_fkey
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
  `.catch(() => undefined);
}

type PkColumnRow = { column_name: string };

async function primaryKeyColumns(
  sql: ReturnType<typeof getSql>,
  tableName: string,
): Promise<string[]> {
  const rows = (await sql`
    SELECT kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
      AND tc.table_name = kcu.table_name
    WHERE tc.constraint_type = 'PRIMARY KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = ${tableName}
    ORDER BY kcu.ordinal_position
  `) as PkColumnRow[];
  return rows.map((r) => r.column_name);
}

async function predictionPkAlreadyUserScoped(
  sql: ReturnType<typeof getSql>,
): Promise<boolean> {
  const cat = await primaryKeyColumns(sql, "prediction_categories");
  const items = await primaryKeyColumns(sql, "prediction_items");
  return (
    cat.length === 2 &&
    cat[0] === "username" &&
    cat[1] === "id" &&
    items.length === 3 &&
    items[0] === "username" &&
    items[1] === "category_id" &&
    items[2] === "id"
  );
}

async function migrateUserScopedSchema(
  sql: ReturnType<typeof getSql>,
): Promise<void> {
  await sql`
    ALTER TABLE forecast_runs ADD COLUMN IF NOT EXISTS username TEXT
  `;
  await sql`
    UPDATE forecast_runs
    SET username = 'kenn'
    WHERE username IS NULL
  `;

  await sql`
    ALTER TABLE prediction_categories ADD COLUMN IF NOT EXISTS username TEXT
  `;
  await sql`
    UPDATE prediction_categories
    SET username = 'kenn'
    WHERE username IS NULL
  `;

  await sql`
    ALTER TABLE prediction_items ADD COLUMN IF NOT EXISTS username TEXT
  `;
  await sql`
    UPDATE prediction_items pi
    SET username = c.username
    FROM prediction_categories c
    WHERE pi.category_id = c.id
      AND pi.username IS NULL
      AND c.username IS NOT NULL
  `;
  await sql`
    UPDATE prediction_items
    SET username = 'kenn'
    WHERE username IS NULL
  `;

  const pkDone = await predictionPkAlreadyUserScoped(sql);
  if (!pkDone) {
    await sql`
      ALTER TABLE prediction_items
      DROP CONSTRAINT IF EXISTS prediction_items_category_fkey
    `;
    await sql`
      ALTER TABLE prediction_items
      DROP CONSTRAINT IF EXISTS prediction_items_category_id_fkey
    `;
    await sql`
      ALTER TABLE prediction_items
      DROP CONSTRAINT IF EXISTS prediction_items_pkey
    `;
    await sql`
      ALTER TABLE prediction_categories
      DROP CONSTRAINT IF EXISTS prediction_categories_pkey
    `;
    await sql`
      ALTER TABLE prediction_categories
      ADD PRIMARY KEY (username, id)
    `.catch(() => undefined);
    await sql`
      ALTER TABLE prediction_items
      ADD PRIMARY KEY (username, category_id, id)
    `.catch(() => undefined);
    await sql`
      ALTER TABLE prediction_items
      ADD CONSTRAINT prediction_items_category_fkey
      FOREIGN KEY (username, category_id)
      REFERENCES prediction_categories(username, id) ON DELETE CASCADE
    `.catch(() => undefined);
  }

  await sql`
    DROP INDEX IF EXISTS forecast_runs_symbol_created_idx
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS forecast_runs_user_symbol_created_idx
      ON forecast_runs (username, symbol, created_at DESC)
  `;
}

async function migrateBinanceAutoTradeLock(
  sql: ReturnType<typeof getSql>,
): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS binance_auto_trade_lock (
      lock_key TEXT PRIMARY KEY,
      order_id TEXT,
      side TEXT NOT NULL,
      price_usd DOUBLE PRECISION NOT NULL,
      quantity DOUBLE PRECISION,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}
