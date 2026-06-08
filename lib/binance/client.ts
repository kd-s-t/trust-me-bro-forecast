import { getBinanceCredentials } from "@/lib/binance/config";
import { binanceSign } from "@/lib/binance/sign";
import {
  binanceRequestTimestamp,
  withBinanceTimeRetry,
} from "@/lib/binance/serverTime";

const API_BASE = "https://api.binance.com";

function parseBinanceError(body: unknown, status: number): string {
  return typeof body === "object" &&
    body !== null &&
    "msg" in body &&
    typeof (body as { msg: unknown }).msg === "string"
    ? (body as { msg: string }).msg
    : `Binance HTTP ${String(status)}`;
}

async function signedRequest<T>(
  method: "GET" | "POST",
  path: string,
  params: Record<string, string>,
): Promise<T> {
  const creds = getBinanceCredentials();
  if (creds === null) {
    throw new Error(
      "Binance API not configured. Set BINANCE_API_KEY and BINANCE_SECRET_KEY in .env.",
    );
  }

  const qs = new URLSearchParams({
    ...params,
    timestamp: String(binanceRequestTimestamp()),
    recvWindow: "10000",
  });
  const signature = binanceSign(qs.toString(), creds.apiSecret);
  qs.set("signature", signature);

  const init: RequestInit = {
    method,
    headers: {
      "X-MBX-APIKEY": creds.apiKey,
      ...(method === "POST"
        ? { "Content-Type": "application/x-www-form-urlencoded" }
        : {}),
    },
    cache: "no-store",
    ...(method === "POST" ? { body: qs.toString() } : {}),
  };

  const url =
    method === "GET" ? `${API_BASE}${path}?${qs.toString()}` : `${API_BASE}${path}`;
  const res = await fetch(url, init);
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(parseBinanceError(body, res.status));
  }
  return body as T;
}

export async function binanceSignedGet<T>(
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  return withBinanceTimeRetry(() => signedRequest<T>("GET", path, params));
}

export async function binanceSignedPost<T>(
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  return withBinanceTimeRetry(() => signedRequest<T>("POST", path, params));
}
