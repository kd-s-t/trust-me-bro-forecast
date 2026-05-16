/**
 * Upload existing public/btc-price-history.json to R2 (no Kaggle download).
 */
import { config } from "dotenv";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isR2WriteEnabled } from "../lib/r2/config";
import { uploadPublicHistoryJsonToR2 } from "../lib/r2/historyStorage";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(ROOT, ".env") });

async function main(): Promise<void> {
  if (!isR2WriteEnabled()) {
    throw new Error("R2 write not configured");
  }
  const result = await uploadPublicHistoryJsonToR2();
  if (result === null) {
    throw new Error("Missing public/btc-price-history.json — run Update data first.");
  }
  console.log(
    `Uploaded ${result.bucket}/${result.key} (${result.bytes.toLocaleString()} bytes)`,
  );
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
