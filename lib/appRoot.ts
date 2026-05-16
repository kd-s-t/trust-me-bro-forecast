import { accessSync } from "node:fs";
import { join } from "node:path";

function exists(path: string): boolean {
  try {
    accessSync(path);
    return true;
  } catch {
    return false;
  }
}

/** Next app root (handles `npm run dev` from repo or monorepo parent). */
export function getAppRoot(): string {
  const cwd = process.cwd();
  if (exists(join(cwd, "package.json"))) {
    return cwd;
  }
  const nested = join(cwd, "bitcoin-forecast");
  if (exists(join(nested, "package.json"))) {
    return nested;
  }
  return cwd;
}
