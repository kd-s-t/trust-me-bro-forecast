import {
  BET_PURCHASE_PESO_PER_BTC,
  betPurchaseUsdPrice,
} from "@/lib/chartBetMarker";
import type { ChartRow } from "@/lib/chartRows";

const usdFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const phpFmt = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

export type BetEntrySnapshot = {
  entryUsd: number;
  entryPhpPerBtc: number;
  pesoPerUsd: number;
};

export function buildBetEntrySnapshot(pesoPerUsd: number): BetEntrySnapshot {
  return {
    entryUsd: betPurchaseUsdPrice(pesoPerUsd),
    entryPhpPerBtc: BET_PURCHASE_PESO_PER_BTC,
    pesoPerUsd,
  };
}

export function lastObservedUsdFromRows(rows: ChartRow[]): number | null {
  for (let i = rows.length - 1; i >= 0; i--) {
    const price = rows[i]!.observed;
    if (price !== null) {
      return price;
    }
  }
  return null;
}

export function isMarketBelowBetEntry(
  liveUsd: number,
  entryUsd: number,
): boolean {
  return liveUsd < entryUsd;
}

export function pctBelowBetEntry(liveUsd: number, entryUsd: number): number {
  if (entryUsd <= 0) {
    return 0;
  }
  return ((entryUsd - liveUsd) / entryUsd) * 100;
}

export function betBelowMarketMessage(
  liveUsd: number,
  entry: BetEntrySnapshot,
): string {
  const pct = pctBelowBetEntry(liveUsd, entry.entryUsd);
  return (
    `${usdFmt.format(liveUsd)} is below your Jun 2 buy ` +
    `(${phpFmt.format(entry.entryPhpPerBtc)}/BTC, ${usdFmt.format(entry.entryUsd)}) — ` +
    `down ${pct.toFixed(1)}%`
  );
}
