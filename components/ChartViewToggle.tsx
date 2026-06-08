"use client";

import type { ChartHistoryView } from "@/lib/chart/historyView";
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
      aria-label="Chart time range"
    >
      <button
        type="button"
        onClick={() => {
          onChange("24h");
        }}
        className={cn(
          "rounded px-2 py-1 transition-colors",
          view === "24h"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        24h
      </button>
      <button
        type="button"
        onClick={() => {
          onChange("default");
        }}
        className={cn(
          "rounded px-2 py-1 transition-colors",
          view === "default"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        All
      </button>
    </div>
  );
}
