import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { createPredictionItem } from "@/lib/db/predictions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const categoryId =
    typeof body === "object" &&
    body !== null &&
    "categoryId" in body &&
    typeof (body as { categoryId: unknown }).categoryId === "string"
      ? (body as { categoryId: string }).categoryId.trim()
      : "";

  const label =
    typeof body === "object" &&
    body !== null &&
    "label" in body &&
    typeof (body as { label: unknown }).label === "string"
      ? (body as { label: string }).label
      : "";

  if (categoryId === "") {
    return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
  }

  try {
    const item = await createPredictionItem(auth.user, categoryId, label);
    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const status =
      message.includes("required") || message.includes("not found") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
