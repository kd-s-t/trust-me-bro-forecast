"use client";

import { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  LineSeries,
  createChart,
  LineStyle,
  type BusinessDay,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type MouseEventParams,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import { motion } from "framer-motion";
import type { ChartRow } from "@/lib/chartRows";
import { candlesFromClosePrices } from "@/lib/candleFromPrices";
import { defaultVisibleWindowMs } from "@/lib/timeRange";

export type { ChartRow };

type Props = {
  rows: ChartRow[];
  forecastInsightLabel?: string | null;
};

/** TradingView lightweight-charts demo palette */
const CANDLE_UP = "#26a69a";
const CANDLE_DOWN = "#ef5350";
const FORECAST_COLOR = "#2563eb";
const AI_FORECAST_COLOR = "#7c3aed";

const nfCompact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2,
});

const nfUsd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

type ChartTooltipState = {
  visible: boolean;
  x: number;
  y: number;
  date: string;
  observed: number | null;
  forecast: number | null;
  forecastNote: string | null;
  aiForecast: number | null;
  aiForecastNote: string | null;
  open: number | null;
  high: number | null;
  low: number | null;
};

const TOOLTIP_MARGIN = 12;
const TOOLTIP_WIDTH_EST = 280;
const TOOLTIP_HEIGHT_EST = 160;

function formatUsd(price: number): string {
  return nfUsd.format(price);
}

function rowAtTimeMs(rows: ChartRow[], timeMs: number): ChartRow | undefined {
  let best: ChartRow | undefined;
  let bestDelta = Infinity;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    const delta = Math.abs(r.timeMs - timeMs);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = r;
    }
  }
  if (best === undefined || bestDelta > 86_400_000) {
    return undefined;
  }
  return best;
}

function tooltipFromCrosshair(
  param: MouseEventParams<Time>,
  history: ISeriesApi<"Candlestick", Time>,
  forecast: ISeriesApi<"Line", Time>,
  aiForecast: ISeriesApi<"Line", Time> | null,
  rows: ChartRow[],
): ChartTooltipState | null {
  if (param.point === undefined || param.time === undefined) {
    return null;
  }
  const { x, y } = param.point;
  if (x < 0 || y < 0) {
    return null;
  }

  const timeMs = timeToMs(param.time);
  const row = rowAtTimeMs(rows, timeMs);
  const candle = param.seriesData.get(history) as CandlestickData<Time> | undefined;
  const forecastPoint = param.seriesData.get(forecast) as
    | LineData<Time>
    | undefined;
  const aiPoint =
    aiForecast !== null
      ? (param.seriesData.get(aiForecast) as LineData<Time> | undefined)
      : undefined;

  const observed =
    candle?.close ?? row?.observed ?? null;
  const forecastPrice =
    forecastPoint?.value ?? row?.forecast ?? null;
  const aiPrice = aiPoint?.value ?? row?.aiForecast ?? null;

  if (observed === null && forecastPrice === null && aiPrice === null) {
    return null;
  }

  return {
    visible: true,
    x,
    y,
    date: row?.label ?? new Date(timeMs).toISOString().slice(0, 10),
    observed,
    forecast: forecastPrice,
    forecastNote: row?.forecastNote ?? null,
    aiForecast: aiPrice,
    aiForecastNote: row?.aiForecastNote ?? null,
    open: candle?.open ?? null,
    high: candle?.high ?? null,
    low: candle?.low ?? null,
  };
}

function placeTooltip(
  point: { x: number; y: number },
  containerWidth: number,
  containerHeight: number,
): { left: number; top: number } {
  let left = point.x + TOOLTIP_MARGIN;
  let top = point.y + TOOLTIP_MARGIN;
  if (left + TOOLTIP_WIDTH_EST > containerWidth) {
    left = point.x - TOOLTIP_MARGIN - TOOLTIP_WIDTH_EST;
  }
  if (top + TOOLTIP_HEIGHT_EST > containerHeight) {
    top = point.y - TOOLTIP_MARGIN - TOOLTIP_HEIGHT_EST;
  }
  return {
    left: Math.max(TOOLTIP_MARGIN, left),
    top: Math.max(TOOLTIP_MARGIN, top),
  };
}

function msToUtc(timeMs: number): UTCTimestamp {
  return (Math.floor(timeMs / 1000)) as UTCTimestamp;
}

function timeToMs(t: Time): number {
  if (typeof t === "number") {
    return Math.round(t * 1000);
  }
  if (typeof t === "string") {
    return new Date(t).getTime();
  }
  const bd = t as BusinessDay;
  return Date.UTC(bd.year, bd.month - 1, bd.day);
}

function sortLineAsc(data: LineData<Time>[]): LineData<Time>[] {
  return [...data].sort((a, b) => timeToMs(a.time) - timeToMs(b.time));
}

function applyDefaultVisibleRange(chart: IChartApi): void {
  const win = defaultVisibleWindowMs();
  chart.timeScale().setVisibleRange({
    from: msToUtc(win.startMsInclusive),
    to: msToUtc(win.endMsInclusive),
  });
}

function seriesDataFromRows(rows: ChartRow[]): {
  candles: CandlestickData<Time>[];
  forecast: LineData<Time>[];
  aiForecast: LineData<Time>[];
} {
  const closePoints: { timeMs: number; close: number }[] = [];
  const forecast: LineData<Time>[] = [];
  const aiForecast: LineData<Time>[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    if (r.observed !== null) {
      closePoints.push({ timeMs: r.timeMs, close: r.observed });
    }
    if (r.forecast !== null) {
      forecast.push({ time: msToUtc(r.timeMs), value: r.forecast });
    }
    if (r.aiForecast !== null) {
      aiForecast.push({ time: msToUtc(r.timeMs), value: r.aiForecast });
    }
  }

  const bridge = closePoints[closePoints.length - 1];
  if (bridge !== undefined) {
    if (forecast.length > 0 && timeToMs(forecast[0]!.time) > bridge.timeMs) {
      forecast.unshift({
        time: msToUtc(bridge.timeMs),
        value: bridge.close,
      });
    }
    if (aiForecast.length > 0 && timeToMs(aiForecast[0]!.time) > bridge.timeMs) {
      aiForecast.unshift({
        time: msToUtc(bridge.timeMs),
        value: bridge.close,
      });
    }
  }

  return {
    candles: candlesFromClosePrices(closePoints),
    forecast: sortLineAsc(forecast),
    aiForecast: sortLineAsc(aiForecast),
  };
}

function ChartTooltip({ tip }: { tip: ChartTooltipState }) {
  return (
    <motion.div
      className="pointer-events-none absolute z-10 max-w-[17rem] rounded-lg border border-border bg-card/95 px-3 py-2 text-xs shadow-md backdrop-blur-sm"
      style={{ left: tip.x, top: tip.y }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12 }}
    >
      <p className="mb-1.5 font-medium text-foreground">{tip.date}</p>
      {tip.observed !== null ? (
        <div className="space-y-0.5">
          <p className="font-semibold tabular-nums text-foreground">
            {formatUsd(tip.observed)}
          </p>
          {tip.open !== null && tip.high !== null && tip.low !== null ? (
            <p className="text-muted-foreground tabular-nums">
              O {formatUsd(tip.open)} · H {formatUsd(tip.high)} · L{" "}
              {formatUsd(tip.low)}
            </p>
          ) : null}
          <p className="text-[11px] text-muted-foreground">History</p>
        </div>
      ) : null}
      {tip.forecast !== null ? (
        <div
          className={
            tip.observed !== null
              ? "mt-1.5 border-t border-border pt-1.5"
              : undefined
          }
        >
          <p className="tabular-nums" style={{ color: FORECAST_COLOR }}>
            <span className="text-[11px] text-muted-foreground">Forecast </span>
            {formatUsd(tip.forecast)}
          </p>
          {tip.forecastNote !== null ? (
            <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
              {tip.forecastNote}
            </p>
          ) : null}
        </div>
      ) : null}
      {tip.aiForecast !== null ? (
        <div
          className={
            tip.observed !== null || tip.forecast !== null
              ? "mt-1.5 border-t border-border pt-1.5"
              : undefined
          }
        >
          <p className="tabular-nums" style={{ color: AI_FORECAST_COLOR }}>
            <span className="text-[11px] text-muted-foreground">
              News-adjusted{" "}
            </span>
            {formatUsd(tip.aiForecast)}
          </p>
          {tip.aiForecastNote !== null ? (
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              {tip.aiForecastNote}
            </p>
          ) : null}
        </div>
      ) : null}
    </motion.div>
  );
}

export function BtcChart({
  rows,
  forecastInsightLabel = null,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const historyRef = useRef<ISeriesApi<"Candlestick", Time> | null>(null);
  const forecastRef = useRef<ISeriesApi<"Line", Time> | null>(null);
  const aiForecastRef = useRef<ISeriesApi<"Line", Time> | null>(null);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const [tooltip, setTooltip] = useState<ChartTooltipState | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (el === null) {
      return;
    }

    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "#ffffff" },
        textColor: "#171717",
      },
      grid: {
        vertLines: { color: "#f0f0f0" },
        horzLines: { color: "#e5e5e5" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: "#e5e5e5",
        scaleMargins: { top: 0.08, bottom: 0.05 },
      },
      timeScale: {
        borderColor: "#e5e5e5",
        timeVisible: true,
        secondsVisible: false,
      },
      localization: {
        locale: "en-US",
        priceFormatter: (price: number) => `$${nfCompact.format(price)}`,
        timeFormatter: (t: Time) =>
          new Date(timeToMs(t)).toISOString().slice(0, 10),
      },
    });

    const history = chart.addSeries(CandlestickSeries, {
      upColor: CANDLE_UP,
      downColor: CANDLE_DOWN,
      borderVisible: false,
      wickUpColor: CANDLE_UP,
      wickDownColor: CANDLE_DOWN,
    });

    const forecast = chart.addSeries(LineSeries, {
      color: FORECAST_COLOR,
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const aiForecast = chart.addSeries(LineSeries, {
      color: AI_FORECAST_COLOR,
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    chartRef.current = chart;
    historyRef.current = history;
    forecastRef.current = forecast;
    aiForecastRef.current = aiForecast;

    const applyRows = (dataRows: ChartRow[]) => {
      if (dataRows.length === 0) {
        return;
      }
      const {
        candles,
        forecast: forecastData,
        aiForecast: aiData,
      } = seriesDataFromRows(dataRows);
      if (candles.length > 0) {
        history.setData(candles);
      }
      forecast.setData(forecastData);
      aiForecast.setData(aiData);
      applyDefaultVisibleRange(chart);
    };

    applyRows(rowsRef.current);

    const onCrosshairMove = (param: MouseEventParams<Time>) => {
      const wrap = wrapperRef.current;
      if (wrap === null) {
        return;
      }
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (
        param.point === undefined ||
        param.time === undefined ||
        param.point.x < 0 ||
        param.point.y < 0 ||
        param.point.x > w ||
        param.point.y > h
      ) {
        setTooltip(null);
        return;
      }
      const next = tooltipFromCrosshair(
        param,
        history,
        forecast,
        aiForecast,
        rowsRef.current,
      );
      if (next === null) {
        setTooltip(null);
        return;
      }
      const { left, top } = placeTooltip(param.point, w, h);
      setTooltip({ ...next, x: left, y: top });
    };

    chart.subscribeCrosshairMove(onCrosshairMove);

    return () => {
      chart.unsubscribeCrosshairMove(onCrosshairMove);
      chart.remove();
      chartRef.current = null;
      historyRef.current = null;
      forecastRef.current = null;
      aiForecastRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    const history = historyRef.current;
    const forecast = forecastRef.current;
    const aiForecast = aiForecastRef.current;
    if (
      chart === null ||
      history === null ||
      forecast === null ||
      aiForecast === null
    ) {
      return;
    }
    if (rows.length === 0) {
      return;
    }
    const {
      candles,
      forecast: forecastData,
      aiForecast: aiData,
    } = seriesDataFromRows(rows);
    if (candles.length > 0) {
      history.setData(candles);
    }
    forecast.setData(forecastData);
    aiForecast.setData(aiData);
    applyDefaultVisibleRange(chart);
  }, [rows]);

  return (
    <motion.div
      className="flex h-full min-h-0 min-w-0 flex-1 flex-col"
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        ref={wrapperRef}
        className="relative min-h-0 min-w-0 flex-1 w-full"
      >
        <div ref={containerRef} className="absolute inset-0" />
        {forecastInsightLabel !== null ? (
          <div
            className="pointer-events-none absolute right-3 top-3 z-10 max-w-[min(100%-1.5rem,22rem)] truncate rounded-md bg-violet-500/15 px-2 py-1 text-[10px] font-medium text-violet-950 ring-1 ring-inset ring-violet-500/30 backdrop-blur-sm dark:text-violet-100"
            title={forecastInsightLabel}
          >
            {forecastInsightLabel}
          </div>
        ) : null}
        {tooltip?.visible === true ? <ChartTooltip tip={tooltip} /> : null}
      </div>
    </motion.div>
  );
}
