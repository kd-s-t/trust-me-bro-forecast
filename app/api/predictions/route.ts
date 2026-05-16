import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import {
  createPredictionCategory,
  listPredictionCategories,
} from "@/lib/db/predictions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const auth = await requireAuth();
  if ("response" in auth) {
    return auth.response;
  }

  try {
    const categories = await listPredictionCategories(auth.user);
    return NextResponse.json({ categories });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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

  const label =
    typeof body === "object" &&
    body !== null &&
    "label" in body &&
    typeof (body as { label: unknown }).label === "string"
      ? (body as { label: string }).label
      : "";

  try {
    const category = await createPredictionCategory(auth.user, label);
    return NextResponse.json({ category }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const status = message.includes("required") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
