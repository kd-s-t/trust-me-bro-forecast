import type { NewsArticle, NewsSentiment } from "./types";

const BULLISH = [
  "surge",
  "rally",
  "soar",
  "record high",
  "all-time high",
  "ath",
  "bull",
  "bullish",
  "inflow",
  "approval",
  "adoption",
  "etf inflow",
  "breakout",
  "recovery",
  "gain",
  "gains",
  "rise",
  "rises",
  "jump",
  "jumps",
  "optimism",
  "upgrade",
];

const BEARISH = [
  "crash",
  "plunge",
  "drop",
  "drops",
  "fall",
  "falls",
  "bear",
  "bearish",
  "outflow",
  "ban",
  "hack",
  "fraud",
  "lawsuit",
  "selloff",
  "sell-off",
  "fear",
  "risk",
  "warning",
  "decline",
  "slump",
  "tumble",
  "collapse",
  "crackdown",
  "sec sues",
];

function scoreText(text: string): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const w of BULLISH) {
    if (lower.includes(w)) {
      score += 1;
    }
  }
  for (const w of BEARISH) {
    if (lower.includes(w)) {
      score -= 1;
    }
  }
  return score;
}

function labelForScore(score: number): NewsSentiment["label"] {
  if (score >= 2) {
    return "bullish";
  }
  if (score >= 1) {
    return "slightly bullish";
  }
  if (score <= -2) {
    return "bearish";
  }
  if (score <= -1) {
    return "slightly bearish";
  }
  return "neutral";
}

export function scoreArticlesSentiment(articles: NewsArticle[]): NewsSentiment {
  let total = 0;
  for (const a of articles) {
    const blob = `${a.title} ${a.description ?? ""}`;
    total += scoreText(blob);
  }
  const n = articles.length;
  const score = n > 0 ? Math.max(-1, Math.min(1, total / (n * 2))) : 0;
  return {
    score,
    label: labelForScore(total),
    articleCount: n,
    topHeadlines: articles.slice(0, 3).map((a) => a.title),
  };
}

/** Weekly path from headline sentiment (no OpenAI). Stronger tilt near-term, fades later. */
export function buildWeeklyPathFromSentiment(
  schedule: number[],
  startPrice: number,
  sentimentScore: number,
): { timeMs: number; price: number }[] {
  if (schedule.length === 0) {
    return [];
  }

  const weeks = schedule.length;
  const horizonMove = sentimentScore * 0.12;
  const prices: number[] = [startPrice];

  for (let i = 0; i < weeks; i++) {
    const progress = (i + 1) / weeks;
    const fade = 1 - progress * 0.45;
    const weeklyDrift = (horizonMove / weeks) * fade;
    const prev = prices[prices.length - 1]!;
    const next = Math.max(prev * 0.5, prev * (1 + weeklyDrift));
    prices.push(next);
  }

  return schedule.map((timeMs, i) => ({
    timeMs,
    price: prices[i + 1]!,
  }));
}
