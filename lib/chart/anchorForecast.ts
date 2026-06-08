import type { PricePoint } from "@/lib/history";

/** Drop forecast points at or before the chart’s last candle; line starts at that close. */
export function forecastTailAfterObserved(
  lastObs: PricePoint,
  forecast: PricePoint[],
): PricePoint[] {
  const tail: PricePoint[] = [];
  for (let i = 0; i < forecast.length; i++) {
    const p = forecast[i]!;
    if (p.timeMs > lastObs.timeMs) {
      tail.push(p);
    }
  }
  tail.sort((a, b) => a.timeMs - b.timeMs);
  return tail;
}

/** First saved forecast point = spot at run time (weekly path starts the week after). */
export function withForecastAnchor(
  startMs: number,
  startPrice: number,
  points: PricePoint[],
): PricePoint[] {
  const anchor: PricePoint = {
    timeMs: startMs,
    price: startPrice,
    amount: 1,
  };
  const tail = points.filter((p) => p.timeMs > startMs);
  return [anchor, ...tail];
}
