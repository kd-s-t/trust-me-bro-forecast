import type { PricePoint } from "@/lib/history";

export function mergePricePoints(
  ...groups: PricePoint[][]
): PricePoint[] {
  const byTime = new Map<number, PricePoint>();
  for (let g = 0; g < groups.length; g++) {
    const group = groups[g]!;
    for (let i = 0; i < group.length; i++) {
      const p = group[i]!;
      byTime.set(p.timeMs, p);
    }
  }
  const out = [...byTime.values()];
  out.sort((a, b) => a.timeMs - b.timeMs);
  return out;
}
