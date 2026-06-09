import {
  type ChartHistoryView,
  normalizeChartHistoryView,
} from "@/lib/chart/historyView";
import type { PricePoint } from "@/lib/history";
import { loadHistoryForChartView } from "@/lib/history/loadChartView";

export type HistoryApiPayload = {
  view: ChartHistoryView;
  points: PricePoint[];
};

export async function loadHistoryPayload(
  view: ChartHistoryView = "1d",
): Promise<HistoryApiPayload> {
  const points = await loadHistoryForChartView(view);
  return { view, points };
}

export { normalizeChartHistoryView };
