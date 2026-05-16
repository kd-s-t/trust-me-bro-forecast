import { NextResponse } from "next/server";
import { isOpenAiConfigured } from "@/lib/ai/forecastAgent";
import { requireAuth } from "@/lib/auth/requireAuth";
import { DEFAULT_HISTORY_SYMBOL } from "@/lib/db/history";
import { isForecastHorizon } from "@/lib/forecast/horizons";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Assistant Bro: fetch NewsAPI top 3, merge with user instructions, OpenAI → Postgres.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const auth = await requireAuth();
  if ("response" in auth) {
    return auth.response;
  }

  if (!isOpenAiConfigured()) {
    return NextResponse.json(
      { error: "Assistant Bro requires OPENAI_API_KEY in .env" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const horizon =
    typeof body === "object" &&
    body !== null &&
    "horizon" in body &&
    typeof (body as { horizon: unknown }).horizon === "string"
      ? (body as { horizon: string }).horizon
      : "";

  const instructions =
    typeof body === "object" &&
    body !== null &&
    "instructions" in body &&
    typeof (body as { instructions: unknown }).instructions === "string"
      ? (body as { instructions: string }).instructions.trim()
      : typeof body === "object" &&
          body !== null &&
          "message" in body &&
          typeof (body as { message: unknown }).message === "string"
        ? (body as { message: string }).message.trim()
        : "";

  if (!isForecastHorizon(horizon)) {
    return NextResponse.json(
      { error: "horizon must be one of: 1m, 3m, 6m, 9m, 1y" },
      { status: 400 },
    );
  }

  if (instructions === "") {
    return NextResponse.json(
      { error: "instructions (message) is required" },
      { status: 400 },
    );
  }

  try {
    const { createAssistantBroForecast } = await import("@/lib/forecast/generate");
    const { run, usedAi, method } = await createAssistantBroForecast(
      horizon,
      auth.user,
      instructions,
      DEFAULT_HISTORY_SYMBOL,
    );
    return NextResponse.json({
      runId: run.id,
      horizon: run.horizon,
      analysis: run.analysis,
      createdAt: run.createdAt,
      usedAi,
      method,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
