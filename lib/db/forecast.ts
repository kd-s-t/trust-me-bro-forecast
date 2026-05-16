import { randomUUID } from "node:crypto";
import type { PricePoint } from "@/lib/history";
import type { ForecastHorizon } from "@/lib/forecast/horizons";
import type { NewsArticle } from "@/lib/news/types";
import { getSql } from "./sql";

export type ForecastRun = {
  id: string;
  username: string;
  symbol: string;
  horizon: ForecastHorizon;
  startTimeMs: number;
  endTimeMs: number;
  startPrice: number;
  analysis: string;
  newsArticles: NewsArticle[];
  createdAt: string;
};

type ForecastRunRow = {
  id: string;
  username: string;
  symbol: string;
  horizon: string;
  start_time_ms: string | number;
  end_time_ms: string | number;
  start_price: number;
  analysis: string;
  news_payload: NewsArticle[] | unknown;
  created_at: Date | string;
};

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function rowToRun(r: ForecastRunRow): ForecastRun {
  const news = Array.isArray(r.news_payload) ? r.news_payload : [];
  return {
    id: r.id,
    username: r.username,
    symbol: r.symbol,
    horizon: r.horizon as ForecastHorizon,
    startTimeMs: Number(r.start_time_ms),
    endTimeMs: Number(r.end_time_ms),
    startPrice: r.start_price,
    analysis: r.analysis,
    newsArticles: news as NewsArticle[],
    createdAt: new Date(r.created_at).toISOString(),
  };
}

export async function insertForecastRun(input: {
  username: string;
  symbol: string;
  horizon: ForecastHorizon;
  startTimeMs: number;
  endTimeMs: number;
  startPrice: number;
  analysis: string;
  newsArticles: NewsArticle[];
  points: PricePoint[];
}): Promise<ForecastRun> {
  const sql = getSql();
  const id = randomUUID();
  const user = normalizeUsername(input.username);

  await sql`
    INSERT INTO forecast_runs (
      id,
      username,
      symbol,
      horizon,
      start_time_ms,
      end_time_ms,
      start_price,
      analysis,
      news_payload
    ) VALUES (
      ${id},
      ${user},
      ${input.symbol},
      ${input.horizon},
      ${input.startTimeMs},
      ${input.endTimeMs},
      ${input.startPrice},
      ${input.analysis},
      ${sql.json(input.newsArticles)}
    )
  `;

  if (input.points.length > 0) {
    await sql`
      INSERT INTO forecast ${sql(
        input.points.map((p) => ({
          forecast_run_id: id,
          time_ms: p.timeMs,
          price: p.price,
        })),
      )}
    `;
  }

  const run = await getForecastRun(id, user);
  if (run === null) {
    throw new Error("Failed to read forecast run after insert");
  }
  return run;
}

export async function deleteForecastRun(
  id: string,
  username: string,
): Promise<boolean> {
  const sql = getSql();
  const user = normalizeUsername(username);
  const rows = (await sql`
    DELETE FROM forecast_runs
    WHERE id = ${id}
      AND username = ${user}
    RETURNING id
  `) as { id: string }[];
  return rows.length > 0;
}

export async function getForecastRun(
  id: string,
  username: string,
): Promise<ForecastRun | null> {
  const sql = getSql();
  const user = normalizeUsername(username);
  const rows = (await sql`
    SELECT *
    FROM forecast_runs
    WHERE id = ${id}
      AND username = ${user}
  `) as ForecastRunRow[];
  const r = rows[0];
  return r === undefined ? null : rowToRun(r);
}

export type ForecastRunSummary = {
  id: string;
  horizon: ForecastHorizon;
  analysis: string;
  createdAt: string;
};

export async function listForecastRuns(
  username: string,
  symbol: string,
): Promise<ForecastRunSummary[]> {
  const sql = getSql();
  const user = normalizeUsername(username);
  const rows = (await sql`
    SELECT id, horizon, analysis, created_at
    FROM forecast_runs
    WHERE username = ${user}
      AND symbol = ${symbol}
    ORDER BY created_at DESC
  `) as Pick<
    ForecastRunRow,
    "id" | "horizon" | "analysis" | "created_at"
  >[];

  return rows.map((r) => ({
    id: r.id,
    horizon: r.horizon as ForecastHorizon,
    analysis: r.analysis,
    createdAt: new Date(r.created_at).toISOString(),
  }));
}

export async function getLatestForecastRun(
  username: string,
  symbol: string,
): Promise<ForecastRun | null> {
  const sql = getSql();
  const user = normalizeUsername(username);
  const rows = (await sql`
    SELECT *
    FROM forecast_runs
    WHERE username = ${user}
      AND symbol = ${symbol}
    ORDER BY created_at DESC
    LIMIT 1
  `) as ForecastRunRow[];
  const r = rows[0];
  return r === undefined ? null : rowToRun(r);
}

async function loadForecastPointsForRun(
  run: ForecastRun,
): Promise<PricePoint[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT time_ms, price
    FROM forecast
    WHERE forecast_run_id = ${run.id}
    ORDER BY time_ms ASC
  `) as { time_ms: string | number; price: number }[];

  return rows.map((r, i) => ({
    timeMs: Number(r.time_ms),
    price: r.price,
    amount: 1,
    note: i === rows.length - 1 ? run.analysis : undefined,
  }));
}

export async function loadForecastPointsByRunId(
  runId: string,
  username: string,
): Promise<{ run: ForecastRun; points: PricePoint[] } | null> {
  const run = await getForecastRun(runId, username);
  if (run === null) {
    return null;
  }
  const points = await loadForecastPointsForRun(run);
  return { run, points };
}

export async function loadLatestForecastPoints(
  username: string,
  symbol: string,
): Promise<{ run: ForecastRun; points: PricePoint[] } | null> {
  const run = await getLatestForecastRun(username, symbol);
  if (run === null) {
    return null;
  }
  const points = await loadForecastPointsForRun(run);
  return { run, points };
}
