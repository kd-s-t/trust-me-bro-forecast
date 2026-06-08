function parseBoolEnv(raw: string | undefined): boolean {
  if (raw === undefined || raw === "") {
    return false;
  }
  const v = raw.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "on";
}

/** Server-only. When true, market-sync may place a BTC→USDT market sell below your Jun 2 bet. */
export function featureFlagAutoSell(): boolean {
  return parseBoolEnv(process.env.FEATURE_FLAG_AUTO_SELL);
}

/** Server-only. When true, market-sync may place a USDT→BTC market buy above your Jun 2 bet. */
export function featureFlagAutoBuy(): boolean {
  return parseBoolEnv(process.env.FEATURE_FLAG_AUTO_BUY);
}

export function anyAutoTradeEnabled(): boolean {
  return featureFlagAutoSell() || featureFlagAutoBuy();
}
