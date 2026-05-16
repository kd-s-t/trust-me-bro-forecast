"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label?: string;
  className?: string;
};

export function ChartLoadingOverlay({
  label = "Loading chart…",
  className,
}: Props) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-10 flex items-center justify-center",
        "bg-background/40 backdrop-blur-md",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border/60 bg-card/90 px-8 py-6 shadow-lg backdrop-blur-sm">
        <Loader2
          className="size-9 animate-spin text-primary"
          aria-hidden
        />
        {label !== "" ? (
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
        ) : null}
      </div>
    </div>
  );
}
