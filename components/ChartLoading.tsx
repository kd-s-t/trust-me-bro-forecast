"use client";

import { ChartLoadingOverlay } from "@/components/ChartLoadingOverlay";

export function ChartLoading() {
  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-muted/15">
      <ChartLoadingOverlay />
    </div>
  );
}
