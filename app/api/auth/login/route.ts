import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  createSessionTokenValue,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { runMigrations } from "@/lib/db/migrate";
import { verifyUserCredentials } from "@/lib/db/users";
import { closeSql } from "@/lib/db/sql";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const username =
    typeof body === "object" &&
    body !== null &&
    typeof (body as { username?: unknown }).username === "string"
      ? (body as { username: string }).username
      : "";
  const password =
    typeof body === "object" &&
    body !== null &&
    typeof (body as { password?: unknown }).password === "string"
      ? (body as { password: string }).password
      : "";

  try {
    await runMigrations();
    const user = await verifyUserCredentials(username, password);
    if (user === null) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 },
      );
    }

    const token = await createSessionTokenValue(user);
    const response = NextResponse.json({ ok: true, username: user });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Login failed";
    console.error("[auth/login]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await closeSql();
  }
}
