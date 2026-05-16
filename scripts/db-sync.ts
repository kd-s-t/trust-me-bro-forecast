/**
 * Download Kaggle BTC history and upsert into Postgres (incremental after first run).
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import { DEFAULT_HISTORY_SYMBOL } from "../lib/db/history";
import { syncKaggleToDb } from "../lib/db/syncKaggle";
import { closeSql } from "../lib/db/sql";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
loadDotenv({ path: join(ROOT, ".env") });

async function main(): Promise<void> {
  console.log(`Syncing Kaggle → Postgres (${DEFAULT_HISTORY_SYMBOL})…`);
  const result = await syncKaggleToDb(DEFAULT_HISTORY_SYMBOL);
  console.log(
    `Done. inserted=${result.inserted.toLocaleString()} scanned=${result.scanned.toLocaleString()} skipped=${result.skippedExisting.toLocaleString()}`,
  );
  if (result.csvPath) {
    console.log(`CSV: ${result.csvPath}`);
  }
  await closeSql();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
