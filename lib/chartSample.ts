import type { PricePoint } from "./history";

export const DISPLAY_POINT_CAP = 10_000;

/** Fewer chart points in dev → faster indexed sampling from large history tables. */
export function chartHistoryCap(): number {
  if (process.env.NODE_ENV !== "development") {
    return DISPLAY_POINT_CAP;
  }
  const raw = process.env.CHART_HISTORY_CAP?.trim();
  if (raw === undefined || raw === "") {
    return 3_000;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 100) {
    return 3_000;
  }
  return Math.min(Math.floor(n), DISPLAY_POINT_CAP);
}

export function evenlySamplePoints(points: PricePoint[], max: number): PricePoint[] {
  if (max < 2) {
    throw new Error("evenlySamplePoints max must be at least 2");
  }
  if (points.length <= max) {
    return points;
  }
  const out: PricePoint[] = [];
  const hi = points.length - 1;
  const denom = max - 1;
  for (let i = 0; i < max; i++) {
    const idx = Math.round((i / denom) * hi);
    out.push(points[idx]!);
  }
  return out;
}
