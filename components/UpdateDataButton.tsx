"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SyncJobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

type JobResponse = {
  jobId: string;
  status: SyncJobStatus;
  message: string | null;
  phase: string | null;
  scanned?: number;
  uploadedBytes?: number;
  newMaxTimeMs?: number | null;
  error?: string | null;
  alreadyRunning?: boolean;
};

type Status = {
  kind: "loading" | "success" | "error";
  message: string;
} | null;

const POLL_MS = 2_000;

function formatBytes(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)} MB`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(0)} KB`;
  }
  return `${String(n)} B`;
}

function formatTimeMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) {
    return "—";
  }
  return new Date(ms).toISOString().slice(0, 10);
}

function terminal(status: SyncJobStatus): boolean {
  return (
    status === "completed" ||
    status === "failed" ||
    status === "skipped"
  );
}

function messageForJob(job: JobResponse): string {
  if (job.message !== null && job.message !== "") {
    return job.message;
  }
  return job.phase ?? "Working…";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

type Props = {
  className?: string;
};

export function UpdateDataButton({ className }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const abortRef = useRef(false);

  async function pollJob(jobId: string): Promise<JobResponse> {
    for (;;) {
      if (abortRef.current) {
        throw new Error("Cancelled");
      }
      const res = await fetch(
        `/api/data/update?jobId=${encodeURIComponent(jobId)}`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as JobResponse & { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? `Poll failed (${String(res.status)})`);
      }
      setStatus({
        kind: "loading",
        message: messageForJob(data),
      });
      if (terminal(data.status)) {
        return data;
      }
      await sleep(POLL_MS);
    }
  }

  async function onUpdate(): Promise<void> {
    abortRef.current = false;
    setLoading(true);
    setStatus({ kind: "loading", message: "Starting sync…" });

    try {
      const res = await fetch("/api/data/update", { method: "POST" });
      const started = (await res.json()) as JobResponse & { error?: string };
      if (!res.ok) {
        throw new Error(started.error ?? `Start failed (${String(res.status)})`);
      }

      const job = await pollJob(started.jobId);

      if (job.status === "failed") {
        throw new Error(job.error ?? job.message ?? "Sync failed");
      }

      setStatus({
        kind: "success",
        message:
          job.message ??
          `Saved public + R2 · ${(job.scanned ?? 0).toLocaleString()} rows · ${formatBytes(job.uploadedBytes ?? 0)} on R2 · latest ${formatTimeMs(job.newMaxTimeMs)}`,
      });
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Update failed";
      setStatus({ kind: "error", message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn(
        "h-auto flex-col gap-0.5 border-border/80 bg-background py-2 shadow-sm",
        className,
      )}
      disabled={loading}
      aria-busy={loading}
      aria-live="polite"
      onClick={() => {
        void onUpdate();
      }}
    >
      <span className="flex items-center gap-1.5 text-xs font-medium">
        {loading ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : null}
        Update data
      </span>
      {status !== null ? (
        <span
          className={cn(
            "max-w-full text-center text-[10px] font-normal leading-tight",
            status.kind === "error"
              ? "text-destructive"
              : "text-muted-foreground",
          )}
        >
          {status.message}
        </span>
      ) : null}
    </Button>
  );
}
