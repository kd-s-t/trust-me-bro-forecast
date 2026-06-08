import { BET_PURCHASE_UTC_DAY } from "@/lib/chartBetMarker";
import type { PricePoint } from "../history";
import { chartHistoryCap } from "../chartSample";
import { getSql } from "./sql";

const DAY_MS = 86_400_000;

function utcDayFromTimeMs(timeMs: number): string {
  return new Date(timeMs).toISOString().slice(0, 10);
}

function parseUtcDayStartMs(day: string): number {
  const [y, mo, d] = day.split("-").map(Number);
  return Date.UTC(y!, mo! - 1, d!);
}

function mergeBetDayIfPresent(
  points: PricePoint[],
  betDay: PricePoint,
): PricePoint[] {
  const betUtcDay = utcDayFromTimeMs(betDay.timeMs);
  for (let i = 0; i < points.length; i++) {
    if (utcDayFromTimeMs(points[i]!.timeMs) === betUtcDay) {
      return points;
    }
  }
  const merged = [...points, betDay];
  merged.sort((a, b) => a.timeMs - b.timeMs);
  return merged;
}

export const DEFAULT_HISTORY_SYMBOL = "BTC";

type PriceRow = {
  time_ms: string | number;
  price: number;
  amount: number;
};

/** Indexed time-bucket sampling — avoids NTILE full table scans on millions of rows. */
export async function loadHistoryFromDb(
  symbol: string,
  cap: number = chartHistoryCap(),
): Promise<PricePoint[]> {
  const sql = getSql();
  const boundsRows = (await sql`
    SELECT
      MIN(time_ms)::bigint AS min_ms,
      MAX(time_ms)::bigint AS max_ms
    FROM history
    WHERE symbol = ${symbol}
  `) as { min_ms: string | null; max_ms: string | null }[];

  const bounds = boundsRows[0];
  if (bounds?.min_ms == null || bounds?.max_ms == null) {
    throw new Error(
      `No price data yet for ${JSON.stringify(symbol)}. Click Update history to import from Kaggle.`,
    );
  }

  const slotCount = Math.max(1, cap);
  const rows = (await sql`
    WITH bounds AS (
      SELECT
        ${Number(bounds.min_ms)}::bigint AS min_ms,
        ${Number(bounds.max_ms)}::bigint AS max_ms
    ),
    slots AS (
      SELECT generate_series(0, ${slotCount - 1})::int AS i
    )
    SELECT h.time_ms, h.price, h.amount
    FROM slots s
    CROSS JOIN bounds b
    CROSS JOIN LATERAL (
      SELECT time_ms, price, amount
      FROM history
      WHERE symbol = ${symbol}
        AND time_ms >= CASE
          WHEN ${slotCount} <= 1 OR b.max_ms <= b.min_ms THEN b.min_ms
          ELSE (
            b.min_ms + FLOOR(
              (b.max_ms - b.min_ms)::numeric * s.i / GREATEST(${slotCount - 1}, 1)::numeric
            )::bigint
          )
        END
      ORDER BY time_ms ASC
      LIMIT 1
    ) h
    ORDER BY s.i
  `) as PriceRow[];

  if (rows.length === 0) {
    throw new Error(
      `No price data yet for ${JSON.stringify(symbol)}. Click Update history to import from Kaggle.`,
    );
  }

  const points: PricePoint[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    const timeMs = Number(r.time_ms);
    if (!Number.isFinite(timeMs)) {
      throw new Error(`Invalid time_ms at row ${String(i)}`);
    }
    points.push({
      timeMs,
      price: r.price,
      amount: r.amount,
    });
  }

  const betDay = await loadUtcDayFromDb(sql, symbol, BET_PURCHASE_UTC_DAY);
  if (betDay !== null) {
    return mergeBetDayIfPresent(points, betDay);
  }
  return points;
}

async function loadUtcDayFromDb(
  sql: ReturnType<typeof getSql>,
  symbol: string,
  utcDay: string,
): Promise<PricePoint | null> {
  const startMs = parseUtcDayStartMs(utcDay);
  const endMs = startMs + DAY_MS;
  const rows = (await sql`
    SELECT time_ms, price, amount
    FROM history
    WHERE symbol = ${symbol}
      AND time_ms >= ${startMs}
      AND time_ms < ${endMs}
    ORDER BY time_ms ASC
    LIMIT 1
  `) as PriceRow[];
  const r = rows[0];
  if (r === undefined) {
    return null;
  }
  const timeMs = Number(r.time_ms);
  if (!Number.isFinite(timeMs)) {
    return null;
  }
  return { timeMs, price: r.price, amount: r.amount };
}

export async function getLatestSpot(
  symbol: string,
): Promise<{ timeMs: number; price: number }> {
  const sql = getSql();
  const rows = (await sql`
    SELECT time_ms, price
    FROM history
    WHERE symbol = ${symbol}
    ORDER BY time_ms DESC
    LIMIT 1
  `) as { time_ms: string | number; price: number }[];
  const r = rows[0];
  if (r === undefined) {
    throw new Error(
      `No price data yet for ${JSON.stringify(symbol)}. Click Update history first.`,
    );
  }
  return { timeMs: Number(r.time_ms), price: r.price };
}

const UPSERT_BATCH = 200;

/** All points in a time window (no sampling — for 24h intraday view). */
export async function loadHistoryRangeFromDb(
  symbol: string,
  startMs: number,
  endMs: number,
): Promise<PricePoint[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT time_ms, price, amount
    FROM history
    WHERE symbol = ${symbol}
      AND time_ms >= ${startMs}
      AND time_ms <= ${endMs}
    ORDER BY time_ms ASC
  `) as PriceRow[];

  const points: PricePoint[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    const timeMs = Number(r.time_ms);
    if (!Number.isFinite(timeMs)) {
      continue;
    }
    points.push({
      timeMs,
      price: r.price,
      amount: r.amount,
    });
  }
  return points;
}

/** Upsert Binance (or other) tail rows; does not delete existing history. */
export async function upsertHistoryPoints(
  symbol: string,
  points: PricePoint[],
): Promise<number> {
  if (points.length === 0) {
    return 0;
  }
  const sql = getSql();
  let upserted = 0;
  for (let i = 0; i < points.length; i += UPSERT_BATCH) {
    const chunk = points.slice(i, i + UPSERT_BATCH);
    await sql`
      INSERT INTO history ${sql(
        chunk.map((p) => ({
          symbol,
          time_ms: p.timeMs,
          price: p.price,
          amount: p.amount,
        })),
      )}
      ON CONFLICT (symbol, time_ms) DO UPDATE SET
        price = EXCLUDED.price,
        amount = EXCLUDED.amount
    `;
    upserted += chunk.length;
  }
  return upserted;
}

/** Exact count — slow on large tables. */
export async function countHistoryPoints(symbol: string): Promise<number> {
  const sql = getSql();
  const rows = (await sql`
    SELECT COUNT(*)::text AS count
    FROM history
    WHERE symbol = ${symbol}
  `) as { count: string }[];
  return Number(rows[0]?.count ?? "0");
}
