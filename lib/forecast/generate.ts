import { DEFAULT_HISTORY_SYMBOL, getLatestSpot } from "@/lib/db/history";
import { insertForecastRun } from "@/lib/db/forecast";
import type { ForecastRun } from "@/lib/db/forecast";
import { generateAssistantBroForecast } from "@/lib/ai/assistantBroForecast";
import {
  generateForecastFromNews,
  type ForecastMethod,
} from "@/lib/ai/forecastAgent";
import { fetchTopBitcoinNews } from "@/lib/news/fetchNews";
import {
  horizonEndMs,
  type ForecastHorizon,
} from "./horizons";

/** Quick forecast (Controls → Forecast): headlines only, no custom instructions. */
export async function createForecastFromNews(
  horizon: ForecastHorizon,
  username: string,
  symbol: string = DEFAULT_HISTORY_SYMBOL,
): Promise<{
  run: ForecastRun;
  usedAi: boolean;
  method: ForecastMethod;
}> {
  const spot = await getLatestSpot(symbol);
  const endMs = horizonEndMs(spot.timeMs, horizon);
  const articles = await fetchTopBitcoinNews(3);

  const ai = await generateForecastFromNews({
    articles,
    horizon,
    startMs: spot.timeMs,
    endMs,
    startPrice: spot.price,
  });

  return insertForecastRunAndMeta({
    username,
    symbol,
    horizon,
    spot,
    endMs,
    articles,
    ai,
  });
}

/** Assistant Bro: NewsAPI top 3 + user instructions → OpenAI → saved forecast. */
export async function createAssistantBroForecast(
  horizon: ForecastHorizon,
  username: string,
  instructions: string,
  symbol: string = DEFAULT_HISTORY_SYMBOL,
): Promise<{
  run: ForecastRun;
  usedAi: boolean;
  method: ForecastMethod;
}> {
  const spot = await getLatestSpot(symbol);
  const endMs = horizonEndMs(spot.timeMs, horizon);
  const articles = await fetchTopBitcoinNews(3);

  const ai = await generateAssistantBroForecast({
    articles,
    horizon,
    startMs: spot.timeMs,
    endMs,
    startPrice: spot.price,
    instructions,
  });

  return insertForecastRunAndMeta({
    username,
    symbol,
    horizon,
    spot,
    endMs,
    articles,
    ai,
  });
}

async function insertForecastRunAndMeta(input: {
  username: string;
  symbol: string;
  horizon: ForecastHorizon;
  spot: { timeMs: number; price: number };
  endMs: number;
  articles: Awaited<ReturnType<typeof fetchTopBitcoinNews>>;
  ai: Awaited<ReturnType<typeof generateForecastFromNews>>;
}): Promise<{
  run: ForecastRun;
  usedAi: boolean;
  method: ForecastMethod;
}> {
  const run = await insertForecastRun({
    username: input.username,
    symbol: input.symbol,
    horizon: input.horizon,
    startTimeMs: input.spot.timeMs,
    endTimeMs: input.endMs,
    startPrice: input.spot.price,
    analysis: input.ai.analysis,
    newsArticles: input.articles,
    points: input.ai.points,
  });
  return { run, usedAi: input.ai.usedAi, method: input.ai.method };
}
