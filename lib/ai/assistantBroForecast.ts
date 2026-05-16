import type { ForecastHorizon } from "@/lib/forecast/horizons";
import { weeklyTimestamps } from "@/lib/forecast/horizons";
import type { PricePoint } from "@/lib/history";
import type { NewsArticle } from "@/lib/news/types";
import {
  ASSISTANT_BRO_ANALYSIS_PREFIX,
  ASSISTANT_BRO_OUTPUT_SCHEMA,
  ASSISTANT_BRO_SYSTEM_PROMPT,
  buildAssistantBroUserPrompt,
} from "./assistantBroPrompt";
import { isOpenAiConfigured, type AiForecastResult } from "./forecastAgent";

type AiResponseJson = {
  reasoning?: string;
  points?: { date?: string; price?: number }[];
};

function parseYmdUtcMs(ymd: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (m === null) {
    return null;
  }
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isFinite(t) ? t : null;
}

function interpolateToWeekly(
  raw: { timeMs: number; price: number }[],
  schedule: number[],
  startMs: number,
  startPrice: number,
): PricePoint[] {
  const sorted = [...raw].sort((a, b) => a.timeMs - b.timeMs);
  const curve = [{ timeMs: startMs, price: startPrice }, ...sorted];

  const out: PricePoint[] = [];
  for (const t of schedule) {
    let price = curve[curve.length - 1]!.price;
    for (let i = 1; i < curve.length; i++) {
      const a = curve[i - 1]!;
      const b = curve[i]!;
      if (t >= a.timeMs && t <= b.timeMs) {
        const span = b.timeMs - a.timeMs;
        const w = span > 0 ? (t - a.timeMs) / span : 0;
        price = a.price + (b.price - a.price) * w;
        break;
      }
    }
    out.push({ timeMs: t, price, amount: 1 });
  }
  return out;
}

/** NewsAPI top 3 + user instructions → OpenAI → weekly path for Postgres. */
export async function generateAssistantBroForecast(input: {
  articles: NewsArticle[];
  horizon: ForecastHorizon;
  startMs: number;
  endMs: number;
  startPrice: number;
  instructions: string;
}): Promise<AiForecastResult> {
  if (!isOpenAiConfigured()) {
    throw new Error(
      "Assistant Bro requires OPENAI_API_KEY in .env",
    );
  }

  const instructions = input.instructions.trim();
  if (instructions === "") {
    throw new Error("Instructions are required");
  }

  if (input.articles.length === 0) {
    throw new Error(
      "No bitcoin news returned from NewsAPI. Check NEWSAPI_API_KEY.",
    );
  }

  const schedule = weeklyTimestamps(input.startMs, input.endMs);
  const key = process.env.OPENAI_API_KEY?.trim() ?? "";
  const model = process.env.OPENAI_MODEL?.trim() ?? "gpt-4o-mini";

  const system = `${ASSISTANT_BRO_SYSTEM_PROMPT}\n\n${ASSISTANT_BRO_OUTPUT_SCHEMA}`;
  const user = buildAssistantBroUserPrompt({
    ...input,
    instructions,
    weekCount: schedule.length,
  });

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.25,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `OpenAI error (${String(res.status)}): ${errText.slice(0, 300)}`,
    );
  }

  const body = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = body.choices?.[0]?.message?.content;
  if (content === undefined || content === "") {
    throw new Error("OpenAI returned empty forecast");
  }

  let parsed: AiResponseJson;
  try {
    parsed = JSON.parse(content) as AiResponseJson;
  } catch {
    throw new Error("OpenAI returned invalid JSON");
  }

  const rawPoints: { timeMs: number; price: number }[] = [];
  for (const p of parsed.points ?? []) {
    if (typeof p.date !== "string" || typeof p.price !== "number") {
      continue;
    }
    if (!Number.isFinite(p.price) || p.price <= 0) {
      continue;
    }
    const timeMs = parseYmdUtcMs(p.date);
    if (timeMs === null) {
      continue;
    }
    rawPoints.push({ timeMs, price: p.price });
  }

  if (rawPoints.length === 0) {
    throw new Error("Assistant Bro forecast contained no valid price points");
  }

  const reasoning =
    typeof parsed.reasoning === "string" && parsed.reasoning.trim() !== ""
      ? parsed.reasoning.trim()
      : "Tailored outlook from headlines and your instructions.";

  const analysis = `${ASSISTANT_BRO_ANALYSIS_PREFIX}${reasoning}`;
  const points = interpolateToWeekly(
    rawPoints,
    schedule,
    input.startMs,
    input.startPrice,
  );
  if (points.length > 0) {
    points[points.length - 1]!.note = analysis.slice(0, 200);
  }

  return { analysis, points, usedAi: true, method: "openai" };
}
