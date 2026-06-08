"use client";

import { Bot, Loader2, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { setSelectedForecastRunId } from "@/lib/chart/forecastSelection";
import { refreshChartData } from "@/lib/chart/refreshChart";
import { getSelectedForecastHorizon } from "@/lib/forecast/selectedHorizon";
import { userFacingMessage } from "@/lib/errors/userFacingMessage";
import { cn } from "@/lib/utils";

export function AssistantBro() {
  const [openAiConfigured, setOpenAiConfigured] = useState<boolean | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/assistant", { cache: "no-store" });
        const body = (await res.json()) as {
          openAiConfigured?: boolean;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(body.error ?? "Failed to check Assistant Bro");
        }
        if (!cancelled) {
          setOpenAiConfigured(body.openAiConfigured === true);
        }
      } catch {
        if (!cancelled) {
          setOpenAiConfigured(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSend(): Promise<void> {
    const instructions = message.trim();
    if (!openAiConfigured || instructions === "" || loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/assistant/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          horizon: getSelectedForecastHorizon(),
          instructions,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        runId?: string;
        analysis?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? `Forecast failed (${String(res.status)})`);
      }
      setMessage("");
      if (data.runId !== undefined && data.runId !== "") {
        setSelectedForecastRunId(data.runId);
      }
      refreshChartData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Forecast failed";
      setError(userFacingMessage(msg));
    } finally {
      setLoading(false);
    }
  }

  const disabled = loading || openAiConfigured !== true;
  const placeholder =
    openAiConfigured === false
      ? "OPENAI_API_KEY required in .env"
      : "Be specific — e.g. weight ETF flows, ignore altcoin noise…";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-1.5 border-b border-border px-3 py-2">
        <Bot className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Assistant Bro
        </p>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col p-3">
        {openAiConfigured === null ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2
              className="size-5 animate-spin text-muted-foreground"
              aria-hidden
            />
          </div>
        ) : (
          <>
            <div
              className={cn(
                "relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background",
                "focus-within:ring-2 focus-within:ring-ring",
                disabled && "opacity-60",
              )}
            >
              <textarea
              id="assistant-bro-input"
              value={message}
              disabled={disabled}
              onChange={(e) => {
                setMessage(e.target.value);
                if (error !== null) {
                  setError(null);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void onSend();
                }
              }}
              placeholder={placeholder}
              className={cn(
                "min-h-0 h-full w-full flex-1 resize-none border-0 bg-transparent px-2 py-1.5 pb-8 pr-9 text-xs text-foreground",
                "placeholder:text-muted-foreground/70",
                "focus-visible:outline-none",
                disabled && "cursor-not-allowed",
              )}
              aria-label="Assistant Bro message"
              aria-busy={loading}
            />
              <div className="absolute bottom-1.5 right-1.5">
                {loading ? (
                  <Loader2
                    className="size-4 animate-spin text-muted-foreground"
                    aria-hidden
                  />
                ) : (
                  <button
                    type="button"
                    disabled={disabled || message.trim() === ""}
                    aria-label="Send"
                    className={cn(
                      "flex size-6 cursor-pointer items-center justify-center rounded",
                      "text-muted-foreground hover:bg-muted hover:text-foreground",
                      "disabled:cursor-not-allowed disabled:opacity-40",
                    )}
                    onClick={() => {
                      void onSend();
                    }}
                  >
                    <Send className="size-3.5" aria-hidden />
                  </button>
                )}
              </div>
            </div>
            {openAiConfigured ? (
              <p className="mt-1 shrink-0 text-[9px] leading-relaxed text-muted-foreground/80">
                Sends top 3 NewsAPI headlines + your message to OpenAI, saves
                forecast. Enter to send · Shift+Enter for new line
              </p>
            ) : null}
            {error !== null ? (
              <p className="mt-1 shrink-0 text-[10px] leading-tight text-destructive">
                {error}
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
