"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { ChartRow } from "@/lib/chartRows";

const BtcChart = dynamic(
  () => import("@/components/BtcChart").then((m) => ({ default: m.BtcChart })),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
      </div>
    ),
  },
);

type Props = {
  rows: ChartRow[];
  forecastInsightLabel?: string | null;
};

export function ChartPanel({
  rows,
  forecastInsightLabel = null,
}: Props) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <BtcChart rows={rows} forecastInsightLabel={forecastInsightLabel} />
    </div>
  );
}
