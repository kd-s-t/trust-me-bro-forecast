export const DATASET_SLUG_FULL = "mczielinski/bitcoin-historical-data";
export const CSV_NAME_SUBSTRING = "btcusd";

const idx = DATASET_SLUG_FULL.indexOf("/");
if (idx <= 0 || idx >= DATASET_SLUG_FULL.length - 1) {
  throw new Error("Invalid DATASET_SLUG_FULL");
}

export const KAGGLE_OWNER = DATASET_SLUG_FULL.slice(0, idx);
export const KAGGLE_DATASET = DATASET_SLUG_FULL.slice(idx + 1);
