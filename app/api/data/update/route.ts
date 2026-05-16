import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { syncKaggleToDb } from "@/lib/db/syncKaggle";
import { DEFAULT_HISTORY_SYMBOL } from "@/lib/db/history";
import { closeSql } from "@/lib/db/sql";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(): Promise<NextResponse> {
  const auth = await requireAuth();
  if ("response" in auth) {
    return auth.response;
  }

  try {
    const result = await syncKaggleToDb(DEFAULT_HISTORY_SYMBOL);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await closeSql();
  }
}
