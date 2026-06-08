import { binanceSignedGet } from "@/lib/binance/client";
import { getBinanceAccountEmail } from "@/lib/binance/config";

export type BinanceAccountInfo = {
  uid: number | null;
  accountType: string | null;
  /** From BINANCE_ACCOUNT_EMAIL — not returned by Binance API keys. */
  email: string | null;
};

export type SpotBalance = {
  asset: string;
  free: number;
  locked: number;
  total: number;
};

export type WalletBalance = {
  walletName: string;
  balance: number;
  activate: boolean;
};

export type BinanceBalances = {
  spot: SpotBalance[];
  wallets: WalletBalance[];
  account: BinanceAccountInfo;
  quoteAsset: string;
  fetchedAtMs: number;
};

type RawBalance = {
  asset: string;
  free: string;
  locked: string;
};

type RawWallet = {
  walletName: string;
  balance: string;
  activate: boolean;
};

function parseSpot(row: RawBalance): SpotBalance | null {
  const free = Number(row.free);
  const locked = Number(row.locked);
  if (!Number.isFinite(free) || !Number.isFinite(locked)) {
    return null;
  }
  const total = free + locked;
  if (total <= 0) {
    return null;
  }
  return { asset: row.asset, free, locked, total };
}

type RawAccount = {
  balances: RawBalance[];
  uid?: number;
  accountType?: string;
};

/** Spot coins + wallet totals (Spot, Funding, etc.) in quoteAsset (default USDT). */
export async function fetchBinanceBalances(
  quoteAsset = "USDT",
): Promise<BinanceBalances> {
  const [account, walletRows] = await Promise.all([
    binanceSignedGet<RawAccount>("/api/v3/account"),
    binanceSignedGet<RawWallet[]>("/sapi/v1/asset/wallet/balance", {
      quoteAsset,
    }),
  ]);

  const uid =
    typeof account.uid === "number" && Number.isFinite(account.uid)
      ? account.uid
      : null;
  const accountType =
    typeof account.accountType === "string" && account.accountType !== ""
      ? account.accountType
      : null;

  const spot: SpotBalance[] = [];
  for (let i = 0; i < account.balances.length; i++) {
    const row = parseSpot(account.balances[i]!);
    if (row !== null) {
      spot.push(row);
    }
  }
  spot.sort((a, b) => b.total - a.total);

  const wallets: WalletBalance[] = [];
  for (let i = 0; i < walletRows.length; i++) {
    const w = walletRows[i]!;
    const balance = Number(w.balance);
    if (!w.activate || !Number.isFinite(balance) || balance <= 0) {
      continue;
    }
    wallets.push({
      walletName: w.walletName,
      balance,
      activate: w.activate,
    });
  }
  wallets.sort((a, b) => b.balance - a.balance);

  return {
    spot,
    wallets,
    account: {
      uid,
      accountType,
      email: getBinanceAccountEmail(),
    },
    quoteAsset,
    fetchedAtMs: Date.now(),
  };
}
