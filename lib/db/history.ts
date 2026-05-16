import type { PricePoint } from "../history";
import { chartHistoryCap } from "../chartSample";
import { getSql } from "./sql";

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
  return points;
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
