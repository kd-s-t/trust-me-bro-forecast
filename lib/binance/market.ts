import { binancePublicGet } from "@/lib/binance/publicClient";
import type { PricePoint } from "@/lib/history";

const DEFAULT_SYMBOL = "BTCUSDT";

export function binanceMarketSymbol(): string {
  const raw = process.env.BINANCE_MARKET_SYMBOL?.trim();
  return raw === undefined || raw === "" ? DEFAULT_SYMBOL : raw.toUpperCase();
}

/** Binance kline array: [openTime, open, high, low, close, volume, ...] */
type RawKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  ...unknown[],
];

function klineToPoint(row: RawKline): PricePoint | null {
  const timeMs = row[0];
  const close = Number(row[4]);
  if (!Number.isFinite(timeMs) || !Number.isFinite(close) || close <= 0) {
    return null;
  }
  return { timeMs, price: close, amount: 1 };
}

/** 1m closes from `startTimeMs` (exclusive) through now — paginated. */
export async function fetchBinanceMinuteKlinesSince(
  startTimeMs: number,
): Promise<PricePoint[]> {
  return fetchBinanceKlinesSince("1m", startTimeMs);
}

export type BinanceKlineInterval = "1m" | "15m" | "1h" | "4h" | "1d";

const DAY_MS = 86_400_000;

const INTERVAL_MS: Record<BinanceKlineInterval, number> = {
  "1m": 60_000,
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "4h": 4 * 60 * 60_000,
  "1d": DAY_MS,
};

/** Kline closes from `startTimeMs` (exclusive) through now — paginated. */
export async function fetchBinanceKlinesSince(
  interval: BinanceKlineInterval,
  startTimeMs: number,
): Promise<PricePoint[]> {
  const symbol = binanceMarketSymbol();
  const stepMs = INTERVAL_MS[interval];
  const out: PricePoint[] = [];
  let cursor = startTimeMs + 1;
  const endMs = Date.now();

  while (cursor < endMs) {
    const rows = await binancePublicGet<RawKline[]>("/api/v3/klines", {
      symbol,
      interval,
      startTime: String(cursor),
      limit: "1000",
    });
    if (rows.length === 0) {
      break;
    }
    let lastMs = cursor;
    for (let i = 0; i < rows.length; i++) {
      const p = klineToPoint(rows[i]!);
      if (p !== null && p.timeMs > startTimeMs) {
        out.push(p);
        lastMs = p.timeMs;
      }
    }
    if (rows.length < 1000) {
      break;
    }
    const next = lastMs + stepMs;
    if (next <= cursor) {
      break;
    }
    cursor = next;
  }

  out.sort((a, b) => a.timeMs - b.timeMs);
  return out;
}

export async function fetchBinanceDailyKlines(
  limit = 120,
): Promise<PricePoint[]> {
  const symbol = binanceMarketSymbol();
  const rows = await binancePublicGet<RawKline[]>("/api/v3/klines", {
    symbol,
    interval: "1d",
    limit: String(Math.min(Math.max(1, limit), 1000)),
  });
  const out: PricePoint[] = [];
  for (let i = 0; i < rows.length; i++) {
    const p = klineToPoint(rows[i]!);
    if (p !== null) {
      out.push(p);
    }
  }
  out.sort((a, b) => a.timeMs - b.timeMs);
  return out;
}

export async function fetchBinanceTickerPrice(): Promise<number> {
  const symbol = binanceMarketSymbol();
  const body = await binancePublicGet<{ price: string }>("/api/v3/ticker/price", {
    symbol,
  });
  const price = Number(body.price);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`Invalid ticker price for ${symbol}`);
  }
  return price;
}

export type BinanceLiveMarket = {
  symbol: string;
  price: number;
  klines: PricePoint[];
  fetchedAtMs: number;
};

export async function fetchBinanceLiveMarket(): Promise<BinanceLiveMarket> {
  const [klines, price] = await Promise.all([
    fetchBinanceDailyKlines(120),
    fetchBinanceTickerPrice(),
  ]);
  return {
    symbol: binanceMarketSymbol(),
    price,
    klines,
    fetchedAtMs: Date.now(),
  };
}
