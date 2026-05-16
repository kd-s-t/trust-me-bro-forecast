import { createReadStream, createWriteStream, statSync } from "node:fs";
import { createInterface } from "node:readline";
import { pipeline } from "node:stream/promises";
import { parse } from "csv-parse";
import type { Readable } from "node:stream";
import type { CentralDirectory } from "unzipper";
import unzipper from "unzipper";
import { normalizeTimeMs } from "@/lib/timeMs";
import { CSV_NAME_SUBSTRING } from "./constants";

export type KaggleCsvRow = {
  timeMs: number;
  price: number;
};

const TAIL_BYTE_OVERLAP = 8192;

function headerMap(fieldnames: string[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const n of fieldnames) {
    m.set(n.toLowerCase().trim(), n);
  }
  return m;
}

function columnTime(h: Map<string, string>): string {
  for (const key of ["timestamp", "unix time", "time"] as const) {
    const orig = h.get(key);
    if (orig !== undefined) return orig;
  }
  throw new Error(
    `No time column; need Timestamp. Got: ${[...h.keys()].sort().join(", ")}`,
  );
}

function columnPrice(h: Map<string, string>): string {
  for (const key of ["close", "weighted price", "weighted_price"] as const) {
    const orig = h.get(key);
    if (orig !== undefined) return orig;
  }
  throw new Error(
    `No price column; need Close or Weighted Price. Got: ${[...h.keys()].sort().join(", ")}`,
  );
}

export function parseTimeMs(raw: string): number {
  const v = Number(raw);
  if (!Number.isFinite(v) || v !== Math.floor(v)) {
    throw new Error(`Non-integer time value: ${JSON.stringify(raw)}`);
  }
  return normalizeTimeMs(v);
}

function pickCsv(
  files: CentralDirectory["files"],
  nameSubstring: string,
): CentralDirectory["files"][number] {
  const needle = nameSubstring.toLowerCase();
  const csvs = files.filter(
    (e) =>
      e.type === "File" &&
      /\.csv$/i.test(e.path) &&
      e.path.toLowerCase().includes(needle),
  );
  if (csvs.length === 0) {
    const all = files
      .filter((e) => e.type === "File" && /\.csv$/i.test(e.path))
      .map((e) => e.path)
      .slice(0, 25);
    throw new Error(
      `No CSV matching ${JSON.stringify(nameSubstring)}. Sample paths: ${all.join(", ")}`,
    );
  }
  return csvs.reduce((a, b) =>
    a.uncompressedSize >= b.uncompressedSize ? a : b,
  );
}

async function readHeaderColumns(csvPath: string): Promise<string[]> {
  const input = createReadStream(csvPath, { encoding: "utf8" });
  const rl = createInterface({ input, crlfDelay: Infinity });
  try {
    for await (const line of rl) {
      const trimmed = line.trim();
      if (trimmed.length === 0) {
        continue;
      }
      return new Promise((resolve, reject) => {
        parse(trimmed, { delimiter: ",", relax_quotes: true }, (err, rows) => {
          if (err !== undefined) {
            reject(err);
            return;
          }
          const header = rows[0];
          if (!Array.isArray(header) || header.length === 0) {
            reject(new Error("Could not parse CSV header"));
            return;
          }
          resolve(header.map((c) => String(c)));
        });
      });
    }
    throw new Error("CSV file has no header row");
  } finally {
    input.destroy();
  }
}

export async function extractBtcCsvFromZip(
  zipPath: string,
  destPath: string,
): Promise<{ innerPath: string; size: number }> {
  const directory = await unzipper.Open.file(zipPath);
  const picked = pickCsv(directory.files, CSV_NAME_SUBSTRING);
  await pipeline(picked.stream(), createWriteStream(destPath));
  return { innerPath: picked.path, size: statSync(destPath).size };
}

export type StreamBtcCsvFileOptions = {
  /** Read from this byte offset (tail sync when Kaggle appends to the CSV). */
  fromByte?: number;
};

export type BtcCsvRowHandler = (
  row: KaggleCsvRow,
) => void | false | Promise<void | false>;

export async function streamBtcCsv(
  source: Readable,
  onRow: BtcCsvRowHandler,
  columnNames?: string[],
): Promise<number> {
  const parser = parse({
    columns: columnNames ?? true,
    skip_empty_lines: true,
    relax_quotes: true,
  });
  source.pipe(parser);
  let tcol: string | undefined;
  let pcol: string | undefined;
  let count = 0;
  try {
    for await (const row of parser) {
      if (typeof row !== "object" || row === null) continue;
      const rec = row as Record<string, string>;
      if (tcol === undefined) {
        const h = headerMap(Object.keys(rec));
        tcol = columnTime(h);
        pcol = columnPrice(h);
      }
      const tRaw = rec[tcol];
      const pRaw = rec[pcol!];
      if (tRaw === undefined || pRaw === undefined || tRaw === "" || pRaw === "") {
        continue;
      }
      const price = Number(pRaw);
      if (!Number.isFinite(price)) {
        throw new Error(`Non-finite price: ${JSON.stringify(pRaw)}`);
      }
      let timeMs: number;
      try {
        timeMs = parseTimeMs(tRaw.trim());
      } catch {
        continue;
      }
      const keepGoing = await onRow({ timeMs, price });
      count++;
      if (keepGoing === false) {
        parser.destroy();
        break;
      }
    }
  } finally {
    source.destroy();
  }
  return count;
}

export async function streamBtcCsvFile(
  csvPath: string,
  onRow: BtcCsvRowHandler,
  options: StreamBtcCsvFileOptions = {},
): Promise<number> {
  const fromByte = options.fromByte ?? 0;
  if (fromByte <= 0) {
    const count = await streamBtcCsv(createReadStream(csvPath), onRow);
    if (count === 0) {
      throw new Error("No rows in Kaggle CSV");
    }
    return count;
  }

  const headerColumns = await readHeaderColumns(csvPath);
  const readFrom = Math.max(0, fromByte - TAIL_BYTE_OVERLAP);
  const count = await streamBtcCsv(
    createReadStream(csvPath, { start: readFrom }),
    onRow,
    headerColumns,
  );
  if (count === 0) {
    throw new Error("No rows parsed from CSV tail");
  }
  return count;
}

export async function streamBtcCsvFromZip(
  zipPath: string,
  onRow: BtcCsvRowHandler,
): Promise<{ rowCount: number; csvPath: string }> {
  const directory = await unzipper.Open.file(zipPath);
  const picked = pickCsv(directory.files, CSV_NAME_SUBSTRING);
  const rowCount = await streamBtcCsv(picked.stream(), onRow);
  if (rowCount === 0) {
    throw new Error("No rows in Kaggle CSV");
  }
  return { rowCount, csvPath: picked.path };
}
