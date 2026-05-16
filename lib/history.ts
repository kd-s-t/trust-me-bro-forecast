export type PricePoint = {
  timeMs: number;
  price: number;
  amount: number;
  /** Optional tooltip copy (forecast JSON). */
  note?: string;
};

function isPricePoint(v: unknown): v is { time: number; price: number } {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.time === "number" && typeof o.price === "number";
}

function readOptionalNote(
  row: Record<string, unknown>,
  source: string,
  index: number,
): string | undefined {
  if (!("note" in row)) {
    return undefined;
  }
  const n = row.note;
  if (typeof n !== "string") {
    throw new Error(`${source}: note must be a string at index ${String(index)}`);
  }
  const trimmed = n.trim();
  return trimmed === "" ? undefined : trimmed;
}

function readBtcAmount(row: Record<string, unknown>, source: string, index: number): number {
  if (!("amount" in row)) {
    return 1;
  }
  const a = row.amount;
  if (typeof a !== "number" || !Number.isFinite(a) || a <= 0) {
    throw new Error(`${source}: invalid amount at index ${String(index)}`);
  }
  return a;
}

/** Parse forecast JSON: `[{ time, price }, ...]` or `{ points: [...] }`. */
export function parsePriceDocument(raw: unknown, source: string): PricePoint[] {
  let list: unknown[];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (
    typeof raw === "object" &&
    raw !== null &&
    Array.isArray((raw as { points: unknown }).points)
  ) {
    list = (raw as { points: unknown[] }).points;
  } else {
    throw new Error(
      `${source}: JSON must be an array of points or { points: [...] }`,
    );
  }
  const out: PricePoint[] = [];
  for (let i = 0; i < list.length; i++) {
    const row = list[i];
    if (!isPricePoint(row)) {
      throw new Error(`${source}: invalid row at index ${i}`);
    }
    const o = row as unknown as Record<string, unknown>;
    const amount = readBtcAmount(o, source, i);
    const note = readOptionalNote(o, source, i);
    out.push({ timeMs: row.time, price: row.price, amount, note });
  }
  return out;
}
