import type { PricePoint } from "./history";
import type { UtcDayRangeMs } from "./timeRange";

export type ChartRow = {
  timeMs: number;
  label: string;
  observed: number | null;
  forecast: number | null;
  forecastNote: string | null;
  aiForecast: number | null;
  btcAmount: number;
};

export function buildChartRows(
  observed: PricePoint[],
  forecast: PricePoint[],
  aiSeries?: PricePoint[],
  aiViewRange?: UtcDayRangeMs,
): ChartRow[] {
  const rows: ChartRow[] = [];
  if (observed.length === 0) {
    for (let i = 0; i < forecast.length; i++) {
      const p = forecast[i]!;
      rows.push({
        timeMs: p.timeMs,
        label: new Date(p.timeMs).toISOString().slice(0, 10),
        observed: null,
        forecast: p.price,
        forecastNote: p.note ?? null,
        aiForecast: null,
        btcAmount: p.amount,
      });
    }
    appendAiTail(rows, aiSeries, aiViewRange);
    return rows;
  }
  for (let i = 0; i < observed.length - 1; i++) {
    const p = observed[i]!;
    rows.push({
      timeMs: p.timeMs,
      label: new Date(p.timeMs).toISOString().slice(0, 10),
      observed: p.price,
      forecast: null,
      forecastNote: null,
      aiForecast: null,
      btcAmount: p.amount,
    });
  }
  const lastObs = observed[observed.length - 1]!;
  rows.push({
    timeMs: lastObs.timeMs,
    label: new Date(lastObs.timeMs).toISOString().slice(0, 10),
    observed: lastObs.price,
    forecast: null,
    forecastNote: null,
    aiForecast: null,
    btcAmount: lastObs.amount,
  });
  if (forecast.length > 0) {
    for (let i = 0; i < forecast.length; i++) {
      const p = forecast[i]!;
      rows.push({
        timeMs: p.timeMs,
        label: new Date(p.timeMs).toISOString().slice(0, 10),
        observed: null,
        forecast: p.price,
        forecastNote: p.note ?? null,
        aiForecast: null,
        btcAmount: p.amount,
      });
    }
  }
  appendAiTail(rows, aiSeries, aiViewRange);
  return rows;
}

function appendAiTail(
  rows: ChartRow[],
  aiSeries: PricePoint[] | undefined,
  aiViewRange: UtcDayRangeMs | undefined,
): void {
  if (aiSeries === undefined || aiSeries.length === 0) {
    return;
  }
  const lastIdx = rows.length - 1;
  if (lastIdx < 0) {
    return;
  }
  const lastTs = rows[lastIdx]!.timeMs;
  let tail = aiSeries.filter((p) => p.timeMs > lastTs);
  if (aiViewRange !== undefined) {
    tail = tail.filter(
      (p) =>
        p.timeMs >= aiViewRange.startMsInclusive &&
        p.timeMs <= aiViewRange.endMsInclusive,
    );
  }
  tail.sort((a, b) => a.timeMs - b.timeMs);
  for (let i = 0; i < tail.length; i++) {
    const p = tail[i]!;
    rows.push({
      timeMs: p.timeMs,
      label: new Date(p.timeMs).toISOString().slice(0, 10),
      observed: null,
      forecast: null,
      forecastNote: null,
      aiForecast: p.price,
      btcAmount: p.amount,
    });
  }
}
