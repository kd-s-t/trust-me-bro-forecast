import { NextResponse } from "next/server";
import { getSessionUser } from "./session";

export async function requireAuth(): Promise<
  { user: string } | { response: NextResponse }
> {
  const user = await getSessionUser();
  if (user === null) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { user };
}
