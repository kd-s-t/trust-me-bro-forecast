import "dotenv/config";
import { getBinanceCredentials } from "../lib/binance/config";
import { fetchBinanceBalances } from "../lib/binance/balances";

async function main(): Promise<void> {
  const creds = getBinanceCredentials();
  if (creds === null) {
    console.error("Missing BINANCE_API_KEY or BINANCE_SECRET_KEY in .env");
    process.exit(1);
  }
  const data = await fetchBinanceBalances();
  if (data.account.uid !== null) {
    console.log(`Binance UID: ${String(data.account.uid)}`);
  }
  if (data.account.email !== null) {
    console.log(`Binance email (env): ${data.account.email}`);
  }
  console.log(`Wallets (${data.quoteAsset}):`);
  for (const w of data.wallets) {
    console.log(`  ${w.walletName}: ${String(w.balance)}`);
  }
  console.log(`Spot (${String(data.spot.length)} non-zero):`);
  for (const b of data.spot.slice(0, 12)) {
    console.log(`  ${b.asset}: ${String(b.total)}`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
