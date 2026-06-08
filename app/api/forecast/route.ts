import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { loadForecastPayload } from "@/lib/chart/loadForecastPayload";
import { deleteForecastRun } from "@/lib/db/forecast";
import { DEFAULT_HISTORY_SYMBOL } from "@/lib/db/history";
import { userFacingMessage } from "@/lib/errors/userFacingMessage";
import { isForecastHorizon } from "@/lib/forecast/horizons";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Forecast run + weekly points for the chart (`?runId=` or latest). */
export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireAuth();
  if ("response" in auth) {
    return auth.response;
  }

  const runId = new URL(request.url).searchParams.get("runId");

  try {
    const forecast = await loadForecastPayload(auth.user, runId);
    return NextResponse.json({ forecast });
  } catch (e) {
    const message = userFacingMessage(
      e instanceof Error ? e.message : String(e),
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Delete a forecast run owned by the current user. */
export async function DELETE(request: Request): Promise<NextResponse> {
  const auth = await requireAuth();
  if ("response" in auth) {
    return auth.response;
  }

  const runId = new URL(request.url).searchParams.get("runId")?.trim() ?? "";
  if (runId === "") {
    return NextResponse.json({ error: "runId is required" }, { status: 400 });
  }

  try {
    const deleted = await deleteForecastRun(runId, auth.user);
    if (!deleted) {
      return NextResponse.json({ error: "Forecast not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = userFacingMessage(
      e instanceof Error ? e.message : String(e),
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** NewsAPI + OpenAI → new forecast in Postgres. */
export async function POST(request: Request): Promise<NextResponse> {
  const auth = await requireAuth();
  if ("response" in auth) {
    return auth.response;
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

  if (!isForecastHorizon(horizon)) {
    return NextResponse.json(
      { error: "horizon must be one of: 1m, 3m, 6m, 9m, 1y" },
      { status: 400 },
    );
  }

  try {
    const { createForecastFromNews } = await import("@/lib/forecast/generate");
    const { run, usedAi, method } = await createForecastFromNews(
      horizon,
      auth.user,
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
    const message = userFacingMessage(
      e instanceof Error ? e.message : String(e),
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
