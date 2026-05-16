import { S3Client } from "@aws-sdk/client-s3";
import { getR2Config, isR2WriteEnabled } from "./config";

let client: S3Client | undefined;

export function getR2Client(): S3Client {
  if (client === undefined) {
    const cfg = getR2Config();
    client = new S3Client({
      region: "auto",
      endpoint: cfg.endpoint,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
    });
  }
  return client;
}

export function requireR2Write(): void {
  if (!isR2WriteEnabled()) {
    throw new Error(
      "R2 write is not configured (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET).",
    );
  }
}
