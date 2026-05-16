import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session-token";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p);
}

/** Drop legacy `?full=1` (and other removed query flags) from bookmarks. */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/" && request.nextUrl.searchParams.has("full")) {
    const url = request.nextUrl.clone();
    url.searchParams.delete("full");
    return NextResponse.redirect(url);
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  let user: string | null = null;
  try {
    user = await verifySessionToken(token);
  } catch (e) {
    console.error("[middleware] session verify failed", e);
    user = null;
  }

  if (user === null) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const login = new URL("/login", request.url);
    if (pathname !== "/") {
      login.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(login);
  }

  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/api/:path*",
  ],
};
