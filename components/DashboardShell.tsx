import type { ReactNode } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { PredictionsRail } from "@/components/PredictionsRail";
import { DASHBOARD_GRID_CLASS } from "@/lib/dashboardLayout";

type Props = {
  children: ReactNode;
};

/** Three-column shell with fixed rail + sidebar widths (no resize when data loads). */
export function DashboardShell({ children }: Props) {
  return (
    <div className={DASHBOARD_GRID_CLASS}>
      <PredictionsRail />
      <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
        {children}
      </div>
      <AppSidebar />
    </div>
  );
}
