import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { Readable } from "node:stream";
import { Readable as ReadableCtor } from "node:stream";
import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import type { PricePoint } from "@/lib/history";
import { parsePriceDocument } from "@/lib/history";
import {
  getPublicHistoryJsonPath,
  publicHistoryJsonExists,
} from "@/lib/history/publicHistory";
import { isR2WriteEnabled } from "./config";
import { getR2Client, requireR2Write } from "./client";
import { getR2Config } from "./config";

function readableFromGetObjectBody(body: unknown): Readable {
  if (body === undefined || body === null) {
    throw new Error("R2 returned empty body");
  }
  if (typeof body === "string") {
    return ReadableCtor.from(body);
  }
  if (body instanceof ReadableCtor) {
    return body;
  }
  const stream = body as { transformToByteArray?: () => Promise<Uint8Array> };
  if (typeof stream.transformToByteArray === "function") {
    return ReadableCtor.from(stream.transformToByteArray());
  }
  throw new Error("Unsupported R2 response body");
}

export async function getR2ObjectStream(objectKey: string): Promise<Readable> {
  requireR2Write();
  const cfg = getR2Config();
  const client = getR2Client();
  let out;
  try {
    out = await client.send(
      new GetObjectCommand({
        Bucket: cfg.bucket,
        Key: objectKey,
      }),
    );
  } catch (e) {
    const name =
      e !== null && typeof e === "object" && "name" in e
        ? String((e as { name: unknown }).name)
        : "";
    if (name === "NoSuchKey" || String(e).includes("does not exist")) {
      throw new Error(`No object in R2 at ${cfg.bucket}/${objectKey}`);
    }
    throw e;
  }
  return readableFromGetObjectBody(out.Body);
}

export async function deleteR2Object(objectKey: string): Promise<void> {
  requireR2Write();
  const cfg = getR2Config();
  const client = getR2Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: cfg.bucket,
      Key: objectKey,
    }),
  );
}

/** Upload full history JSON to R2 (streamed from disk). */
export async function uploadHistoryJson(filePath: string): Promise<{
  bucket: string;
  key: string;
  bytes: number;
}> {
  requireR2Write();
  const cfg = getR2Config();
  const client = getR2Client();
  const bytes = (await stat(filePath)).size;

  await new Upload({
    client,
    params: {
      Bucket: cfg.bucket,
      Key: cfg.historyJsonKey,
      Body: createReadStream(filePath),
      ContentType: "application/json; charset=utf-8",
      ContentDisposition: 'inline; filename="btc-price-history.json"',
    },
  }).done();

  return {
    bucket: cfg.bucket,
    key: cfg.historyJsonKey,
    bytes,
  };
}

async function fetchHistoryJsonText(): Promise<string> {
  const url = process.env.HISTORY_JSON_URL?.trim();
  if (url !== undefined && url !== "") {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(
        `Failed to fetch history JSON (${String(res.status)} ${res.statusText})`,
      );
    }
    return res.text();
  }

  requireR2Write();
  const cfg = getR2Config();
  const client = getR2Client();
  let out;
  try {
    out = await client.send(
      new GetObjectCommand({
        Bucket: cfg.bucket,
        Key: cfg.historyJsonKey,
      }),
    );
  } catch (e) {
    const name =
      e !== null && typeof e === "object" && "name" in e
        ? String((e as { name: unknown }).name)
        : "";
    if (name === "NoSuchKey" || String(e).includes("does not exist")) {
      throw new Error(
        `No JSON in R2 at ${cfg.bucket}/${cfg.historyJsonKey}. Click Update data first.`,
      );
    }
    throw e;
  }

  const stream = readableFromGetObjectBody(out.Body);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function getHistoryJsonFromRemote(): Promise<PricePoint[]> {
  const raw = await fetchHistoryJsonText();
  return parsePriceDocument(JSON.parse(raw) as unknown, "remote-history.json");
}

export async function uploadPublicHistoryJsonToR2(): Promise<{
  bucket: string;
  key: string;
  bytes: number;
} | null> {
  if (!isR2WriteEnabled() || !(await publicHistoryJsonExists())) {
    return null;
  }
  return uploadHistoryJson(getPublicHistoryJsonPath());
}
