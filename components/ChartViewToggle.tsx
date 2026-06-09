"use client";

import {
  CHART_HISTORY_VIEWS,
  type ChartHistoryView,
} from "@/lib/chart/historyView";
import { cn } from "@/lib/utils";

type Props = {
  view: ChartHistoryView;
  onChange: (view: ChartHistoryView) => void;
  className?: string;
};

export function ChartViewToggle({ view, onChange, className }: Props) {
  return (
    <div
      className={cn(
        "inline-flex rounded-md border border-border bg-background p-0.5 text-[10px] font-medium",
        className,
      )}
      role="group"
      aria-label="Chart interval"
    >
      {CHART_HISTORY_VIEWS.map((interval) => (
        <button
          key={interval}
          type="button"
          onClick={() => {
            onChange(interval);
          }}
          className={cn(
            "rounded px-2 py-1 transition-colors",
            view === interval
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {interval}
        </button>
      ))}
    </div>
  );
}
