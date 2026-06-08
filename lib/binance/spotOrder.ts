import { binanceSignedGet, binanceSignedPost } from "@/lib/binance/client";
import { binanceMarketSymbol } from "@/lib/binance/market";
import {
  fetchBtcUsdtLotSize,
  floorToStep,
  type LotSizeFilter,
} from "@/lib/binance/lotSize";

export type SpotMarketOrderResult = {
  symbol: string;
  orderId: number;
  side: "BUY" | "SELL";
  type: string;
  status: string;
  executedQty: number;
  cummulativeQuoteQty: number;
};

type RawOrder = {
  symbol: string;
  orderId: number;
  side: string;
  type: string;
  status: string;
  executedQty: string;
  cummulativeQuoteQty: string;
};

function parseOrder(raw: RawOrder): SpotMarketOrderResult {
  return {
    symbol: raw.symbol,
    orderId: raw.orderId,
    side: raw.side === "BUY" ? "BUY" : "SELL",
    type: raw.type,
    status: raw.status,
    executedQty: Number(raw.executedQty),
    cummulativeQuoteQty: Number(raw.cummulativeQuoteQty),
  };
}

type RawBalance = {
  asset: string;
  free: string;
  locked: string;
};

type RawAccount = {
  balances: RawBalance[];
};

export async function fetchSpotFreeBalance(asset: string): Promise<number> {
  const account = await binanceSignedGet<RawAccount>("/api/v3/account");
  for (let i = 0; i < account.balances.length; i++) {
    const row = account.balances[i]!;
    if (row.asset === asset) {
      const free = Number(row.free);
      return Number.isFinite(free) ? free : 0;
    }
  }
  return 0;
}

function assertMarketQty(
  qty: number,
  price: number,
  lot: LotSizeFilter,
  label: string,
): void {
  if (qty < lot.minQty) {
    throw new Error(
      `${label}: quantity ${String(qty)} below Binance min ${String(lot.minQty)}`,
    );
  }
  if (qty > lot.maxQty) {
    throw new Error(`${label}: quantity above Binance max`);
  }
  const notional = qty * price;
  if (notional < lot.minNotional) {
    throw new Error(
      `${label}: notional ~$${notional.toFixed(2)} below min $${String(lot.minNotional)}`,
    );
  }
}

/** Market sell BTC on BTCUSDT (converts proceeds to USDT). */
export async function placeMarketSellBtc(
  quantityBtc: number,
  livePriceUsd: number,
): Promise<SpotMarketOrderResult> {
  const symbol = binanceMarketSymbol();
  const lot = await fetchBtcUsdtLotSize();
  const qty = floorToStep(quantityBtc, lot.stepSize);
  assertMarketQty(qty, livePriceUsd, lot, "Market sell");

  const raw = await binanceSignedPost<RawOrder>("/api/v3/order", {
    symbol,
    side: "SELL",
    type: "MARKET",
    quantity: String(qty),
  });
  return parseOrder(raw);
}

/** Market buy BTC spending USDT (quoteOrderQty). */
export async function placeMarketBuyBtcWithUsdt(
  quoteUsdt: number,
  livePriceUsd: number,
): Promise<SpotMarketOrderResult> {
  const symbol = binanceMarketSymbol();
  const lot = await fetchBtcUsdtLotSize();
  const spend = Math.floor(quoteUsdt * 100) / 100;
  if (spend < lot.minNotional) {
    throw new Error(
      `Market buy: USDT ${String(spend)} below min notional ${String(lot.minNotional)}`,
    );
  }
  const estBtc = floorToStep(spend / livePriceUsd, lot.stepSize);
  assertMarketQty(estBtc, livePriceUsd, lot, "Market buy (estimate)");

  const raw = await binanceSignedPost<RawOrder>("/api/v3/order", {
    symbol,
    side: "BUY",
    type: "MARKET",
    quoteOrderQty: String(spend),
  });
  return parseOrder(raw);
}
