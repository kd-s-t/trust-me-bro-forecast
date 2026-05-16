/**
 * Download Kaggle BTC CSV and upload to Cloudflare R2 (blocking; for local use).
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import { DEFAULT_HISTORY_SYMBOL } from "../lib/constants";
import { runSyncJob } from "../lib/db/syncKaggle";
import { createSyncJob, getSyncJob } from "../lib/db/syncJobs";
import { runMigrations } from "../lib/db/migrate";
import { closeSql } from "../lib/db/sql";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
loadDotenv({ path: join(ROOT, ".env") });

async function main(): Promise<void> {
  await runMigrations();
  const job = await createSyncJob(DEFAULT_HISTORY_SYMBOL);
  console.log(`Sync job ${job.id}…`);
  await runSyncJob(job.id, DEFAULT_HISTORY_SYMBOL);
  const done = await getSyncJob(job.id);
  console.log(done?.message ?? "Done");
  await closeSql();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
