import type { ChartHistoryView } from "@/lib/chart/historyView";

/** Tell ChartLoader to refetch history (and forecast on All view). */
export const CHART_DATA_REFRESH_EVENT = "chart:data-refresh";

export type ChartDataRefreshDetail = {
  historyView?: ChartHistoryView;
};

export function refreshChartData(historyView?: ChartHistoryView): void {
  const detail: ChartDataRefreshDetail | undefined =
    historyView !== undefined ? { historyView } : undefined;
  window.dispatchEvent(
    new CustomEvent<ChartDataRefreshDetail>(CHART_DATA_REFRESH_EVENT, {
      detail,
    }),
  );
}
