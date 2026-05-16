import fs from "fs";
import path from "path";
import { parsePriceDocument, type PricePoint } from "./history";

export function loadForecastDir(dir: string): PricePoint[] {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".json"))
    .map((e) => e.name)
    .sort();
  if (files.length === 0) {
    return [];
  }
  const merged: PricePoint[] = [];
  for (const name of files) {
    const fp = path.join(dir, name);
    const txt = fs.readFileSync(fp, "utf8");
    const parsed: unknown = JSON.parse(txt);
    const batch = parsePriceDocument(parsed, fp);
    for (let i = 0; i < batch.length; i++) {
      merged.push(batch[i]!);
    }
  }
  merged.sort((a, b) => a.timeMs - b.timeMs);
  const seen = new Map<number, PricePoint>();
  const deduped: PricePoint[] = [];
  for (const p of merged) {
    const prev = seen.get(p.timeMs);
    if (prev !== undefined) {
      if (prev.price !== p.price || prev.amount !== p.amount) {
        throw new Error(
          `Conflicting prices for time ${String(p.timeMs)}: ${String(prev.price)}/${String(prev.amount)} vs ${String(p.price)}/${String(p.amount)}`,
        );
      }
      continue;
    }
    seen.set(p.timeMs, p);
    deduped.push(p);
  }
  return deduped;
}
