import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fetchBinanceBalances } from "@/lib/binance/balances";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const auth = await requireAuth();
  if ("response" in auth) {
    return auth.response;
  }

  try {
    const data = await fetchBinanceBalances();
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const status = message.includes("not configured") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
