"use client";

import dynamic from "next/dynamic";
import { ChartLoadingOverlay } from "@/components/ChartLoadingOverlay";
import type { ChartHistoryView } from "@/lib/chart/historyView";
import { DEFAULT_CHART_HISTORY_VIEW } from "@/lib/chart/historyView";
import type { ChartRow } from "@/lib/chartRows";

const BtcChart = dynamic(
  () => import("@/components/BtcChart").then((m) => ({ default: m.BtcChart })),
  {
    ssr: false,
    loading: () => (
      <div className="relative flex min-h-0 flex-1 flex-col bg-muted/15">
        <ChartLoadingOverlay label="Loading chart engine…" />
      </div>
    ),
  },
);

type Props = {
  rows: ChartRow[];
  historyView?: ChartHistoryView;
  forecastInsightLabel?: string | null;
};

export function ChartPanel({
  rows,
  historyView = DEFAULT_CHART_HISTORY_VIEW,
  forecastInsightLabel = null,
}: Props) {
  return (
    <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <BtcChart
        rows={rows}
        historyView={historyView}
        forecastInsightLabel={forecastInsightLabel}
      />
    </div>
  );
}
