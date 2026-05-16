import { createWriteStream } from "node:fs";
import { stat } from "node:fs/promises";
import { once } from "node:events";
import { finished } from "node:stream/promises";
import { streamBtcCsvFile } from "@/lib/kaggle/csv";

/** Stream Kaggle CSV → `{ "points": [ …every row… ] }` without loading all rows in RAM. */
export async function writeFullHistoryJsonFromCsv(
  csvPath: string,
  destPath: string,
): Promise<{ bytes: number; rows: number; lastTimeMs: number | null }> {
  const ws = createWriteStream(destPath, { encoding: "utf8" });
  let rows = 0;
  let lastTimeMs: number | null = null;
  let drainWait: Promise<void> | null = null;

  const writeChunk = async (chunk: string): Promise<void> => {
    if (!ws.write(chunk)) {
      drainWait ??= once(ws, "drain").then(() => {
        drainWait = null;
      });
      await drainWait;
    }
  };

  await writeChunk('{\n  "points": [\n');
  let first = true;
  await streamBtcCsvFile(csvPath, async (row) => {
    rows++;
    lastTimeMs = row.timeMs;
    const point = JSON.stringify({
      time: row.timeMs,
      price: row.price,
      amount: 1,
    });
    await writeChunk(first ? `    ${point}` : `,\n    ${point}`);
    first = false;
  });
  await writeChunk("\n  ]\n}\n");
  ws.end();
  await finished(ws);

  const { size } = await stat(destPath);
  return { bytes: size, rows, lastTimeMs };
}
