/**
 * Run one sync job by id (detached worker for Update data — survives after HTTP ends).
 */
import { config } from "dotenv";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_HISTORY_SYMBOL } from "../lib/constants";
import { runSyncJob } from "../lib/db/syncKaggle";
import { closeSql } from "../lib/db/sql";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(ROOT, ".env") });

const jobId = process.argv[2]?.trim();
if (jobId === undefined || jobId === "") {
  console.error("Usage: tsx scripts/run-sync-job.ts <jobId>");
  process.exit(1);
}

runSyncJob(jobId, DEFAULT_HISTORY_SYMBOL)
  .catch(() => {
    /* status stored on sync_jobs */
  })
  .finally(async () => {
    await closeSql();
  });
