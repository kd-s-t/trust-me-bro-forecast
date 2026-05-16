"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const AppSidebar = dynamic(
  () => import("@/components/AppSidebar").then((m) => ({ default: m.AppSidebar })),
  { ssr: false },
);
const PredictionsRail = dynamic(
  () =>
    import("@/components/PredictionsRail").then((m) => ({
      default: m.PredictionsRail,
    })),
  { ssr: false },
);

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
