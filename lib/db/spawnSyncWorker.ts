import { spawn } from "node:child_process";
import { join } from "node:path";

/** Run sync in a detached process so conversion is not cut off when the HTTP request ends. */
export function spawnSyncJobWorker(jobId: string): void {
  const cwd = process.cwd();
  const tsx = join(cwd, "node_modules", ".bin", "tsx");
  const script = join(cwd, "scripts", "run-sync-job.ts");
  const child = spawn(tsx, [script, jobId], {
    cwd,
    detached: true,
    stdio: "ignore",
    env: process.env,
  });
  child.unref();
}
