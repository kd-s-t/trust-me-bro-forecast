import type { PricePoint } from "@/lib/history";
import { loadHistory } from "@/lib/history/load";

export type HistoryApiPayload = {
  points: PricePoint[];
};

export async function loadHistoryPayload(): Promise<HistoryApiPayload> {
  const points = await loadHistory();
  return { points };
}
