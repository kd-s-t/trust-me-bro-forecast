"use client";

import { Loader2, RefreshCw } from "lucide-react";
import type { ChartHistoryView } from "@/lib/chart/historyView";
import { cn } from "@/lib/utils";

type Props = {
  historyView: ChartHistoryView;
  syncing: boolean;
  onRefresh: () => void | Promise<void>;
  className?: string;
};

/** Update market — loading while 15s auto-sync or manual refresh runs. */
export function ChartMarketRefresh({
  historyView,
  syncing,
  onRefresh,
  className,
}: Props) {
  return (
    <button
      type="button"
      disabled={syncing}
      onClick={() => {
        void onRefresh();
      }}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground transition-colors hover:bg-muted disabled:opacity-60",
        className,
      )}
      aria-label={`Update ${historyView} market data`}
      aria-busy={syncing}
    >
      {syncing ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
      ) : (
        <RefreshCw className="size-3.5" aria-hidden />
      )}
      Update market
    </button>
  );
}
