export type NewsArticle = {
  title: string;
  description: string | null;
  source: string;
  publishedAt: string;
};

export type NewsSentiment = {
  score: number;
  label: "bearish" | "slightly bearish" | "neutral" | "slightly bullish" | "bullish";
  articleCount: number;
  topHeadlines: string[];
};
