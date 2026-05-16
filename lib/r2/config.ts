const DEFAULT_HISTORY_JSON_KEY = "btc-price-history.json";

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  historyJsonKey: string;
  endpoint: string;
};

function parseAccountIdFromEndpoint(endpoint: string): string | null {
  const m = /^https:\/\/([a-f0-9]+)\.r2\.cloudflarestorage\.com\/?$/i.exec(
    endpoint.trim(),
  );
  return m?.[1] ?? null;
}

export function isR2WriteEnabled(): boolean {
  return (
    Boolean(process.env.R2_ACCESS_KEY_ID?.trim()) &&
    Boolean(process.env.R2_SECRET_ACCESS_KEY?.trim()) &&
    Boolean(process.env.R2_BUCKET?.trim())
  );
}

export function isR2HistoryEnabled(): boolean {
  return (
    isR2WriteEnabled() ||
    Boolean(process.env.HISTORY_JSON_URL?.trim())
  );
}

export function getR2Config(): R2Config {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET?.trim();
  if (
    accessKeyId === undefined ||
    accessKeyId === "" ||
    secretAccessKey === undefined ||
    secretAccessKey === "" ||
    bucket === undefined ||
    bucket === ""
  ) {
    throw new Error(
      "R2 is not configured. Set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET.",
    );
  }

  const endpointRaw =
    process.env.R2_ENDPOINT?.trim() ??
    process.env.CLOUDFLARE_DOMAIN?.trim() ??
    "";
  const accountId =
    process.env.R2_ACCOUNT_ID?.trim() ??
    parseAccountIdFromEndpoint(endpointRaw) ??
    "";
  if (accountId === "") {
    throw new Error(
      "Set R2_ACCOUNT_ID or R2_ENDPOINT (https://<account_id>.r2.cloudflarestorage.com).",
    );
  }

  const endpoint =
    endpointRaw !== ""
      ? endpointRaw.replace(/\/$/, "")
      : `https://${accountId}.r2.cloudflarestorage.com`;

  const historyJsonKey =
    process.env.R2_OBJECT_KEY?.trim() ??
    process.env.R2_JSON_OBJECT_KEY?.trim() ??
    DEFAULT_HISTORY_JSON_KEY;

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    historyJsonKey,
    endpoint,
  };
}
