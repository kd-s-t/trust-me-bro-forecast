export type ChartHistoryView = "15m" | "1h" | "4h" | "1d" | "1yr";

export const CHART_HISTORY_VIEWS: ChartHistoryView[] = [
  "15m",
  "1h",
  "4h",
  "1d",
  "1yr",
];

export const DEFAULT_CHART_HISTORY_VIEW: ChartHistoryView = "1d";

const STORAGE_KEY = "chart-history-view";

const LEGACY_VIEW_MAP: Record<string, ChartHistoryView> = {
  default: "1d",
  "24h": "1h",
};

export function isChartHistoryView(v: string | null): v is ChartHistoryView {
  if (v === null) {
    return false;
  }
  if (CHART_HISTORY_VIEWS.includes(v as ChartHistoryView)) {
    return true;
  }
  return v in LEGACY_VIEW_MAP;
}

export function normalizeChartHistoryView(v: string | null): ChartHistoryView {
  if (v !== null && CHART_HISTORY_VIEWS.includes(v as ChartHistoryView)) {
    return v as ChartHistoryView;
  }
  if (v !== null && v in LEGACY_VIEW_MAP) {
    return LEGACY_VIEW_MAP[v]!;
  }
  return DEFAULT_CHART_HISTORY_VIEW;
}

export function getStoredChartHistoryView(): ChartHistoryView {
  if (typeof window === "undefined") {
    return DEFAULT_CHART_HISTORY_VIEW;
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return normalizeChartHistoryView(raw);
}

export function setStoredChartHistoryView(view: ChartHistoryView): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, view);
}

const DAY_MS = 86_400_000;

/** How far back each chart interval loads and zooms. */
export function chartViewLookbackMs(view: ChartHistoryView): number {
  switch (view) {
    case "15m":
      return DAY_MS;
    case "1h":
      return 7 * DAY_MS;
    case "4h":
      return 30 * DAY_MS;
    case "1d":
      return 90 * DAY_MS;
    case "1yr":
      return 365 * DAY_MS;
  }
}

export function chartViewBinanceInterval(view: ChartHistoryView): string {
  return view === "1yr" ? "1d" : view;
}

export function chartViewIsIntraday(view: ChartHistoryView): boolean {
  return view === "15m" || view === "1h" || view === "4h";
}

export function chartViewShowsForecast(view: ChartHistoryView): boolean {
  return view === "1d" || view === "1yr";
}

export function chartVisibleWindowMs(view: ChartHistoryView): {
  startMsInclusive: number;
  endMsInclusive: number;
} {
  const endMsInclusive = Date.now();
  return {
    startMsInclusive: endMsInclusive - chartViewLookbackMs(view),
    endMsInclusive,
  };
}
