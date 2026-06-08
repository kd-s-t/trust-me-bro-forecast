export type ChartHistoryView = "default" | "24h";

const STORAGE_KEY = "chart-history-view";

export function isChartHistoryView(v: string | null): v is ChartHistoryView {
  return v === "default" || v === "24h";
}

export function getStoredChartHistoryView(): ChartHistoryView {
  if (typeof window === "undefined") {
    return "default";
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return isChartHistoryView(raw) ? raw : "default";
}

export function setStoredChartHistoryView(view: ChartHistoryView): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, view);
}

export const HOUR_24_MS = 24 * 60 * 60 * 1000;
