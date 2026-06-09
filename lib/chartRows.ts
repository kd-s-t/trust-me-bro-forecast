import { formatChartTimeLabel } from "@/lib/chart/formatChartTime";
import {
  type ChartHistoryView,
  chartViewIsIntraday,
  chartViewShowsForecast,
} from "@/lib/chart/historyView";
import type { PricePoint } from "./history";
import type { UtcDayRangeMs } from "./timeRange";

export type ChartRow = {
  timeMs: number;
  label: string;
  observed: number | null;
  forecast: number | null;
  forecastNote: string | null;
  aiForecast: number | null;
  aiForecastNote: string | null;
  btcAmount: number;
};

/** Plot saved forecast points as-is — no trimming or live re-anchor. */
function mergeForecastPoints(
  rows: ChartRow[],
  forecast: PricePoint[],
  labelAt: (timeMs: number) => string,
): void {
  for (let i = 0; i < forecast.length; i++) {
    const p = forecast[i]!;
    const idx = rows.findIndex((r) => r.timeMs === p.timeMs);
    if (idx >= 0) {
      rows[idx] = {
        ...rows[idx]!,
        forecast: p.price,
        forecastNote: p.note ?? null,
      };
    } else {
      rows.push({
        timeMs: p.timeMs,
        label: labelAt(p.timeMs),
        observed: null,
        forecast: p.price,
        forecastNote: p.note ?? null,
        aiForecast: null,
        aiForecastNote: null,
        btcAmount: p.amount,
      });
    }
  }
  rows.sort((a, b) => a.timeMs - b.timeMs);
}

export function buildChartRows(
  observed: PricePoint[],
  forecast: PricePoint[],
  aiSeries?: PricePoint[],
  aiViewRange?: UtcDayRangeMs,
  historyView: ChartHistoryView = "1d",
): ChartRow[] {
  const intraday = chartViewIsIntraday(historyView);
  const showForecasts = chartViewShowsForecast(historyView);
  const labelAt = (timeMs: number): string =>
    formatChartTimeLabel(timeMs, intraday);
  const rows: ChartRow[] = [];
  if (observed.length === 0) {
    if (!showForecasts) {
      return rows;
    }
    for (let i = 0; i < forecast.length; i++) {
      const p = forecast[i]!;
      rows.push({
        timeMs: p.timeMs,
        label: labelAt(p.timeMs),
        observed: null,
        forecast: p.price,
        forecastNote: p.note ?? null,
        aiForecast: null,
        aiForecastNote: null,
        btcAmount: p.amount,
      });
    }
    appendAiTail(rows, aiSeries, aiViewRange, intraday);
    return rows;
  }
  for (let i = 0; i < observed.length - 1; i++) {
    const p = observed[i]!;
    rows.push({
      timeMs: p.timeMs,
      label: labelAt(p.timeMs),
      observed: p.price,
      forecast: null,
      forecastNote: null,
      aiForecast: null,
      aiForecastNote: null,
      btcAmount: p.amount,
    });
  }
  const lastObs = observed[observed.length - 1]!;
  rows.push({
    timeMs: lastObs.timeMs,
    label: labelAt(lastObs.timeMs),
    observed: lastObs.price,
    forecast: null,
    forecastNote: null,
    aiForecast: null,
    aiForecastNote: null,
    btcAmount: lastObs.amount,
  });
  if (showForecasts) {
    mergeForecastPoints(rows, forecast, labelAt);
    appendAiTail(rows, aiSeries, aiViewRange, intraday);
  }
  return rows;
}

function appendAiTail(
  rows: ChartRow[],
  aiSeries: PricePoint[] | undefined,
  aiViewRange: UtcDayRangeMs | undefined,
  intraday: boolean,
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
      label: formatChartTimeLabel(p.timeMs, intraday),
      observed: null,
      forecast: null,
      forecastNote: null,
      aiForecast: p.price,
      aiForecastNote: p.note ?? null,
      btcAmount: p.amount,
    });
  }
}
