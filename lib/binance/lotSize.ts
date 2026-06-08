import { binancePublicGet } from "@/lib/binance/publicClient";
import { binanceMarketSymbol } from "@/lib/binance/market";

export type LotSizeFilter = {
  minQty: number;
  maxQty: number;
  stepSize: number;
  minNotional: number;
};

type SymbolInfo = {
  symbol: string;
  filters: Array<{
    filterType: string;
    minQty?: string;
    maxQty?: string;
    stepSize?: string;
    minNotional?: string;
    notional?: string;
  }>;
};

type ExchangeInfo = {
  symbols: SymbolInfo[];
};

let cached: LotSizeFilter | null = null;

function parseFilter(symbol: string, info: ExchangeInfo): LotSizeFilter {
  const row = info.symbols.find((s) => s.symbol === symbol);
  if (row === undefined) {
    throw new Error(`Binance exchangeInfo: symbol ${symbol} not found`);
  }

  let minQty = 0;
  let maxQty = Number.MAX_SAFE_INTEGER;
  let stepSize = 0.00001;
  let minNotional = 5;

  for (let i = 0; i < row.filters.length; i++) {
    const f = row.filters[i]!;
    if (f.filterType === "LOT_SIZE") {
      minQty = Number(f.minQty);
      maxQty = Number(f.maxQty);
      stepSize = Number(f.stepSize);
    }
    if (f.filterType === "NOTIONAL" || f.filterType === "MIN_NOTIONAL") {
      const n = f.minNotional ?? f.notional;
      if (n !== undefined) {
        minNotional = Number(n);
      }
    }
  }

  if (
    !Number.isFinite(minQty) ||
    !Number.isFinite(maxQty) ||
    !Number.isFinite(stepSize) ||
    stepSize <= 0
  ) {
    throw new Error(`Binance LOT_SIZE filter invalid for ${symbol}`);
  }

  return { minQty, maxQty, stepSize, minNotional };
}

export async function fetchBtcUsdtLotSize(): Promise<LotSizeFilter> {
  if (cached !== null) {
    return cached;
  }
  const symbol = binanceMarketSymbol();
  const info = await binancePublicGet<ExchangeInfo>("/api/v3/exchangeInfo", {
    symbol,
  });
  cached = parseFilter(symbol, info);
  return cached;
}

/** Round down to Binance step size (e.g. 0.00001 BTC). */
export function floorToStep(qty: number, stepSize: number): number {
  if (!Number.isFinite(qty) || qty <= 0 || stepSize <= 0) {
    return 0;
  }
  const steps = Math.floor(qty / stepSize);
  const rounded = steps * stepSize;
  const decimals = Math.max(0, -Math.floor(Math.log10(stepSize)));
  return Number(rounded.toFixed(decimals));
}
