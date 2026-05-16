import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionMaxAgeSec,
  verifySessionToken,
} from "./session-token";

export { SESSION_COOKIE, verifySessionToken } from "./session-token";

export async function getSessionUser(): Promise<string | null> {
  const jar = await cookies();
  return await verifySessionToken(jar.get(SESSION_COOKIE)?.value);
}

export function sessionCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionMaxAgeSec,
  };
}

export async function createSessionTokenValue(
  username: string,
): Promise<string> {
  return createSessionToken(username);
}

export async function setSessionCookie(username: string): Promise<void> {
  const token = await createSessionToken(username);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions());
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
