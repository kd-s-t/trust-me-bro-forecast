import fs from "fs";
import path from "path";

export type FxConfig = {
  pesoPerUsd: number;
};

export function loadFxConfig(rootDir: string): FxConfig {
  const fp = path.join(rootDir, "config", "fx.json");
  const raw: unknown = JSON.parse(fs.readFileSync(fp, "utf8"));
  if (typeof raw !== "object" || raw === null || !("pesoPerUsd" in raw)) {
    throw new Error("config/fx.json must be an object with pesoPerUsd");
  }
  const pesoPerUsd = Number((raw as { pesoPerUsd: unknown }).pesoPerUsd);
  if (!Number.isFinite(pesoPerUsd) || pesoPerUsd <= 0) {
    throw new Error("config/fx.json pesoPerUsd must be a positive number (PHP per 1 USD)");
  }
  return { pesoPerUsd };
}
