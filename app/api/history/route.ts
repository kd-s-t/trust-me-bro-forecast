import { NextResponse } from "next/server";
import { syncJobPayload } from "@/lib/api/syncJobPayload";
import { requireAuth } from "@/lib/auth/requireAuth";
import {
  type ChartHistoryView,
  isChartHistoryView,
} from "@/lib/chart/historyView";
import { loadHistoryPayload } from "@/lib/chart/loadHistoryPayload";
import { DEFAULT_HISTORY_SYMBOL } from "@/lib/constants";
import {
  createSyncJob,
  findRunningSyncJob,
  getSyncJob,
} from "@/lib/db/syncJobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Chart history sample, or sync job status when `jobId` is set. */
export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireAuth();
  if ("response" in auth) {
    return auth.response;
  }

  const jobId = new URL(request.url).searchParams.get("jobId")?.trim();
  if (jobId !== undefined && jobId !== "") {
    try {
      const job = await getSyncJob(jobId);
      if (job === null) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }
      return NextResponse.json(syncJobPayload(job));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const viewParam = new URL(request.url).searchParams.get("view");
  const view: ChartHistoryView = isChartHistoryView(viewParam)
    ? viewParam
    : "default";

  try {
    const data = await loadHistoryPayload(view);
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Start background Kaggle → Postgres sync; returns jobId immediately. */
export async function POST(): Promise<NextResponse> {
  const auth = await requireAuth();
  if ("response" in auth) {
    return auth.response;
  }

  try {
    const running = await findRunningSyncJob(DEFAULT_HISTORY_SYMBOL);
    if (running !== null) {
      return NextResponse.json({
        ...syncJobPayload(running),
        alreadyRunning: true,
      });
    }

    const job = await createSyncJob(DEFAULT_HISTORY_SYMBOL);
    const jobId = job.id;

    const { spawnSyncJobWorker } = await import("@/lib/db/spawnSyncWorker");
    spawnSyncJobWorker(jobId);

    return NextResponse.json({
      ...syncJobPayload(job),
      alreadyRunning: false,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
