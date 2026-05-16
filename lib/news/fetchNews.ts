import type { NewsArticle } from "./types";

const CACHE_TTL_MS = 30 * 60 * 1000;

let cache: { fetchedAt: number; articles: NewsArticle[] } | null = null;

type NewsApiArticle = {
  title?: string;
  description?: string | null;
  source?: { name?: string };
  publishedAt?: string;
};

type NewsApiResponse = {
  status?: string;
  articles?: NewsApiArticle[];
  message?: string;
};

function parseArticles(data: NewsApiResponse): NewsArticle[] {
  const raw = data.articles ?? [];
  const out: NewsArticle[] = [];
  for (const a of raw) {
    const title = a.title?.trim();
    if (title === undefined || title === "") {
      continue;
    }
    out.push({
      title,
      description: a.description?.trim() ?? null,
      source: a.source?.name?.trim() ?? "Unknown",
      publishedAt: a.publishedAt ?? "",
    });
  }
  return out;
}

export async function fetchBitcoinNews(options?: {
  limit?: number;
  skipCache?: boolean;
}): Promise<NewsArticle[]> {
  const key = process.env.NEWSAPI_API_KEY?.trim();
  if (key === undefined || key === "") {
    return [];
  }

  const limit = options?.limit ?? 30;
  const now = Date.now();
  if (
    options?.skipCache !== true &&
    cache !== null &&
    now - cache.fetchedAt < CACHE_TTL_MS
  ) {
    return cache.articles.slice(0, limit);
  }

  const url = new URL("https://newsapi.org/v2/everything");
  url.searchParams.set(
    "q",
    '("bitcoin" OR "BTC") AND (crypto OR cryptocurrency OR etf OR halving)',
  );
  url.searchParams.set("language", "en");
  url.searchParams.set("sortBy", "publishedAt");
  url.searchParams.set("pageSize", String(Math.min(100, Math.max(limit, 3))));
  url.searchParams.set("apiKey", key);

  const res = await fetch(url.toString(), {
    next: { revalidate: 1800 },
  });

  if (!res.ok) {
    throw new Error(
      `NewsAPI request failed (${String(res.status)} ${res.statusText})`,
    );
  }

  const data = (await res.json()) as NewsApiResponse;
  if (data.status !== "ok") {
    throw new Error(data.message ?? "NewsAPI returned an error");
  }

  const articles = parseArticles(data);
  cache = { fetchedAt: now, articles };
  return articles.slice(0, limit);
}

/** Top N bitcoin headlines for forecast generation. */
export async function fetchTopBitcoinNews(
  limit: number = 3,
): Promise<NewsArticle[]> {
  return fetchBitcoinNews({ limit, skipCache: true });
}
