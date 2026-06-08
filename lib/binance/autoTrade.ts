import {
  anyAutoTradeEnabled,
  featureFlagAutoBuy,
  featureFlagAutoSell,
} from "@/lib/binance/featureFlags";
import { binanceMarketSymbol } from "@/lib/binance/market";
import {
  fetchSpotFreeBalance,
  placeMarketBuyBtcWithUsdt,
  placeMarketSellBtc,
  type SpotMarketOrderResult,
} from "@/lib/binance/spotOrder";
import { getBinanceCredentials } from "@/lib/binance/config";
import {
  buildBetEntrySnapshot,
  isMarketBelowBetEntry,
  type BetEntrySnapshot,
} from "@/lib/chart/betMarketAlert";
import { betPurchaseBtcAmount } from "@/lib/chartBetMarker";
import { hasAutoTradeLock, recordAutoTradeLock } from "@/lib/db/autoTradeLock";
import { loadFxConfig } from "@/lib/fxConfig";
import { floorToStep, fetchBtcUsdtLotSize } from "@/lib/binance/lotSize";

const LOCK_SELL_BELOW_BET = "auto_sell_below_jun2_bet";
const LOCK_BUY_ABOVE_BET = "auto_buy_above_jun2_bet";

export type AutoTradeAction = "sell" | "buy";

export type AutoTradeSkipReason =
  | "flags_off"
  | "no_credentials"
  | "not_below_bet"
  | "not_above_bet"
  | "already_executed"
  | "insufficient_btc"
  | "insufficient_usdt"
  | "qty_below_min";

export type AutoTradeResult =
  | { status: "skipped"; reason: AutoTradeSkipReason; livePriceUsd: number }
  | {
      status: "executed";
      action: AutoTradeAction;
      order: SpotMarketOrderResult;
      entryUsd: number;
      livePriceUsd: number;
    }
  | { status: "error"; message: string; livePriceUsd: number };

function loadBetEntry(): BetEntrySnapshot {
  const { pesoPerUsd } = loadFxConfig(process.cwd());
  return buildBetEntrySnapshot(pesoPerUsd);
}

async function tryAutoSellBelowBet(
  livePriceUsd: number,
  entry: BetEntrySnapshot,
): Promise<AutoTradeResult> {
  if (!featureFlagAutoSell()) {
    return { status: "skipped", reason: "flags_off", livePriceUsd };
  }
  if (!isMarketBelowBetEntry(livePriceUsd, entry.entryUsd)) {
    return { status: "skipped", reason: "not_below_bet", livePriceUsd };
  }
  if (await hasAutoTradeLock(LOCK_SELL_BELOW_BET)) {
    return { status: "skipped", reason: "already_executed", livePriceUsd };
  }

  const btcFree = await fetchSpotFreeBalance("BTC");
  const targetBtc = Math.min(btcFree, betPurchaseBtcAmount());
  const lot = await fetchBtcUsdtLotSize();
  const qty = floorToStep(targetBtc, lot.stepSize);

  if (qty < lot.minQty) {
    return { status: "skipped", reason: "insufficient_btc", livePriceUsd };
  }

  const order = await placeMarketSellBtc(qty, livePriceUsd);
  await recordAutoTradeLock(LOCK_SELL_BELOW_BET, {
    orderId: String(order.orderId),
    side: "SELL",
    priceUsd: livePriceUsd,
    quantity: order.executedQty,
  });

  return {
    status: "executed",
    action: "sell",
    order,
    entryUsd: entry.entryUsd,
    livePriceUsd,
  };
}

async function tryAutoBuyAboveBet(
  livePriceUsd: number,
  entry: BetEntrySnapshot,
): Promise<AutoTradeResult> {
  if (!featureFlagAutoBuy()) {
    return { status: "skipped", reason: "flags_off", livePriceUsd };
  }
  if (livePriceUsd <= entry.entryUsd) {
    return { status: "skipped", reason: "not_above_bet", livePriceUsd };
  }
  if (await hasAutoTradeLock(LOCK_BUY_ABOVE_BET)) {
    return { status: "skipped", reason: "already_executed", livePriceUsd };
  }

  const usdtFree = await fetchSpotFreeBalance("USDT");
  const targetSpend = Math.min(
    usdtFree * 0.995,
    entry.entryUsd * betPurchaseBtcAmount(),
  );
  const lot = await fetchBtcUsdtLotSize();

  if (targetSpend < lot.minNotional) {
    return { status: "skipped", reason: "insufficient_usdt", livePriceUsd };
  }

  const order = await placeMarketBuyBtcWithUsdt(targetSpend, livePriceUsd);
  await recordAutoTradeLock(LOCK_BUY_ABOVE_BET, {
    orderId: String(order.orderId),
    side: "BUY",
    priceUsd: livePriceUsd,
    quantity: order.executedQty,
  });

  return {
    status: "executed",
    action: "buy",
    order,
    entryUsd: entry.entryUsd,
    livePriceUsd,
  };
}

/**
 * Called after each Binance market sync (≈15s while chart is open).
 * Sells BTC→USDT when spot is below your Jun 2 bet (FEATURE_FLAG_AUTO_SELL).
 * Buys BTC with USDT when spot is back above the bet (FEATURE_FLAG_AUTO_BUY).
 */
export async function maybeExecuteAutoTrade(
  livePriceUsd: number,
): Promise<AutoTradeResult | null> {
  if (!anyAutoTradeEnabled()) {
    return null;
  }
  if (getBinanceCredentials() === null) {
    return { status: "skipped", reason: "no_credentials", livePriceUsd };
  }
  if (!Number.isFinite(livePriceUsd) || livePriceUsd <= 0) {
    return null;
  }

  const entry = loadBetEntry();

  try {
    if (featureFlagAutoSell() && isMarketBelowBetEntry(livePriceUsd, entry.entryUsd)) {
      return await tryAutoSellBelowBet(livePriceUsd, entry);
    }
    if (featureFlagAutoBuy() && livePriceUsd > entry.entryUsd) {
      return await tryAutoBuyAboveBet(livePriceUsd, entry);
    }
    if (featureFlagAutoSell()) {
      return { status: "skipped", reason: "not_below_bet", livePriceUsd };
    }
    return { status: "skipped", reason: "not_above_bet", livePriceUsd };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { status: "error", message, livePriceUsd };
  }
}

export function autoTradeStatusForApi(result: AutoTradeResult | null): {
  enabled: boolean;
  symbol: string;
  autoSell: boolean;
  autoBuy: boolean;
  last?: AutoTradeResult;
} {
  return {
    enabled: anyAutoTradeEnabled(),
    symbol: binanceMarketSymbol(),
    autoSell: featureFlagAutoSell(),
    autoBuy: featureFlagAutoBuy(),
    ...(result !== null ? { last: result } : {}),
  };
}
