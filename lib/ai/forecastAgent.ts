import type { ForecastHorizon } from "@/lib/forecast/horizons";
import { formatHorizonLabel, weeklyTimestamps } from "@/lib/forecast/horizons";
import type { PricePoint } from "@/lib/history";
import {
  buildWeeklyPathFromSentiment,
  scoreArticlesSentiment,
} from "@/lib/news/sentiment";
import type { NewsArticle } from "@/lib/news/types";

export type ForecastMethod = "openai" | "news" | "flat";

export type AiForecastResult = {
  analysis: string;
  points: PricePoint[];
  usedAi: boolean;
  method: ForecastMethod;
};

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

function buildNewsBlock(articles: NewsArticle[]): string {
  return articles
    .map((a, i) => {
      const desc = a.description ?? "";
      return `${String(i + 1)}. [${a.source}] ${a.title}\n   ${desc}`;
    })
    .join("\n\n");
}

export function isOpenAiConfigured(): boolean {
  const key = process.env.OPENAI_API_KEY?.trim();
  return key !== undefined && key !== "";
}

function flatForecast(
  input: {
    startMs: number;
    endMs: number;
    startPrice: number;
  },
  analysis: string,
): AiForecastResult {
  const schedule = weeklyTimestamps(input.startMs, input.endMs);
  const points: PricePoint[] = schedule.map((timeMs, i) => ({
    timeMs,
    price: input.startPrice,
    amount: 1,
    note: i === schedule.length - 1 ? analysis.slice(0, 200) : undefined,
  }));
  return { analysis, points, usedAi: false, method: "flat" };
}

/** NewsAPI headlines → sentiment-shaped weekly path (no OpenAI). */
function forecastFromNewsSentiment(input: {
  articles: NewsArticle[];
  horizon: ForecastHorizon;
  startMs: number;
  endMs: number;
  startPrice: number;
}): AiForecastResult {
  const schedule = weeklyTimestamps(input.startMs, input.endMs);
  const sentiment = scoreArticlesSentiment(input.articles);
  const raw = buildWeeklyPathFromSentiment(
    schedule,
    input.startPrice,
    sentiment.score,
  );

  const headlines = sentiment.topHeadlines.join(" · ");
  const analysis = [
    `News outlook · ${sentiment.label} (${sentiment.score >= 0 ? "+" : ""}${sentiment.score.toFixed(2)})`,
    headlines !== "" ? headlines.slice(0, 120) : "Top headlines",
  ].join(" · ");

  const points: PricePoint[] = raw.map((p, i) => ({
    timeMs: p.timeMs,
    price: p.price,
    amount: 1,
    note: i === raw.length - 1 ? analysis.slice(0, 200) : undefined,
  }));

  return { analysis, points, usedAi: false, method: "news" };
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

/** Quick forecast: NewsAPI top 3 → OpenAI or news-sentiment path (no custom instructions). */
export async function generateForecastFromNews(input: {
  articles: NewsArticle[];
  horizon: ForecastHorizon;
  startMs: number;
  endMs: number;
  startPrice: number;
}): Promise<AiForecastResult> {
  if (!isOpenAiConfigured()) {
    if (input.articles.length === 0) {
      return flatForecast(
        input,
        "Flat at spot — no headlines (check NEWSAPI_API_KEY).",
      );
    }
    return forecastFromNewsSentiment(input);
  }

  const schedule = weeklyTimestamps(input.startMs, input.endMs);
  const key = process.env.OPENAI_API_KEY?.trim() ?? "";

  if (input.articles.length === 0) {
    throw new Error(
      "No bitcoin news returned from NewsAPI. Check NEWSAPI_API_KEY.",
    );
  }

  const startDate = new Date(input.startMs).toISOString().slice(0, 10);
  const endDate = new Date(input.endMs).toISOString().slice(0, 10);
  const model = process.env.OPENAI_MODEL?.trim() ?? "gpt-4o-mini";

  const system = `You are a Bitcoin outlook assistant. You must base the forecast ONLY on the news articles provided.
Do not reference historical price trends, charts, or past performance.
You may use the starting price only as a numeric anchor so the path begins at that level.
Return strict JSON with keys: reasoning (string), points (array of {date: YYYY-MM-DD, price: number}).
Include one point per week from start to horizon end (${String(schedule.length)} points). Prices must be positive USD.`;

  const user = `Horizon: ${formatHorizonLabel(input.horizon)} (${startDate} → ${endDate})
Chart anchor (continuity only): ${startDate} at $${input.startPrice.toFixed(2)}

Top bitcoin news:
${buildNewsBlock(input.articles)}

Produce a weekly price path driven only by how this news affects demand, regulation, flows, and risk appetite.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI error (${String(res.status)}): ${errText.slice(0, 300)}`);
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
    throw new Error("AI forecast contained no valid price points");
  }

  const reasoning =
    typeof parsed.reasoning === "string" && parsed.reasoning.trim() !== ""
      ? parsed.reasoning.trim()
      : "AI forecast from top 3 bitcoin headlines.";

  const points = interpolateToWeekly(
    rawPoints,
    schedule,
    input.startMs,
    input.startPrice,
  );

  return { analysis: reasoning, points, usedAi: true, method: "openai" };
}
