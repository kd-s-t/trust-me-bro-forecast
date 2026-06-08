"use client";

import { BetAlertBell } from "@/components/BetAlertBell";
import { ChartMarketRefresh } from "@/components/ChartMarketRefresh";
import { ChartViewToggle } from "@/components/ChartViewToggle";
import type { ChartHistoryView } from "@/lib/chart/historyView";
import { setStoredChartHistoryView } from "@/lib/chart/historyView";

type Props = {
  historyView: ChartHistoryView;
  onHistoryViewChange: (view: ChartHistoryView) => void;
  betBelow: boolean;
  betAlertMessage: string | null;
  marketSyncing: boolean;
  onMarketRefresh: () => void | Promise<void>;
};

export function ChartToolbar({
  historyView,
  onHistoryViewChange,
  betBelow,
  betAlertMessage,
  marketSyncing,
  onMarketRefresh,
}: Props) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-l border-border bg-card/80 px-3">
      <ChartViewToggle
        view={historyView}
        onChange={(v) => {
          setStoredChartHistoryView(v);
          onHistoryViewChange(v);
        }}
      />
      <BetAlertBell below={betBelow} message={betAlertMessage} />
      <ChartMarketRefresh
        historyView={historyView}
        syncing={marketSyncing}
        onRefresh={onMarketRefresh}
      />
    </div>
  );
}
