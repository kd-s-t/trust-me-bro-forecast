import type { getSyncJob } from "@/lib/db/syncJobs";

export function syncJobPayload(
  job: NonNullable<Awaited<ReturnType<typeof getSyncJob>>>,
) {
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
