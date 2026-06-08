export type BinanceCredentials = {
  apiKey: string;
  apiSecret: string;
};

function readApiSecret(): string | undefined {
  const raw =
    process.env.BINANCE_SECRET_KEY?.trim() ??
    process.env.BINANCE_API_SECRET?.trim();
  return raw === "" ? undefined : raw;
}

export function getBinanceCredentials(): BinanceCredentials | null {
  const apiKey = process.env.BINANCE_API_KEY?.trim();
  const apiSecret = readApiSecret();
  if (apiKey === undefined || apiKey === "" || apiSecret === undefined) {
    return null;
  }
  return { apiKey, apiSecret };
}

/** Binance API keys cannot read account email; set this to show your login email in the UI. */
export function getBinanceAccountEmail(): string | null {
  const raw = process.env.BINANCE_ACCOUNT_EMAIL?.trim();
  return raw === undefined || raw === "" ? null : raw;
}
