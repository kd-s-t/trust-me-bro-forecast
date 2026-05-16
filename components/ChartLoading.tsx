"use client";

import { Loader2 } from "lucide-react";

export function ChartLoading() {
  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col items-center justify-center bg-background"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2
        className="size-8 animate-spin text-muted-foreground"
        aria-hidden
      />
      <p className="mt-3 text-sm font-medium text-muted-foreground">
        Loading chart…
      </p>
    </div>
  );
}
