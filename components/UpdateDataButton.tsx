"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SyncResponse = {
  inserted: number;
  scanned: number;
  skippedExisting: number;
  previousMaxTimeMs: number | null;
  newMaxTimeMs: number | null;
  csvPath: string;
  skippedDownload?: boolean;
  parseMode?: "skipped" | "full" | "tail";
  error?: string;
};

function formatTimeMs(ms: number | null): string {
  if (ms === null) {
    return "—";
  }
  return new Date(ms).toISOString().slice(0, 10);
}

type Props = {
  className?: string;
};

export function UpdateDataButton({ className }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onUpdate(): Promise<void> {
    setLoading(true);
    const toastId = toast.loading("Syncing from Kaggle…");
    try {
      const res = await fetch("/api/data/update", { method: "POST" });
      const data = (await res.json()) as SyncResponse;
      if (!res.ok) {
        throw new Error(data.error ?? `Update failed (${String(res.status)})`);
      }
      if (data.skippedDownload === true) {
        toast.success("Already up to date", {
          id: toastId,
          description: "Kaggle dataset version unchanged — no download.",
        });
      } else if (data.inserted === 0) {
        toast.success("Already up to date", {
          id: toastId,
          description:
            data.parseMode === "tail"
              ? "Synced CSV tail; no new rows."
              : "No new rows from Kaggle.",
        });
      } else {
        toast.success(`Added ${data.inserted.toLocaleString()} row(s)`, {
          id: toastId,
          description: `Latest data: ${formatTimeMs(data.newMaxTimeMs)}`,
        });
      }
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Update failed";
      toast.error(message, { id: toastId });
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
        "border-border/80 bg-background shadow-sm",
        className,
      )}
      disabled={loading}
      aria-busy={loading}
      onClick={() => {
        void onUpdate();
      }}
    >
      {loading ? (
        <Loader2 className="animate-spin" aria-hidden />
      ) : null}
      {loading ? "Updating…" : "Update data"}
    </Button>
  );
}
