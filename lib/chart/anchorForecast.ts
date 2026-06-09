import type { PricePoint } from "@/lib/history";

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
