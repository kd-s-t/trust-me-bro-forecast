import { DEFAULT_HISTORY_SYMBOL, getLatestSpot } from "@/lib/db/history";
import { insertForecastRun } from "@/lib/db/forecast";
import type { ForecastRun } from "@/lib/db/forecast";
import {
  generateForecastFromNews,
  type ForecastMethod,
} from "@/lib/ai/forecastAgent";
import { fetchTopBitcoinNews } from "@/lib/news/fetchNews";
import {
  horizonEndMs,
  type ForecastHorizon,
} from "./horizons";

export async function createForecastFromNews(
  horizon: ForecastHorizon,
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

  const run = await insertForecastRun({
    symbol,
    horizon,
    startTimeMs: spot.timeMs,
    endTimeMs: endMs,
    startPrice: spot.price,
    analysis: ai.analysis,
    newsArticles: articles,
    points: ai.points,
  });
  return { run, usedAi: ai.usedAi, method: ai.method };
}
