import type { PricePoint } from "./history";

export const DISPLAY_POINT_CAP = 10_000;

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
