/** Pull latest Binance market into Postgres (same as the 15s chart poll). */
export async function syncChartMarketToDb(): Promise<{
  price: number;
  timeMs: number;
  upserted: number;
} | null> {
  const res = await fetch("/api/binance/sync", {
    method: "POST",
    cache: "no-store",
  });
  const body = (await res.json()) as {
    price?: number;
    timeMs?: number;
    upserted?: number;
    error?: string;
  };
  if (!res.ok || typeof body.price !== "number" || typeof body.timeMs !== "number") {
    return null;
  }
  return {
    price: body.price,
    timeMs: body.timeMs,
    upserted: body.upserted ?? 0,
  };
}
