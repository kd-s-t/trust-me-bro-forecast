import { config as loadDotenv } from "dotenv";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runMigrations } from "../lib/db/migrate";
import { closeSql } from "../lib/db/sql";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
loadDotenv({ path: join(ROOT, ".env") });

async function main(): Promise<void> {
  await runMigrations();
  console.log("Migrations applied.");
  await closeSql();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
