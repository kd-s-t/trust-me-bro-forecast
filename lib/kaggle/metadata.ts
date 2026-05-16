import { KAGGLE_DATASET, KAGGLE_OWNER } from "./constants";
import { kaggleAuthHeaders } from "./headers";

export type KaggleDatasetMeta = {
  versionNumber: number;
  title: string;
};

export async function fetchKaggleDatasetVersion(): Promise<KaggleDatasetMeta> {
  const url = `https://www.kaggle.com/api/v1/datasets/view/${KAGGLE_OWNER}/${KAGGLE_DATASET}`;
  const res = await fetch(url, { headers: kaggleAuthHeaders() });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `Kaggle dataset metadata failed ${res.status}: ${errText.slice(0, 500)}`,
    );
  }
  const json = (await res.json()) as {
    title?: unknown;
    currentVersionNumber?: unknown;
    versionNumber?: unknown;
  };
  const raw =
    json.currentVersionNumber ?? json.versionNumber ?? null;
  const versionNumber =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
        ? Number(raw)
        : NaN;
  if (!Number.isFinite(versionNumber)) {
    throw new Error("Kaggle dataset metadata missing version number");
  }
  return {
    versionNumber,
    title: typeof json.title === "string" ? json.title : KAGGLE_DATASET,
  };
}
