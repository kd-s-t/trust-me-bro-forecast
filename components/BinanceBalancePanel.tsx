"use client";

import { Loader2 } from "lucide-react";
import {
  primarySpotTotal,
  useBinanceBalance,
} from "@/components/useBinanceBalance";
import { cn } from "@/lib/utils";

const nfUsdt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const nfBtc = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 8,
});

type Props = {
  className?: string;
};

export function BinanceBalancePanel({ className }: Props) {
  const { data, error, loading } = useBinanceBalance();

  if (loading) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center gap-2 border-b border-border bg-card/80 px-4 py-3 text-sm text-muted-foreground",
          className,
        )}
      >
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Loading Binance balance…
      </div>
    );
  }

  if (error !== null) {
    return (
      <div
        className={cn(
          "shrink-0 border-b border-amber-500/30 bg-amber-50/80 px-4 py-3 text-sm dark:bg-amber-950/40",
          className,
        )}
      >
        <p className="font-medium text-foreground">Binance balance unavailable</p>
        <p className="mt-1 text-xs text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (data === null) {
    return null;
  }

  const { usdt, btc } = primarySpotTotal(data);
  const spotWallet = data.wallets.find((w) => w.walletName === "Spot");
  const fundingWallet = data.wallets.find((w) => w.walletName === "Funding");

  return (
    <div
      className={cn(
        "flex shrink-0 flex-wrap items-end justify-between gap-4 border-b border-border bg-gradient-to-r from-card to-muted/30 px-4 py-3",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
          {nfUsdt.format(usdt > 0 ? usdt : (spotWallet?.balance ?? 0))}
          <span className="ml-1.5 text-sm font-normal text-muted-foreground">
            USDT
          </span>
        </p>
        {btc > 0 ? (
          <p className="mt-1 text-sm tabular-nums text-muted-foreground">
            {nfBtc.format(btc)} BTC
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {fundingWallet !== undefined && fundingWallet.balance > 0 ? (
          <span className="rounded-md bg-muted/60 px-2 py-1 tabular-nums">
            Funding {nfUsdt.format(fundingWallet.balance)}
          </span>
        ) : null}
      </div>
    </div>
  );
}
