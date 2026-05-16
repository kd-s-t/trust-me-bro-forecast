import { ChartLoader } from "@/components/ChartLoader";
import { DashboardShell } from "@/components/DashboardShell";

export default function Page() {
  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <DashboardShell>
        <ChartLoader />
      </DashboardShell>
    </main>
  );
}
