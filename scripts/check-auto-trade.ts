import "dotenv/config";
import { loadFxConfig } from "../lib/fxConfig";
import { buildBetEntrySnapshot, isMarketBelowBetEntry } from "../lib/chart/betMarketAlert";
import { fetchBinanceTickerPrice } from "../lib/binance/market";
import {
  anyAutoTradeEnabled,
  featureFlagAutoBuy,
  featureFlagAutoSell,
} from "../lib/binance/featureFlags";
import { betPurchaseBtcAmount } from "../lib/chartBetMarker";

async function main(): Promise<void> {
  const { pesoPerUsd } = loadFxConfig(process.cwd());
  const entry = buildBetEntrySnapshot(pesoPerUsd);
  const price = await fetchBinanceTickerPrice();
  const below = isMarketBelowBetEntry(price, entry.entryUsd);

  console.log("Auto trade flags:", {
    sell: featureFlagAutoSell(),
    buy: featureFlagAutoBuy(),
    anyEnabled: anyAutoTradeEnabled(),
  });
  console.log("Jun 2 bet entry USD:", entry.entryUsd.toFixed(2));
  console.log("Bet BTC size:", betPurchaseBtcAmount());
  console.log("Live BTCUSDT:", price.toFixed(2));
  console.log("Below bet?", below);
  console.log(
    below
      ? "AUTO_SELL would arm when FEATURE_FLAG_AUTO_SELL=true"
      : "AUTO_BUY would arm when FEATURE_FLAG_AUTO_BUY=true and price > entry",
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
