import type { ChartRow } from "@/lib/chartRows";

function utcSecond(ms: number): number {
  return Math.floor(ms / 1000);
}

/** Update the last observed (history) candle close with a live ticker price. */
export function patchChartRowsLivePrice(
  rows: ChartRow[],
  price: number,
): ChartRow[] {
  if (!Number.isFinite(price) || price <= 0 || rows.length === 0) {
    return rows;
  }
  let lastObsIdx = -1;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i]!.observed !== null) {
      lastObsIdx = i;
      break;
    }
  }
  if (lastObsIdx < 0) {
    return rows;
  }
  const next = rows.slice();
  const row = next[lastObsIdx]!;
  next[lastObsIdx] = { ...row, observed: price };
  return next;
}

/** After a DB tick sync — update last candle or append a new observed point. */
export function upsertObservedLivePoint(
  rows: ChartRow[],
  timeMs: number,
  price: number,
): ChartRow[] {
  if (!Number.isFinite(price) || price <= 0 || rows.length === 0) {
    return rows;
  }
  let lastObsIdx = -1;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i]!.observed !== null) {
      lastObsIdx = i;
      break;
    }
  }
  if (lastObsIdx < 0) {
    return rows;
  }
  const last = rows[lastObsIdx]!;
  if (utcSecond(timeMs) <= utcSecond(last.timeMs)) {
    return patchChartRowsLivePrice(rows, price);
  }
  const next = rows.slice();
  next.splice(lastObsIdx + 1, 0, {
    timeMs,
    label: new Date(timeMs).toISOString().slice(0, 10),
    observed: price,
    forecast: null,
    forecastNote: null,
    aiForecast: null,
    aiForecastNote: null,
    btcAmount: 1,
  });
  return next;
}
