"use client";

import { BtcChart } from "@/components/BtcChart";
import type { ChartRow } from "@/lib/chartRows";

type Props = {
  rows: ChartRow[];
};

export function ChartPanel({ rows }: Props) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <BtcChart rows={rows} />
    </div>
  );
}
