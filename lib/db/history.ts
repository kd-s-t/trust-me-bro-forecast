import type { PricePoint } from "../history";
import { DISPLAY_POINT_CAP } from "../chartSample";
import { runMigrations } from "./migrate";
import { getSql } from "./sql";

export const DEFAULT_HISTORY_SYMBOL = "BTC";

type PriceRow = {
  time_ms: string | number;
  price: number;
  amount: number;
};

export async function loadHistoryFromDb(
  symbol: string,
  cap: number = DISPLAY_POINT_CAP,
): Promise<PricePoint[]> {
  await runMigrations();
  const sql = getSql();
  const rows = (await sql`
    SELECT DISTINCT ON (bucket)
      time_ms,
      price,
      amount
    FROM (
      SELECT
        time_ms,
        price,
        amount,
        NTILE(${cap}) OVER (ORDER BY time_ms) AS bucket
      FROM price_points
      WHERE symbol = ${symbol}
    ) AS buckets
    ORDER BY bucket, time_ms
  `) as PriceRow[];

  if (rows.length === 0) {
    throw new Error(
      `No price data yet for ${JSON.stringify(symbol)}. Click Update data to import from Kaggle.`,
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
  points.sort((a, b) => a.timeMs - b.timeMs);
  return points;
}

export async function countHistoryPoints(symbol: string): Promise<number> {
  const sql = getSql();
  const rows = (await sql`
    SELECT COUNT(*)::text AS count
    FROM price_points
    WHERE symbol = ${symbol}
  `) as { count: string }[];
  return Number(rows[0]?.count ?? "0");
}
