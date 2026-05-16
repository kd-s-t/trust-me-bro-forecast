import { config } from "dotenv";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadHistory } from "../lib/history/load";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(ROOT, ".env") });

async function main(): Promise<void> {
  const t = Date.now();
  const pts = await loadHistory();
  console.log(
    `OK: ${String(pts.length)} points in ${String(Date.now() - t)}ms · ${new Date(pts[0]!.timeMs).toISOString().slice(0, 10)} → ${new Date(pts[pts.length - 1]!.timeMs).toISOString().slice(0, 10)}`,
  );
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
