import path from "path";
import { ChartPanel } from "@/components/ChartPanel";
import { DashboardShell } from "@/components/DashboardShell";
import { FadePanel, Stagger } from "@/components/MotionLayout";
import { loadHistory } from "@/lib/history/load";
import { buildChartRows } from "@/lib/chartRows";
import { loadForecastDir } from "@/lib/forecastData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FORECAST_DIR = path.join(process.cwd(), "forecast");

export default async function Page() {
  let chartPoints;
  try {
    chartPoints = await loadHistory();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const showDbHint =
      msg.includes("DATABASE_URL") ||
      msg.includes("HISTORY_JSON_URL") ||
      msg.includes("R2") ||
      msg.includes("Cloudflare") ||
      msg.includes("No price data") ||
      msg.includes("No rows") ||
      msg.includes("No price JSON") ||
      msg.includes("Update data");
    return (
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <DashboardShell>
          <Stagger className="min-h-0 flex-1 justify-center p-4">
            <FadePanel
              role="status"
              className="border-violet-400/55 bg-violet-50 dark:border-violet-600/55 dark:bg-violet-950/40"
            >
              <p className="leading-relaxed text-violet-950 dark:text-violet-100">
                {msg}
                {showDbHint === true ? (
                  <>
                    {" "}
                    <span className="font-semibold text-violet-900 dark:text-violet-200">
                      Click <strong>Update data</strong> (
                      <code>DATABASE_URL</code>, <code>KAGGLE_API_TOKEN</code>,
                      R2) for full <code>btc-price-history.json</code> (all
                      rows). On Vercel set <code>HISTORY_JSON_URL</code>.
                    </span>
                  </>
                ) : null}
              </p>
            </FadePanel>
          </Stagger>
        </DashboardShell>
      </main>
    );
  }

  const fileForecast = loadForecastDir(FORECAST_DIR);
  const rows = buildChartRows(chartPoints, fileForecast);

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <DashboardShell>
        <ChartPanel rows={rows} />
      </DashboardShell>
    </main>
  );
}
