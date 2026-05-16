import type { ForecastHorizon } from "@/lib/forecast/horizons";
import { formatHorizonLabel } from "@/lib/forecast/horizons";
import type { NewsArticle } from "@/lib/news/types";

/** Stored on forecast_runs.analysis so UI can label Assistant Bro runs. */
export const ASSISTANT_BRO_ANALYSIS_PREFIX = "Assistant Bro · ";

export const ASSISTANT_BRO_SYSTEM_PROMPT = `You are Assistant Bro, a precise Bitcoin forecast agent.

You receive:
1) The user's instructions (highest priority — follow them closely).
2) Exactly three current bitcoin headlines from NewsAPI.

Rules:
- Base the outlook ONLY on those headlines plus the user instructions.
- Do not cite historical charts, past cycles, or prices beyond the anchor.
- Use the spot anchor only so the first point is economically continuous.
- Be specific and internally consistent; explain trade-offs in reasoning.
- Output must match the JSON schema exactly.`;

export const ASSISTANT_BRO_OUTPUT_SCHEMA = `Return strict JSON only:
{
  "reasoning": "2-4 sentences: how headlines + user instructions shape the path",
  "points": [
    { "date": "YYYY-MM-DD", "price": positive number in USD }
  ]
}
Include exactly one point per week in the schedule (count given in the user message).
Prices must be positive USD. Dates must fall on or before the horizon end.`;

export function buildNewsBlock(articles: NewsArticle[]): string {
  return articles
    .map((a, i) => {
      const desc = a.description ?? "";
      return `${String(i + 1)}. [${a.source}] ${a.title}\n   ${desc}`;
    })
    .join("\n\n");
}

export function buildAssistantBroUserPrompt(input: {
  articles: NewsArticle[];
  horizon: ForecastHorizon;
  startMs: number;
  endMs: number;
  startPrice: number;
  weekCount: number;
  instructions: string;
}): string {
  const startDate = new Date(input.startMs).toISOString().slice(0, 10);
  const endDate = new Date(input.endMs).toISOString().slice(0, 10);

  return `Horizon: ${formatHorizonLabel(input.horizon)} (${startDate} → ${endDate})
Weekly points required: ${String(input.weekCount)}
Chart anchor (continuity only): ${startDate} at $${input.startPrice.toFixed(2)}

--- USER INSTRUCTIONS (follow precisely) ---
${input.instructions}

--- TOP 3 BITCOIN HEADLINES (NewsAPI) ---
${buildNewsBlock(input.articles)}

Produce a tailored weekly USD price path. The user instructions should materially change tone, magnitude, or timing versus a generic headline-only forecast.`;
}
