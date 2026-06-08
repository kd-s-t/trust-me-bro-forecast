import { NextResponse } from "next/server";
import { binanceMarketSymbol } from "@/lib/binance/market";
import { syncBinanceIncrementalToDb } from "@/lib/binance/syncMarketToDb";
import { requireAuth } from "@/lib/auth/requireAuth";
import { DEFAULT_HISTORY_SYMBOL } from "@/lib/db/history";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Live tick: latest DB → now, saved to Postgres (call every ~15s). */
export async function POST(): Promise<NextResponse> {
  const auth = await requireAuth();
  if ("response" in auth) {
    return auth.response;
  }

  try {
    const data = await syncBinanceIncrementalToDb(DEFAULT_HISTORY_SYMBOL);
    return NextResponse.json({
      symbol: binanceMarketSymbol(),
      upserted: data.upserted,
      price: data.price,
      timeMs: data.timeMs,
      fromTimeMs: data.fromTimeMs,
      autoTrade: data.autoTrade,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
