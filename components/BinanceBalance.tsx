"use client";

import { Loader2 } from "lucide-react";
import { useBinanceBalance } from "@/components/useBinanceBalance";
import { cn } from "@/lib/utils";

const nfQty = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 8,
});

const nfUsdt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function formatQty(n: number): string {
  if (n >= 1) {
    return nfQty.format(n);
  }
  return n.toFixed(8).replace(/\.?0+$/, "");
}

type Props = {
  className?: string;
};

/** Compact list in the sidebar (main total is on the chart panel). */
export function BinanceBalance({ className }: Props) {
  const { data, error, loading } = useBinanceBalance();

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center gap-2 border-b border-border px-3 py-2.5 text-xs text-muted-foreground",
          className,
        )}
      >
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        Balance…
      </div>
    );
  }

  if (error !== null) {
    return (
      <div
        className={cn(
          "border-b border-border px-3 py-2 text-[10px] text-muted-foreground",
          className,
        )}
      >
        <p className="font-medium text-foreground">Binance</p>
        <p className="mt-0.5 line-clamp-2">{error}</p>
      </div>
    );
  }

  if (data === null) {
    return null;
  }

  const spotWallet = data.wallets.find((w) => w.walletName === "Spot");
  const top = data.spot.slice(0, 4);
  const { account } = data;

  return (
    <div
      className={cn(
        "space-y-1.5 border-b border-border px-3 py-2.5 text-[11px]",
        className,
      )}
    >
      {account.uid !== null || account.email !== null ? (
        <div className="space-y-0.5 border-b border-border/60 pb-1.5 text-muted-foreground">
          {account.uid !== null ? (
            <p className="truncate">
              Binance UID{" "}
              <span className="font-medium text-foreground tabular-nums">
                {String(account.uid)}
              </span>
            </p>
          ) : null}
          {account.email !== null ? (
            <p className="truncate" title={account.email}>
              {account.email}
            </p>
          ) : null}
        </div>
      ) : null}
      {spotWallet !== undefined ? (
        <p className="font-semibold tabular-nums text-foreground">
          Spot {nfUsdt.format(spotWallet.balance)}
        </p>
      ) : null}
      <ul className="space-y-0.5 text-muted-foreground">
        {top.map((b) => (
          <li key={b.asset} className="flex justify-between gap-2 tabular-nums">
            <span>{b.asset}</span>
            <span>{formatQty(b.total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
