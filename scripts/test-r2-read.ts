import { config } from "dotenv";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getHistoryJsonFromRemote } from "../lib/r2/historyStorage";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(ROOT, ".env") });

async function main(): Promise<void> {
  const pts = await getHistoryJsonFromRemote();
  console.log(`R2 JSON OK: ${String(pts.length)} rows`);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
