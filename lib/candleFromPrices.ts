import type { CandlestickData, Time, UTCTimestamp } from "lightweight-charts";

export type ClosePoint = { timeMs: number; close: number };

function msToUtc(timeMs: number): UTCTimestamp {
  return (Math.floor(timeMs / 1000)) as UTCTimestamp;
}

/** One close per UTC second (last wins). */
function dedupeByUtcSecond(points: ClosePoint[]): ClosePoint[] {
  const sorted = [...points].sort((a, b) => a.timeMs - b.timeMs);
  const out: ClosePoint[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i]!;
    const sec = Math.floor(p.timeMs / 1000);
    const last = out[out.length - 1];
    if (last !== undefined && Math.floor(last.timeMs / 1000) === sec) {
      out[out.length - 1] = p;
    } else {
      out.push(p);
    }
  }
  return out;
}

/**
 * Build candlesticks from close-only samples (open = prior close).
 * Matches the spirit of TradingView's candle series without random OHLC.
 */
export function candlesFromClosePrices(points: ClosePoint[]): CandlestickData<Time>[] {
  const deduped = dedupeByUtcSecond(points);
  if (deduped.length === 0) {
    return [];
  }
  const candles: CandlestickData<Time>[] = [];
  let prevClose = deduped[0]!.close;
  for (let i = 0; i < deduped.length; i++) {
    const close = deduped[i]!.close;
    const open = i === 0 ? close : prevClose;
    candles.push({
      time: msToUtc(deduped[i]!.timeMs),
      open,
      high: Math.max(open, close),
      low: Math.min(open, close),
      close,
    });
    prevClose = close;
  }
  return candles;
}
