import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { DEFAULT_HISTORY_SYMBOL } from "@/lib/constants";
import { spawnSyncJobWorker } from "@/lib/db/spawnSyncWorker";
import {
  createSyncJob,
  findRunningSyncJob,
  getSyncJob,
} from "@/lib/db/syncJobs";
import { runMigrations } from "@/lib/db/migrate";
import { closeSql } from "@/lib/db/sql";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function jobPayload(job: NonNullable<Awaited<ReturnType<typeof getSyncJob>>>) {
  return {
    jobId: job.id,
    status: job.status,
    message: job.message,
    phase: job.phase,
    scanned: job.scanned,
    uploadedBytes: job.uploadedBytes,
    newMaxTimeMs: job.newMaxTimeMs,
    kaggleVersion: job.kaggleVersion,
    r2Key: job.r2Key,
    error: job.error,
    updatedAt: job.updatedAt,
  };
}

/** Poll sync job status. */
export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireAuth();
  if ("response" in auth) {
    return auth.response;
  }

  const jobId = new URL(request.url).searchParams.get("jobId")?.trim();
  if (jobId === undefined || jobId === "") {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  try {
    await runMigrations();
    const job = await getSyncJob(jobId);
    if (job === null) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    return NextResponse.json(jobPayload(job));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await closeSql();
  }
}

/** Start background Kaggle → R2 sync; returns jobId immediately. */
export async function POST(): Promise<NextResponse> {
  const auth = await requireAuth();
  if ("response" in auth) {
    return auth.response;
  }

  try {
    await runMigrations();
    const running = await findRunningSyncJob(DEFAULT_HISTORY_SYMBOL);
    if (running !== null) {
      return NextResponse.json({
        ...jobPayload(running),
        alreadyRunning: true,
      });
    }

    const job = await createSyncJob(DEFAULT_HISTORY_SYMBOL);
    const jobId = job.id;

    spawnSyncJobWorker(jobId);

    return NextResponse.json({
      ...jobPayload(job),
      alreadyRunning: false,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await closeSql();
  }
}
