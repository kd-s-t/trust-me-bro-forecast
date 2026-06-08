import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import {
  binanceMarketSymbol,
  fetchBinanceTickerPrice,
} from "@/lib/binance/market";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const auth = await requireAuth();
  if ("response" in auth) {
    return auth.response;
  }

  try {
    const price = await fetchBinanceTickerPrice();
    return NextResponse.json({
      symbol: binanceMarketSymbol(),
      price,
      fetchedAtMs: Date.now(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
