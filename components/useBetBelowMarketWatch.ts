"use client";

import { useEffect, useState } from "react";
import {
  betBelowMarketMessage,
  type BetEntrySnapshot,
  isMarketBelowBetEntry,
} from "@/lib/chart/betMarketAlert";
import {
  clearLastBetBelowNotifyAt,
  recordBetBelowNotify,
  shouldNotifyBetBelow,
} from "@/lib/chart/betBelowNotify";
import { showBetBelowToast } from "@/lib/chart/betBelowToast";

export function useBetBelowMarketWatch(
  livePriceUsd: number | null,
  entry: BetEntrySnapshot | null,
) {
  const [below, setBelow] = useState(false);

  useEffect(() => {
    if (livePriceUsd === null || entry === null) {
      return;
    }

    const isBelow = isMarketBelowBetEntry(livePriceUsd, entry.entryUsd);
    setBelow(isBelow);

    if (!isBelow) {
      clearLastBetBelowNotifyAt();
      return;
    }

    if (!shouldNotifyBetBelow()) {
      return;
    }

    recordBetBelowNotify();
    showBetBelowToast(betBelowMarketMessage(livePriceUsd, entry));
  }, [livePriceUsd, entry]);

  const message =
    livePriceUsd !== null && entry !== null && below
      ? betBelowMarketMessage(livePriceUsd, entry)
      : null;

  return { below, message };
}
