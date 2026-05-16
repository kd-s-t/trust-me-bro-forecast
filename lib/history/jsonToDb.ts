import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { getSql } from "@/lib/db/sql";

const BATCH = 5_000;

export async function replaceSymbolHistoryFromJson(
  symbol: string,
  jsonPath: string,
  onProgress?: (inserted: number, scanned: number) => Promise<void>,
): Promise<{ inserted: number; scanned: number }> {
  const sql = getSql();

  await sql`
    DELETE FROM history
    WHERE symbol = ${symbol}
  `;

  let batch: { timeMs: number; price: number }[] = [];
  let inserted = 0;
  let scanned = 0;

  const flush = async (): Promise<void> => {
    if (batch.length === 0) {
      return;
    }
    await sql`
      INSERT INTO history ${sql(
        batch.map((p) => ({
          symbol,
          time_ms: p.timeMs,
          price: p.price,
          amount: 1,
        })),
      )}
    `;
    inserted += batch.length;
    batch = [];
    if (inserted > 0 && inserted % 100_000 === 0) {
      await onProgress?.(inserted, scanned);
    }
  };

  const rl = createInterface({
    input: createReadStream(jsonPath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const t = line.trim();
    if (!t.startsWith('{"time":')) {
      continue;
    }
    const json = t.endsWith(",") ? t.slice(0, -1) : t;
    let row: { time: number; price: number };
    try {
      row = JSON.parse(json) as { time: number; price: number };
    } catch {
      continue;
    }
    if (!Number.isFinite(row.time) || !Number.isFinite(row.price)) {
      continue;
    }
    scanned++;
    batch.push({ timeMs: row.time, price: row.price });
    if (batch.length >= BATCH) {
      await flush();
    }
  }

  await flush();
  await onProgress?.(inserted, scanned);
  return { inserted, scanned };
}
