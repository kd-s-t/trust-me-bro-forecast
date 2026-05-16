"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { ForecastRunListItem } from "@/lib/chart/loadForecastPayload";
import {
  getSelectedForecastRunId,
  setSelectedForecastRunId,
} from "@/lib/chart/forecastSelection";
import { CHART_DATA_REFRESH_EVENT } from "@/lib/chart/refreshChart";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export function ForecastSelect({ className }: Props) {
  const [runs, setRuns] = useState<ForecastRunListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>(() => {
    return getSelectedForecastRunId() ?? "";
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRuns = useCallback(async (preferRunId?: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/forecast/runs", { cache: "no-store" });
      const body = (await res.json()) as {
        runs?: ForecastRunListItem[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to load forecasts");
      }
      const list = body.runs ?? [];
      setRuns(list);

      const preferred =
        preferRunId ??
        getSelectedForecastRunId() ??
        (list[0] !== undefined ? list[0].id : null);

      if (preferred !== null && list.some((r) => r.id === preferred)) {
        setSelectedId(preferred);
        setSelectedForecastRunId(preferred);
      } else if (list[0] !== undefined) {
        setSelectedId(list[0].id);
        setSelectedForecastRunId(list[0].id);
      } else {
        setSelectedId("");
        setSelectedForecastRunId(null);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load forecasts";
      setError(message);
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRuns();
    const onRefresh = (): void => {
      void loadRuns(getSelectedForecastRunId());
    };
    window.addEventListener(CHART_DATA_REFRESH_EVENT, onRefresh);
    return () => {
      window.removeEventListener(CHART_DATA_REFRESH_EVENT, onRefresh);
    };
  }, [loadRuns]);

  function onChange(nextId: string): void {
    setSelectedId(nextId);
    setSelectedForecastRunId(nextId === "" ? null : nextId);
  }

  if (loading && runs.length === 0) {
    return (
      <div className={cn("flex items-center justify-center py-2", className)}>
        <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <p className={cn("text-[10px] text-muted-foreground", className)}>
        No saved forecasts yet. Run Forecast to create one.
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor="forecast-select"
        className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
      >
        Get forecast
      </label>
      <select
        id="forecast-select"
        value={selectedId}
        disabled={loading}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        className={cn(
          "w-full cursor-pointer rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          loading && "opacity-60",
        )}
      >
        {runs.map((run) => (
          <option key={run.id} value={run.id}>
            {run.label}
          </option>
        ))}
      </select>
      {error !== null ? (
        <p className="text-[10px] leading-tight text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
