"use client";

import { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  LineSeries,
  createChart,
  createSeriesMarkers,
  LineStyle,
  type BusinessDay,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type LineData,
  type MouseEventParams,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import { motion } from "framer-motion";
import {
  BET_PURCHASE_DETAIL,
  BET_PURCHASE_SHORT,
  betPurchaseMarker,
  findBetCandle,
} from "@/lib/chartBetMarker";
import type { ChartRow } from "@/lib/chartRows";
import { candlesFromClosePrices } from "@/lib/candleFromPrices";
import { formatChartAxisTime } from "@/lib/chart/formatChartTime";
import type { ChartHistoryView } from "@/lib/chart/historyView";
import {
  defaultVisibleWindowMs,
  last24HoursWindowMs,
} from "@/lib/timeRange";

export type { ChartRow };

type Props = {
  rows: ChartRow[];
  historyView?: ChartHistoryView;
  forecastInsightLabel?: string | null;
};

const ROW_MATCH_MS_DEFAULT = 86_400_000;
const ROW_MATCH_MS_INTRADAY = 120_000;

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

function rowAtTimeMs(
  rows: ChartRow[],
  timeMs: number,
  maxDeltaMs: number,
): ChartRow | undefined {
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
  if (best === undefined || bestDelta > maxDeltaMs) {
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
  maxDeltaMs: number,
): ChartTooltipState | null {
  if (param.point === undefined || param.time === undefined) {
    return null;
  }
  const { x, y } = param.point;
  if (x < 0 || y < 0) {
    return null;
  }

  const timeMs = timeToMs(param.time);
  const row = rowAtTimeMs(rows, timeMs, maxDeltaMs);
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

/** lightweight-charts requires strictly ascending times (no duplicate seconds). */
function dedupeLineAsc(data: LineData<Time>[]): LineData<Time>[] {
  const sorted = sortLineAsc(data);
  const out: LineData<Time>[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const pt = sorted[i]!;
    const t = timeToMs(pt.time);
    const prev = out[out.length - 1];
    if (prev !== undefined && timeToMs(prev.time) === t) {
      out[out.length - 1] = pt;
    } else if (prev === undefined || timeToMs(prev.time) < t) {
      out.push(pt);
    }
  }
  return out;
}

type VisibleTimeRange = {
  from: Time;
  to: Time;
};

type VisibleLogicalRange = {
  from: number;
  to: number;
};

function applyVisibleRange(chart: IChartApi, historyView: ChartHistoryView): void {
  const win =
    historyView === "24h" ? last24HoursWindowMs() : defaultVisibleWindowMs();
  chart.timeScale().setVisibleRange({
    from: msToUtc(win.startMsInclusive),
    to: msToUtc(win.endMsInclusive),
  });
}

/** setData resets the time scale asynchronously — restore after layout. */
function scheduleRestoreViewport(
  chart: IChartApi,
  timeRange: VisibleTimeRange | null,
  logicalRange: VisibleLogicalRange | null,
): void {
  if (timeRange === null && logicalRange === null) {
    return;
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (logicalRange !== null) {
        try {
          chart.timeScale().setVisibleLogicalRange(logicalRange);
          return;
        } catch {
          /* fall back to time range */
        }
      }
      if (timeRange !== null) {
        try {
          chart.timeScale().setVisibleRange(timeRange);
        } catch {
          /* range no longer valid for new data */
        }
      }
    });
  });
}

function applyTimeScaleOptions(
  chart: IChartApi,
  historyView: ChartHistoryView,
): void {
  const intraday = historyView === "24h";
  chart.applyOptions({
    timeScale: {
      timeVisible: true,
      secondsVisible: false,
    },
    localization: {
      locale: "en-US",
      priceFormatter: (price: number) => `$${nfCompact.format(price)}`,
      timeFormatter: (t: Time) => formatChartAxisTime(timeToMs(t), intraday),
    },
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
  const bridgeSec =
    bridge !== undefined ? Math.floor(bridge.timeMs / 1000) : null;
  if (bridge !== undefined && bridgeSec !== null) {
    if (forecast.length > 0) {
      const t0 = timeToMs(forecast[0]!.time);
      if (t0 > bridgeSec) {
        forecast.unshift({
          time: msToUtc(bridge.timeMs),
          value: bridge.close,
        });
      } else if (t0 === bridgeSec) {
        forecast[0] = { time: forecast[0]!.time, value: bridge.close };
      }
    }
    if (aiForecast.length > 0) {
      const t0 = timeToMs(aiForecast[0]!.time);
      if (t0 > bridgeSec) {
        aiForecast.unshift({
          time: msToUtc(bridge.timeMs),
          value: bridge.close,
        });
      } else if (t0 === bridgeSec) {
        aiForecast[0] = { time: aiForecast[0]!.time, value: bridge.close };
      }
    }
  }

  return {
    candles: candlesFromClosePrices(closePoints),
    forecast: dedupeLineAsc(forecast),
    aiForecast: dedupeLineAsc(aiForecast),
  };
}

type BetAnchor = {
  markerTime: Time;
  price: number;
};

function betAnchorFromCandles(
  candles: CandlestickData<Time>[],
): BetAnchor | null {
  const candle = findBetCandle(candles, timeToMs);
  if (candle === undefined) {
    return null;
  }
  return { markerTime: candle.time, price: candle.close };
}

function BetPurchaseCallout({
  chart,
  history,
  anchor,
  chartReady,
}: {
  chart: IChartApi | null;
  history: ISeriesApi<"Candlestick", Time> | null;
  anchor: BetAnchor | null;
  chartReady: number;
}) {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (chart === null || history === null || anchor === null) {
      setPos(null);
      return;
    }

    const update = () => {
      const x = chart.timeScale().timeToCoordinate(anchor.markerTime);
      const y = history.priceToCoordinate(anchor.price);
      if (x === null || y === null) {
        setPos(null);
        return;
      }
      setPos({ left: x, top: y });
    };

    update();
    chart.timeScale().subscribeVisibleTimeRangeChange(update);
    const ro = new ResizeObserver(update);
    const wrap = chart.chartElement().parentElement;
    if (wrap !== null) {
      ro.observe(wrap);
    }

    return () => {
      chart.timeScale().unsubscribeVisibleTimeRangeChange(update);
      ro.disconnect();
    };
  }, [chart, history, anchor, chartReady]);

  if (pos === null || anchor === null) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute z-10 max-w-[14rem] -translate-x-1/2 -translate-y-full rounded-md border border-amber-500/40 bg-amber-50/95 px-2 py-1.5 text-[10px] leading-snug text-amber-950 shadow-sm backdrop-blur-sm dark:bg-amber-950/90 dark:text-amber-50"
      style={{ left: pos.left, top: pos.top - 28 }}
      title={BET_PURCHASE_DETAIL}
    >
      <p className="font-semibold">{BET_PURCHASE_SHORT}</p>
      <p className="mt-0.5 text-[9px] opacity-90">{BET_PURCHASE_DETAIL}</p>
    </div>
  );
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
  historyView = "default",
  forecastInsightLabel = null,
}: Props) {
  const intraday = historyView === "24h";
  const rowMatchMs = intraday ? ROW_MATCH_MS_INTRADAY : ROW_MATCH_MS_DEFAULT;
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const historyRef = useRef<ISeriesApi<"Candlestick", Time> | null>(null);
  const forecastRef = useRef<ISeriesApi<"Line", Time> | null>(null);
  const aiForecastRef = useRef<ISeriesApi<"Line", Time> | null>(null);
  const betMarkersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const historyViewRef = useRef(historyView);
  historyViewRef.current = historyView;
  const lastVisibleRangeViewRef = useRef<ChartHistoryView | null>(null);
  const savedVisibleRangeRef = useRef<VisibleTimeRange | null>(null);
  const savedLogicalRangeRef = useRef<VisibleLogicalRange | null>(null);
  const rowMatchMsRef = useRef(rowMatchMs);
  rowMatchMsRef.current = rowMatchMs;
  const [tooltip, setTooltip] = useState<ChartTooltipState | null>(null);
  const [betAnchor, setBetAnchor] = useState<BetAnchor | null>(null);
  const [chartReady, setChartReady] = useState(0);

  const applyBetMarker = (
    history: ISeriesApi<"Candlestick", Time>,
    candles: CandlestickData<Time>[],
  ) => {
    const anchor = betAnchorFromCandles(candles);
    setBetAnchor(anchor);
    const markerTime = anchor?.markerTime;
    const markers =
      markerTime === undefined ? [] : [betPurchaseMarker(markerTime)];
    if (betMarkersRef.current === null) {
      betMarkersRef.current = createSeriesMarkers(history, markers);
    } else {
      betMarkersRef.current.setMarkers(markers);
    }
  };

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
          formatChartAxisTime(timeToMs(t), historyViewRef.current === "24h"),
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
        applyBetMarker(history, candles);
      } else {
        setBetAnchor(null);
        betMarkersRef.current?.setMarkers([]);
      }
      forecast.setData(forecastData);
      aiForecast.setData(aiData);
    };

    applyRows(rowsRef.current);
    setChartReady((n) => n + 1);

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
        rowMatchMsRef.current,
      );
      if (next === null) {
        setTooltip(null);
        return;
      }
      const { left, top } = placeTooltip(param.point, w, h);
      setTooltip({ ...next, x: left, y: top });
    };

    chart.subscribeCrosshairMove(onCrosshairMove);

    const onVisibleRangeChange = (range: VisibleTimeRange | null): void => {
      if (range !== null) {
        savedVisibleRangeRef.current = { from: range.from, to: range.to };
      }
    };
    const onLogicalRangeChange = (range: VisibleLogicalRange | null): void => {
      if (range !== null) {
        savedLogicalRangeRef.current = { from: range.from, to: range.to };
      }
    };
    chart.timeScale().subscribeVisibleTimeRangeChange(onVisibleRangeChange);
    chart.timeScale().subscribeVisibleLogicalRangeChange(onLogicalRangeChange);

    return () => {
      chart.timeScale().unsubscribeVisibleTimeRangeChange(onVisibleRangeChange);
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(onLogicalRangeChange);
      chart.unsubscribeCrosshairMove(onCrosshairMove);
      betMarkersRef.current?.detach();
      betMarkersRef.current = null;
      chart.remove();
      chartRef.current = null;
      historyRef.current = null;
      forecastRef.current = null;
      aiForecastRef.current = null;
      setBetAnchor(null);
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

    const viewChanged = lastVisibleRangeViewRef.current !== historyView;
    const timeRangeToRestore = viewChanged
      ? null
      : (chart.timeScale().getVisibleRange() ?? savedVisibleRangeRef.current);
    const logicalRangeToRestore = viewChanged
      ? null
      : (chart.timeScale().getVisibleLogicalRange() ??
        savedLogicalRangeRef.current);

    const {
      candles,
      forecast: forecastData,
      aiForecast: aiData,
    } = seriesDataFromRows(rows);
    if (candles.length > 0) {
      history.setData(candles);
      applyBetMarker(history, candles);
    } else {
      setBetAnchor(null);
      betMarkersRef.current?.setMarkers([]);
    }
    forecast.setData(forecastData);
    aiForecast.setData(aiData);
    applyTimeScaleOptions(chart, historyView);

    if (viewChanged) {
      applyVisibleRange(chart, historyView);
      lastVisibleRangeViewRef.current = historyView;
      const win =
        historyView === "24h" ? last24HoursWindowMs() : defaultVisibleWindowMs();
      savedVisibleRangeRef.current = {
        from: msToUtc(win.startMsInclusive),
        to: msToUtc(win.endMsInclusive),
      };
      savedLogicalRangeRef.current = null;
    } else {
      scheduleRestoreViewport(chart, timeRangeToRestore, logicalRangeToRestore);
    }
  }, [rows, historyView]);

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
        <BetPurchaseCallout
          chart={chartRef.current}
          history={historyRef.current}
          anchor={betAnchor}
          chartReady={chartReady}
        />
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
