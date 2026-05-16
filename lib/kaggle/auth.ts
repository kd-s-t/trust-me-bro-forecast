import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type KaggleAuth =
  | { kind: "bearer"; token: string }
  | { kind: "basic"; username: string; key: string };

export function getKaggleAuth(): KaggleAuth {
  const tokenEnv = process.env.KAGGLE_API_TOKEN;
  if (typeof tokenEnv === "string") {
    const token = tokenEnv.trim();
    if (token.length > 0) {
      if (!token.startsWith("KGAT_")) {
        throw new Error("KAGGLE_API_TOKEN must start with KGAT_");
      }
      return { kind: "bearer", token };
    }
  }
  const envU = process.env.KAGGLE_USERNAME;
  const envK = process.env.KAGGLE_KEY;
  if (
    typeof envU === "string" &&
    envU.length > 0 &&
    typeof envK === "string" &&
    envK.length > 0
  ) {
    return { kind: "basic", username: envU, key: envK };
  }
  const kaggleJson = join(homedir(), ".kaggle", "kaggle.json");
  if (!existsSync(kaggleJson)) {
    throw new Error(
      "Set KAGGLE_API_TOKEN in .env, or KAGGLE_USERNAME and KAGGLE_KEY, or add ~/.kaggle/kaggle.json",
    );
  }
  const raw = readFileSync(kaggleJson, "utf8");
  const j = JSON.parse(raw) as { username?: unknown; key?: unknown };
  if (typeof j.username !== "string" || typeof j.key !== "string") {
    throw new Error("~/.kaggle/kaggle.json must contain string username and key");
  }
  return { kind: "basic", username: j.username, key: j.key };
}
