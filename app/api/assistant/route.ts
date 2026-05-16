import { NextResponse } from "next/server";
import { isOpenAiConfigured } from "@/lib/ai/forecastAgent";
import { requireAuth } from "@/lib/auth/requireAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Whether Assistant Bro custom instructions are available. */
export async function GET(): Promise<NextResponse> {
  const auth = await requireAuth();
  if ("response" in auth) {
    return auth.response;
  }

  return NextResponse.json({
    openAiConfigured: isOpenAiConfigured(),
  });
}
