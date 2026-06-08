"use client";

import { useCallback, useEffect, useState } from "react";

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

export type BinanceAccountInfo = {
  uid: number | null;
  accountType: string | null;
  email: string | null;
};

export type BinanceBalanceData = {
  spot: SpotBalance[];
  wallets: WalletBalance[];
  account: BinanceAccountInfo;
  quoteAsset: string;
};

export function useBinanceBalance(): {
  data: BinanceBalanceData | null;
  error: string | null;
  loading: boolean;
  refresh: () => void;
} {
  const [data, setData] = useState<BinanceBalanceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => {
    setTick((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch("/api/binance/balance", { cache: "no-store" });
        const body = (await res.json()) as BinanceBalanceData & {
          error?: string;
        };
        if (!res.ok) {
          throw new Error(body.error ?? `Failed (${String(res.status)})`);
        }
        if (!cancelled) {
          setData({
            spot: body.spot ?? [],
            wallets: body.wallets ?? [],
            account: body.account ?? {
              uid: null,
              accountType: null,
              email: null,
            },
            quoteAsset: body.quoteAsset ?? "USDT",
          });
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setData(null);
          setError(e instanceof Error ? e.message : "Failed to load balance");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return { data, error, loading, refresh };
}

export function primarySpotTotal(
  data: BinanceBalanceData,
): { usdt: number; btc: number } {
  let usdt = 0;
  let btc = 0;
  for (let i = 0; i < data.spot.length; i++) {
    const row = data.spot[i]!;
    if (row.asset === "USDT") {
      usdt = row.total;
    }
    if (row.asset === "BTC") {
      btc = row.total;
    }
  }
  const spotWallet = data.wallets.find((w) => w.walletName === "Spot");
  if (spotWallet !== undefined && usdt === 0) {
    usdt = spotWallet.balance;
  }
  return { usdt, btc };
}
