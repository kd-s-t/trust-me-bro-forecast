import { binancePublicGet } from "@/lib/binance/publicClient";

let offsetMs = 0;
let syncedAtMs = 0;

const OFFSET_TTL_MS = 30 * 60 * 1000;

function isTimestampError(message: string): boolean {
  const hay = message.toLowerCase();
  return (
    hay.includes("timestamp") ||
    hay.includes("recvwindow") ||
    hay.includes("-1021")
  );
}

/** Offset so local clock matches Binance (serverTime - local). */
export async function syncBinanceServerTimeOffset(): Promise<void> {
  const t0 = Date.now();
  const body = await binancePublicGet<{ serverTime: number }>("/api/v3/time");
  const t1 = Date.now();
  const localMid = (t0 + t1) / 2;
  offsetMs = body.serverTime - localMid;
  syncedAtMs = Date.now();
}

export async function ensureBinanceServerTimeOffset(): Promise<void> {
  if (syncedAtMs === 0 || Date.now() - syncedAtMs > OFFSET_TTL_MS) {
    await syncBinanceServerTimeOffset();
  }
}

export function binanceRequestTimestamp(): number {
  return Math.floor(Date.now() + offsetMs);
}

export async function withBinanceTimeRetry<T>(
  run: () => Promise<T>,
): Promise<T> {
  await ensureBinanceServerTimeOffset();
  try {
    return await run();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (!isTimestampError(message)) {
      throw e;
    }
    await syncBinanceServerTimeOffset();
    return await run();
  }
}
