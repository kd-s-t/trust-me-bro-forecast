import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { buildBetEntrySnapshot } from "@/lib/chart/betMarketAlert";
import { loadFxConfig } from "@/lib/fxConfig";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Your Binance buy entry in USD (from config/fx.json + chart bet constants). */
export async function GET(): Promise<NextResponse> {
  const auth = await requireAuth();
  if ("response" in auth) {
    return auth.response;
  }

  try {
    const { pesoPerUsd } = loadFxConfig(process.cwd());
    return NextResponse.json(buildBetEntrySnapshot(pesoPerUsd));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
