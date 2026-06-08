const API_BASE = "https://api.binance.com";

export async function binancePublicGet<T>(
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  const qs = new URLSearchParams(params);
  const url = `${API_BASE}${path}?${qs.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      typeof body === "object" &&
      body !== null &&
      "msg" in body &&
      typeof (body as { msg: unknown }).msg === "string"
        ? (body as { msg: string }).msg
        : `Binance HTTP ${String(res.status)}`;
    throw new Error(msg);
  }
  return body as T;
}
