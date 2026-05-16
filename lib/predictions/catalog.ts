export type PredictionItem = {
  id: string;
  label: string;
  active?: boolean;
};

export type PredictionCategory = {
  id: string;
  label: string;
  items: PredictionItem[];
};

/** Initial seed — migrated into Postgres on `npm run db:migrate`. */
export const PREDICTION_CATALOG_SEED: readonly PredictionCategory[] = [
  {
    id: "stocks",
    label: "Top 3 stocks",
    items: [
      { id: "aapl", label: "AAPL" },
      { id: "nvda", label: "NVDA" },
      { id: "msft", label: "MSFT" },
    ],
  },
  {
    id: "crypto",
    label: "Top 3 crypto",
    items: [
      { id: "btc", label: "BTC", active: true },
      { id: "eth", label: "ETH" },
      { id: "sol", label: "SOL" },
    ],
  },
  {
    id: "products",
    label: "Top 3 products",
    items: [
      { id: "iphone", label: "iPhone" },
      { id: "tesla-m3", label: "Model 3" },
      { id: "rtx", label: "RTX GPU" },
    ],
  },
  {
    id: "commodities",
    label: "Top 3 commodities",
    items: [
      { id: "gold", label: "Gold" },
      { id: "oil", label: "Oil" },
      { id: "silver", label: "Silver" },
    ],
  },
] as const;
