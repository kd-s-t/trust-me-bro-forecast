import { config } from "dotenv";
import { HeadObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getR2Client } from "../lib/r2/client";
import { getR2Config } from "../lib/r2/config";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(ROOT, ".env") });

async function main(): Promise<void> {
  const cfg = getR2Config();
  const client = getR2Client();
  const h = await client.send(
    new HeadObjectCommand({ Bucket: cfg.bucket, Key: cfg.historyJsonKey }),
  );
  console.log(
    `${cfg.historyJsonKey}: ${String(h.ContentLength)} bytes, type=${String(h.ContentType)}`,
  );
  const out = await client.send(
    new GetObjectCommand({
      Bucket: cfg.bucket,
      Key: cfg.historyJsonKey,
      Range: "bytes=0-120",
    }),
  );
  const chunks: Buffer[] = [];
  for await (const c of out.Body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  }
  console.log(`  start: ${Buffer.concat(chunks).toString("utf8").replace(/\n/g, " ")}`);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
