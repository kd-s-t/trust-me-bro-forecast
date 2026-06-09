"use client";

import { useCallback, useEffect, useState } from "react";
import { BinanceBalancePanel } from "@/components/BinanceBalancePanel";
import { ChartToolbar } from "@/components/ChartToolbar";
import { useBetBelowMarketWatch } from "@/components/useBetBelowMarketWatch";
import { ChartLoading } from "@/components/ChartLoading";
import { ChartLoadingOverlay } from "@/components/ChartLoadingOverlay";
import { ChartPanel } from "@/components/ChartPanel";
import { FadePanel, Stagger } from "@/components/MotionLayout";
import {
  binanceTickAutoEnabled,
  binanceTickIntervalMs,
} from "@/lib/binance/tickInterval";
import { upsertObservedLivePoint } from "@/lib/chart/patchLivePrice";
import { syncChartMarketToDb } from "@/lib/chart/syncMarket";
import { buildChartRows, type ChartRow } from "@/lib/chartRows";
import type { ForecastApiPayload } from "@/lib/chart/loadForecastPayload";
import type { HistoryApiPayload } from "@/lib/chart/loadHistoryPayload";

import {
  FORECAST_SELECT_EVENT,
  getSelectedForecastRunId,
} from "@/lib/chart/forecastSelection";
import {
  CHART_DATA_REFRESH_EVENT,
  type ChartDataRefreshDetail,
  refreshChartData,
} from "@/lib/chart/refreshChart";
import {
  type BetEntrySnapshot,
  lastObservedUsdFromRows,
} from "@/lib/chart/betMarketAlert";
import { unlockBetBelowAlertSound } from "@/lib/chart/betBelowSound";
import {
  type ChartHistoryView,
  chartViewShowsForecast,
  DEFAULT_CHART_HISTORY_VIEW,
  getStoredChartHistoryView,
} from "@/lib/chart/historyView";

type ChartReadyData = {
  rows: ChartRow[];
  historyView: ChartHistoryView;
  forecastInsightLabel: string | null;
};

type State =
  | { kind: "loading" }
  | { kind: "refreshing"; data: ChartReadyData }
  | { kind: "ready"; data: ChartReadyData }
  | { kind: "error"; message: string };

export function ChartLoader() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [historyView, setHistoryView] = useState<ChartHistoryView>(
    DEFAULT_CHART_HISTORY_VIEW,
  );
  const [betEntry, setBetEntry] = useState<BetEntrySnapshot | null>(null);
  const [livePriceUsd, setLivePriceUsd] = useState<number | null>(null);
  const [marketSyncing, setMarketSyncing] = useState(false);

  const betAlert = useBetBelowMarketWatch(livePriceUsd, betEntry);

  const applyMarketTick = useCallback(
    (tick: { price: number; timeMs: number }) => {
      setLivePriceUsd(tick.price);
      setState((prev) => {
        if (prev.kind !== "ready" && prev.kind !== "refreshing") {
          return prev;
        }
        const rows = upsertObservedLivePoint(
          prev.data.rows,
          tick.timeMs,
          tick.price,
        );
        if (rows === prev.data.rows) {
          return prev;
        }
        return { ...prev, data: { ...prev.data, rows } };
      });
    },
    [],
  );

  const syncMarketTick = useCallback(async (): Promise<void> => {
    setMarketSyncing(true);
    try {
      const tick = await syncChartMarketToDb();
      if (tick === null) {
        return;
      }
      applyMarketTick(tick);
    } catch {
      /* keep last chart */
    } finally {
      setMarketSyncing(false);
    }
  }, [applyMarketTick]);

  const onManualMarketRefresh = useCallback(async (): Promise<void> => {
    if (marketSyncing) {
      return;
    }
    setMarketSyncing(true);
    try {
      await syncChartMarketToDb();
      refreshChartData(historyView);
    } finally {
      setMarketSyncing(false);
    }
  }, [marketSyncing, historyView]);

  useEffect(() => {
    setHistoryView(getStoredChartHistoryView());
  }, []);

  useEffect(() => {
    const unlock = (): void => {
      unlockBetBelowAlertSound();
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/chart/bet-entry", { cache: "no-store" });
        const body = (await res.json()) as BetEntrySnapshot & { error?: string };
        if (!res.ok || cancelled) {
          return;
        }
        setBetEntry(body);
      } catch {
        /* chart still works */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async (viewOverride?: ChartHistoryView) => {
    const activeView = viewOverride ?? historyView;

    setState((prev) => {
      if (prev.kind === "ready") {
        return {
          kind: "refreshing",
          data: { ...prev.data, historyView: activeView },
        };
      }
      return { kind: "loading" };
    });

    try {
      const historyUrl = `/api/history?view=${encodeURIComponent(activeView)}`;

      const historyRes = await fetch(historyUrl, { cache: "no-store" });
      const historyBody = (await historyRes.json()) as HistoryApiPayload & {
        error?: string;
      };
      if (!historyRes.ok) {
        throw new Error(
          historyBody.error ?? `Failed to load history (${String(historyRes.status)})`,
        );
      }

      let forecast: ForecastApiPayload | null = null;
      if (chartViewShowsForecast(activeView)) {
        const runId = getSelectedForecastRunId();
        const forecastUrl =
          runId !== null && runId !== ""
            ? `/api/forecast?runId=${encodeURIComponent(runId)}`
            : "/api/forecast";
        const forecastRes = await fetch(forecastUrl, { cache: "no-store" });
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
        forecast = forecastBody.forecast;
      }

      const view = historyBody.view ?? activeView;
      const rows = buildChartRows(
        historyBody.points,
        forecast?.points ?? [],
        undefined,
        undefined,
        view,
      );

      const live = lastObservedUsdFromRows(rows);
      if (live !== null) {
        setLivePriceUsd(live);
      }

      setState({
        kind: "ready",
        data: {
          rows,
          historyView: view,
          forecastInsightLabel: forecast?.insightLabel ?? null,
        },
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load chart";
      setState({ kind: "error", message });
    }
  }, [historyView]);

  useEffect(() => {
    void load();
    const onChartRefresh = (e: Event): void => {
      const detail = (e as CustomEvent<ChartDataRefreshDetail>).detail;
      void load(detail?.historyView);
    };
    const onForecastSelect = (): void => {
      void load();
    };
    window.addEventListener(CHART_DATA_REFRESH_EVENT, onChartRefresh);
    window.addEventListener(FORECAST_SELECT_EVENT, onForecastSelect);
    return () => {
      window.removeEventListener(CHART_DATA_REFRESH_EVENT, onChartRefresh);
      window.removeEventListener(FORECAST_SELECT_EVENT, onForecastSelect);
    };
  }, [load]);

  useEffect(() => {
    if (!binanceTickAutoEnabled()) {
      return;
    }
    if (state.kind !== "ready" && state.kind !== "refreshing") {
      return;
    }
    const pollMs = binanceTickIntervalMs();
    const id = window.setInterval(() => {
      void syncMarketTick();
    }, pollMs);
    void syncMarketTick();
    return () => {
      window.clearInterval(id);
    };
  }, [state.kind, syncMarketTick]);

  if (state.kind === "loading") {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 items-stretch border-b border-border">
          <BinanceBalancePanel className="min-w-0 flex-1 border-b-0" />
          <ChartToolbar
            historyView={historyView}
            onHistoryViewChange={setHistoryView}
            betBelow={betAlert.below}
            betAlertMessage={betAlert.message}
            marketSyncing={marketSyncing}
            onMarketRefresh={onManualMarketRefresh}
          />
        </div>
        <div className="relative min-h-0 flex-1">
          <ChartLoading />
        </div>
      </div>
    );
  }

  if (state.kind === "error") {
    const showDbHint =
      state.message.includes("No price data") ||
      state.message.includes("Update history");
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 items-stretch border-b border-border">
          <BinanceBalancePanel className="min-w-0 flex-1 border-b-0" />
          <ChartToolbar
            historyView={historyView}
            onHistoryViewChange={setHistoryView}
            betBelow={betAlert.below}
            betAlertMessage={betAlert.message}
            marketSyncing={marketSyncing}
            onMarketRefresh={onManualMarketRefresh}
          />
        </div>
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
      </div>
    );
  }

  const data = state.data;

  return (
    <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex shrink-0 items-stretch border-b border-border">
        <BinanceBalancePanel className="min-w-0 flex-1 border-b-0" />
        <ChartToolbar
          historyView={historyView}
          onHistoryViewChange={setHistoryView}
          betBelow={betAlert.below}
          betAlertMessage={betAlert.message}
          marketSyncing={marketSyncing}
          onMarketRefresh={onManualMarketRefresh}
        />
      </div>
      <div className="min-h-0 flex-1">
        <ChartPanel
          rows={data.rows}
          historyView={data.historyView}
          forecastInsightLabel={data.forecastInsightLabel}
        />
      </div>
      {state.kind === "refreshing" ? (
        <ChartLoadingOverlay label="Updating chart…" />
      ) : null}
    </div>
  );
}
