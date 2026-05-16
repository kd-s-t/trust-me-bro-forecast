import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { loadForecastRunList } from "@/lib/chart/loadForecastPayload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** All forecast runs for the symbol (newest first). */
export async function GET(): Promise<NextResponse> {
  const auth = await requireAuth();
  if ("response" in auth) {
    return auth.response;
  }

  try {
    const runs = await loadForecastRunList();
    return NextResponse.json({ runs });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
