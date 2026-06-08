import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import {
  autoTradeStatusForApi,
  maybeExecuteAutoTrade,
} from "@/lib/binance/autoTrade";
import { fetchBinanceTickerPrice } from "@/lib/binance/market";
import { buildBetEntrySnapshot } from "@/lib/chart/betMarketAlert";
import { loadFxConfig } from "@/lib/fxConfig";
import { anyAutoTradeEnabled } from "@/lib/binance/featureFlags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Feature flags + Jun 2 bet entry; optional dry-run evaluate (?evaluate=1). */
export async function GET(req: Request): Promise<NextResponse> {
  const auth = await requireAuth();
  if ("response" in auth) {
    return auth.response;
  }

  try {
    const { pesoPerUsd } = loadFxConfig(process.cwd());
    const entry = buildBetEntrySnapshot(pesoPerUsd);
    const url = new URL(req.url);
    const evaluate = url.searchParams.get("evaluate") === "1";

    let last = null;
    if (evaluate && anyAutoTradeEnabled()) {
      const price = await fetchBinanceTickerPrice();
      last = await maybeExecuteAutoTrade(price);
    }

    return NextResponse.json({
      ...autoTradeStatusForApi(last),
      betEntry: entry,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
