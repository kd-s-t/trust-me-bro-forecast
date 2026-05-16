import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { KAGGLE_DATASET, KAGGLE_OWNER } from "./constants";
import { kaggleAuthHeaders } from "./headers";

export async function downloadDatasetZip(destPath: string): Promise<void> {
  const url = `https://www.kaggle.com/api/v1/datasets/download/${KAGGLE_OWNER}/${KAGGLE_DATASET}`;
  const res = await fetch(url, { headers: kaggleAuthHeaders() });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Kaggle download failed ${res.status}: ${errText.slice(0, 500)}`);
  }
  if (!res.body) {
    throw new Error("Kaggle response had no body");
  }
  const nodeBody = Readable.fromWeb(res.body as import("stream/web").ReadableStream);
  await pipeline(nodeBody, createWriteStream(destPath));
}
