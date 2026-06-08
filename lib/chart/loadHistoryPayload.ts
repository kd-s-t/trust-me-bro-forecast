import type { ChartHistoryView } from "@/lib/chart/historyView";
import type { PricePoint } from "@/lib/history";
import { loadHistory24h } from "@/lib/history/load24h";
import { loadHistory } from "@/lib/history/load";

export type HistoryApiPayload = {
  view: ChartHistoryView;
  points: PricePoint[];
};

export async function loadHistoryPayload(
  view: ChartHistoryView = "default",
): Promise<HistoryApiPayload> {
  const points =
    view === "24h" ? await loadHistory24h() : await loadHistory();
  return { view, points };
}
