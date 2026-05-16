const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

export type ForecastHorizon = "1m" | "3m" | "6m" | "9m" | "1y";

export const FORECAST_HORIZONS: readonly ForecastHorizon[] = [
  "1m",
  "3m",
  "6m",
  "9m",
  "1y",
] as const;

export const HORIZON_LABELS: Record<ForecastHorizon, string> = {
  "1m": "1 month",
  "3m": "3 months",
  "6m": "6 months",
  "9m": "9 months",
  "1y": "1 year",
};

const HORIZON_DAYS: Record<ForecastHorizon, number> = {
  "1m": 30,
  "3m": 91,
  "6m": 182,
  "9m": 273,
  "1y": 365,
};

export function isForecastHorizon(v: string): v is ForecastHorizon {
  return (FORECAST_HORIZONS as readonly string[]).includes(v);
}

export function horizonEndMs(startMs: number, horizon: ForecastHorizon): number {
  return startMs + HORIZON_DAYS[horizon] * DAY_MS;
}

/** Weekly timestamps from start (exclusive) through end (inclusive). */
export function weeklyTimestamps(
  startMs: number,
  endMs: number,
): number[] {
  const out: number[] = [];
  let t = startMs + WEEK_MS;
  while (t <= endMs) {
    out.push(t);
    t += WEEK_MS;
  }
  if (out.length === 0 || out[out.length - 1]! < endMs) {
    out.push(endMs);
  }
  return out;
}

export function formatHorizonLabel(horizon: ForecastHorizon): string {
  return HORIZON_LABELS[horizon];
}
