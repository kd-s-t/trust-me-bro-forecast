"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { setSelectedForecastRunId } from "@/lib/chart/forecastSelection";
import { refreshChartData } from "@/lib/chart/refreshChart";
import {
  FORECAST_HORIZONS,
  type ForecastHorizon,
} from "@/lib/forecast/horizons";
import { cn } from "@/lib/utils";

const HORIZON_SHORT: Record<ForecastHorizon, string> = {
  "1m": "1m",
  "3m": "3m",
  "6m": "6m",
  "9m": "9m",
  "1y": "1yr",
};

type Props = {
  className?: string;
};

export function ForecastButton({ className }: Props) {
  const [horizon, setHorizon] = useState<ForecastHorizon>("3m");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [statusIsWarning, setStatusIsWarning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onForecast(): Promise<void> {
    setLoading(true);
    setError(null);
    setStatusIsWarning(false);
    setStatus("Fetching headlines…");

    try {
      const res = await fetch("/api/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ horizon }),
      });
      const data = (await res.json()) as {
        error?: string;
        analysis?: string;
        horizon?: string;
        runId?: string;
        usedAi?: boolean;
        method?: "openai" | "news" | "flat";
      };
      if (!res.ok) {
        throw new Error(data.error ?? `Forecast failed (${String(res.status)})`);
      }
      if (data.method === "flat") {
        setStatusIsWarning(true);
        setStatus(
          data.analysis ??
            "Flat at spot — check NEWSAPI_API_KEY for headlines.",
        );
      } else {
        setStatus(
          data.analysis !== undefined && data.analysis !== ""
            ? data.analysis.slice(0, 120) +
                (data.analysis.length > 120 ? "…" : "")
            : `Saved ${data.horizon ?? horizon} forecast`,
        );
      }
      if (data.runId !== undefined && data.runId !== "") {
        setSelectedForecastRunId(data.runId);
      }
      refreshChartData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Forecast failed";
      setError(msg);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Forecast horizon
      </p>
      <div className="flex flex-wrap gap-1">
        {FORECAST_HORIZONS.map((h) => (
          <button
            key={h}
            type="button"
            disabled={loading}
            onClick={() => {
              setHorizon(h);
            }}
            className={cn(
              "min-w-[2.25rem] flex-1 cursor-pointer rounded-md border px-1 py-1 text-[10px] font-medium transition-colors disabled:cursor-not-allowed",
              horizon === h
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:bg-muted/50",
            )}
          >
            {HORIZON_SHORT[h]}
          </button>
        ))}
      </div>
      <Button
        type="button"
        variant="default"
        size="sm"
        className="w-full gap-1.5"
        disabled={loading}
        onClick={() => {
          void onForecast();
        }}
      >
        {loading ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <Sparkles className="size-3.5" aria-hidden />
        )}
        Forecast
      </Button>
      {error !== null ? (
        <p className="text-[10px] leading-tight text-destructive">{error}</p>
      ) : null}
      {status !== null && error === null ? (
        <p
          className={cn(
            "text-[10px] leading-tight",
            statusIsWarning
              ? "font-medium text-amber-700 dark:text-amber-300"
              : "text-muted-foreground",
          )}
        >
          {status}
        </p>
      ) : null}
    </div>
  );
}
