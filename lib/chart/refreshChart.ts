/** Tell ChartLoader to refetch /api/history and /api/forecast */
export const CHART_DATA_REFRESH_EVENT = "chart:data-refresh";

export function refreshChartData(): void {
  window.dispatchEvent(new Event(CHART_DATA_REFRESH_EVENT));
}
