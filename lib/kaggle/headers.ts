import { getKaggleAuth } from "./auth";

export function kaggleAuthHeaders(): Record<string, string> {
  const auth = getKaggleAuth();
  return auth.kind === "bearer"
    ? { Authorization: `Bearer ${auth.token}` }
    : {
        Authorization: `Basic ${Buffer.from(`${auth.username}:${auth.key}`, "utf8").toString("base64")}`,
      };
}
