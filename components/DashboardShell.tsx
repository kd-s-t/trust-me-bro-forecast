"use client";

import type { ReactNode } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { PredictionsRail } from "@/components/PredictionsRail";

type Props = {
  children: ReactNode;
};

export function DashboardShell({ children }: Props) {
  return (
    <div className="flex min-h-0 flex-1 flex-row overflow-hidden">
      <PredictionsRail />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      <AppSidebar />
    </div>
  );
}
