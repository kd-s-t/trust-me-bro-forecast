import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fetchBinanceLiveMarket } from "@/lib/binance/market";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Live BTC/USDT price + recent daily klines (public Binance market data). */
export async function GET(): Promise<NextResponse> {
  const auth = await requireAuth();
  if ("response" in auth) {
    return auth.response;
  }

  try {
    const data = await fetchBinanceLiveMarket();
    return NextResponse.json({
      symbol: data.symbol,
      price: data.price,
      klines: data.klines,
      fetchedAtMs: data.fetchedAtMs,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
