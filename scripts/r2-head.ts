import { config } from "dotenv";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getR2Client } from "../lib/r2/client";
import { getR2Config } from "../lib/r2/config";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(ROOT, ".env") });

async function main(): Promise<void> {
  const cfg = getR2Config();
  const client = getR2Client();
  try {
    const h = await client.send(
      new HeadObjectCommand({
        Bucket: cfg.bucket,
        Key: cfg.historyJsonKey,
      }),
    );
    console.log(
      `EXISTS ${cfg.bucket}/${cfg.historyJsonKey} (${String(h.ContentLength)} bytes)`,
    );
  } catch {
    console.log(`MISSING ${cfg.bucket}/${cfg.historyJsonKey}`);
    process.exit(1);
  }
}

main();
