"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { fadeInOutItem } from "@/components/MotionLayout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { ForecastRunListItem } from "@/lib/chart/loadForecastPayload";
import {
  getSelectedForecastRunId,
  setSelectedForecastRunId,
} from "@/lib/chart/forecastSelection";
import {
  CHART_DATA_REFRESH_EVENT,
  refreshChartData,
} from "@/lib/chart/refreshChart";
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
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedRun = runs.find((r) => r.id === selectedId);
  const selectedLabel = selectedRun?.label ?? "this forecast";

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

  async function confirmDelete(): Promise<void> {
    if (selectedId === "") {
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/forecast?runId=${encodeURIComponent(selectedId)}`,
        { method: "DELETE" },
      );
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to delete forecast");
      }
      setDeleteOpen(false);
      await loadRuns();
      refreshChartData();
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to delete forecast";
      setError(message);
    } finally {
      setDeleting(false);
    }
  }

  const view =
    loading && runs.length === 0
      ? "loading"
      : runs.length === 0
        ? "empty"
        : "list";

  return (
    <AnimatePresence mode="wait" initial={false}>
      {view === "loading" ? (
        <motion.div
          key="loading"
          className={cn("flex items-center justify-center py-2", className)}
          variants={fadeInOutItem}
          initial="hidden"
          animate="show"
          exit="exit"
        >
          <Loader2
            className="size-4 animate-spin text-muted-foreground"
            aria-hidden
          />
        </motion.div>
      ) : null}
      {view === "empty" ? (
        <motion.p
          key="empty"
          className={cn("text-[10px] text-muted-foreground", className)}
          variants={fadeInOutItem}
          initial="hidden"
          animate="show"
          exit="exit"
        >
          No saved forecasts yet. Run Forecast to create one.
        </motion.p>
      ) : null}
      {view === "list" ? (
        <motion.div
          key="list"
          className={cn("flex flex-col gap-1.5", className)}
          variants={fadeInOutItem}
          initial="hidden"
          animate="show"
          exit="exit"
        >
      <label
        htmlFor="forecast-select"
        className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
      >
        Forecasts
      </label>
      <div className="flex gap-1.5">
        <select
          id="forecast-select"
          value={selectedId}
          disabled={loading || deleting}
          onChange={(e) => {
            onChange(e.target.value);
          }}
          className={cn(
            "min-w-0 flex-1 cursor-pointer rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            (loading || deleting) && "opacity-60",
          )}
        >
          {runs.map((run) => (
            <option key={run.id} value={run.id}>
              {run.label}
            </option>
          ))}
        </select>
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 shrink-0"
            disabled={loading || deleting || selectedId === ""}
            aria-label="Delete selected forecast"
            onClick={() => {
              setDeleteOpen(true);
            }}
          >
            {deleting ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="size-3.5" aria-hidden />
            )}
          </Button>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete forecast?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete &ldquo;{selectedLabel}&rdquo;. This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={(e) => {
                  e.preventDefault();
                  void confirmDelete();
                }}
              >
                {deleting ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden />
                    Deleting…
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {error !== null ? (
        <p className="text-[10px] leading-tight text-destructive">{error}</p>
      ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
