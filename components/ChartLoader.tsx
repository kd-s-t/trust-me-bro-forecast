"use client";

import { useCallback, useEffect, useState } from "react";
import { ChartLoading } from "@/components/ChartLoading";
import { ChartPanel } from "@/components/ChartPanel";
import { FadePanel, Stagger } from "@/components/MotionLayout";
import { buildChartRows, type ChartRow } from "@/lib/chartRows";
import type { ForecastApiPayload } from "@/lib/chart/loadForecastPayload";
import type { HistoryApiPayload } from "@/lib/chart/loadHistoryPayload";

import {
  FORECAST_SELECT_EVENT,
  getSelectedForecastRunId,
} from "@/lib/chart/forecastSelection";
import { CHART_DATA_REFRESH_EVENT } from "@/lib/chart/refreshChart";

type ChartReadyData = {
  rows: ChartRow[];
  forecastInsightLabel: string | null;
};

type State =
  | { kind: "loading" }
  | { kind: "ready"; data: ChartReadyData }
  | { kind: "error"; message: string };

export function ChartLoader() {
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const runId = getSelectedForecastRunId();
      const forecastUrl =
        runId !== null && runId !== ""
          ? `/api/forecast?runId=${encodeURIComponent(runId)}`
          : "/api/forecast";

      const [historyRes, forecastRes] = await Promise.all([
        fetch("/api/history", { cache: "no-store" }),
        fetch(forecastUrl, { cache: "no-store" }),
      ]);

      const historyBody = (await historyRes.json()) as HistoryApiPayload & {
        error?: string;
      };
      if (!historyRes.ok) {
        throw new Error(
          historyBody.error ?? `Failed to load history (${String(historyRes.status)})`,
        );
      }

      const forecastBody = (await forecastRes.json()) as {
        forecast: ForecastApiPayload | null;
        error?: string;
      };
      if (!forecastRes.ok) {
        throw new Error(
          forecastBody.error ??
            `Failed to load forecast (${String(forecastRes.status)})`,
        );
      }

      const forecast = forecastBody.forecast;
      const rows = buildChartRows(
        historyBody.points,
        forecast?.points ?? [],
      );

      setState({
        kind: "ready",
        data: {
          rows,
          forecastInsightLabel: forecast?.insightLabel ?? null,
        },
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load chart";
      setState({ kind: "error", message });
    }
  }, []);

  useEffect(() => {
    void load();
    const onRefresh = (): void => {
      void load();
    };
    window.addEventListener(CHART_DATA_REFRESH_EVENT, onRefresh);
    window.addEventListener(FORECAST_SELECT_EVENT, onRefresh);
    return () => {
      window.removeEventListener(CHART_DATA_REFRESH_EVENT, onRefresh);
      window.removeEventListener(FORECAST_SELECT_EVENT, onRefresh);
    };
  }, [load]);

  if (state.kind === "loading") {
    return <ChartLoading />;
  }

  if (state.kind === "error") {
    const showDbHint =
      state.message.includes("No price data") ||
      state.message.includes("Update history");
    return (
      <Stagger className="min-h-0 flex-1 justify-center p-4">
        <FadePanel
          role="alert"
          className="border-violet-400/55 bg-violet-50 dark:border-violet-600/55 dark:bg-violet-950/40"
        >
          <p className="leading-relaxed text-violet-950 dark:text-violet-100">
            {state.message}
            {showDbHint ? (
              <>
                {" "}
                <span className="font-semibold text-violet-900 dark:text-violet-200">
                  Click <strong>Update history</strong> with{" "}
                  <code>DATABASE_URL</code> and <code>KAGGLE_API_TOKEN</code> in{" "}
                  <code>.env</code>.
                </span>
              </>
            ) : null}
          </p>
        </FadePanel>
      </Stagger>
    );
  }

  return (
    <ChartPanel
      rows={state.data.rows}
      forecastInsightLabel={state.data.forecastInsightLabel}
    />
  );
}
