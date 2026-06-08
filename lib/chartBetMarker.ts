import type { CandlestickData, SeriesMarker, Time } from "lightweight-charts";
import type { PricePoint } from "@/lib/history";

/** Jun 2, 2026 9:00 PM Philippines (UTC+8). */
export const BET_PURCHASE_TIME_MS = Date.parse("2026-06-02T21:00:00+08:00");

/** UTC midnight for the Jun 2 bar on the chart. */
export const BET_PURCHASE_CHART_TIME_MS = Date.UTC(2026, 5, 2);

export const BET_PURCHASE_UTC_DAY = "2026-06-02";

export const BET_PURCHASE_PESO_SPENT = 18_775.41;
export const BET_PURCHASE_PESO_PER_BTC = 5_014_897.28;

/** Chart label — you already filled this on Binance; not a new trade in the app. */
export const BET_PURCHASE_SHORT = "Bought Jun 2";

export const BET_PURCHASE_DETAIL =
  "Already bought on Binance · Jun 2, 2026 · ₱18,775.41 @ ₱5,014,897.28/BTC";

export function betPurchaseUsdPrice(pesoPerUsd: number): number {
  return BET_PURCHASE_PESO_PER_BTC / pesoPerUsd;
}

export function betPurchaseBtcAmount(): number {
  return BET_PURCHASE_PESO_SPENT / BET_PURCHASE_PESO_PER_BTC;
}

export function utcDayFromTimeMs(timeMs: number): string {
  return new Date(timeMs).toISOString().slice(0, 10);
}

function lastCloseBeforeBetDay(points: PricePoint[]): number | null {
  let price: number | null = null;
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    if (p.timeMs < BET_PURCHASE_CHART_TIME_MS) {
      price = p.price;
    }
  }
  return price;
}

/**
 * Place the pin on Jun 2 without faking a huge move: anchor bar uses the last
 * market close before that day (real Kaggle row wins when present).
 */
export function injectBetPurchasePoint(
  points: PricePoint[],
  _pesoPerUsd: number,
): PricePoint[] {
  for (let i = 0; i < points.length; i++) {
    if (utcDayFromTimeMs(points[i]!.timeMs) === BET_PURCHASE_UTC_DAY) {
      return points;
    }
  }
  const bridgeClose = lastCloseBeforeBetDay(points);
  if (bridgeClose === null) {
    return points;
  }
  const merged = [
    ...points,
    {
      timeMs: BET_PURCHASE_CHART_TIME_MS,
      price: bridgeClose,
      amount: betPurchaseBtcAmount(),
      note: BET_PURCHASE_DETAIL,
    },
  ];
  merged.sort((a, b) => a.timeMs - b.timeMs);
  return merged;
}

export function findBetCandle(
  candles: CandlestickData<Time>[],
  timeToMs: (t: Time) => number,
): CandlestickData<Time> | undefined {
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i]!;
    if (utcDayFromTimeMs(timeToMs(c.time)) === BET_PURCHASE_UTC_DAY) {
      return c;
    }
  }
  return undefined;
}

export function betPurchaseMarker(candleTime: Time): SeriesMarker<Time> {
  return {
    time: candleTime,
    position: "belowBar",
    shape: "arrowUp",
    color: "#d97706",
    text: BET_PURCHASE_SHORT,
  };
}
