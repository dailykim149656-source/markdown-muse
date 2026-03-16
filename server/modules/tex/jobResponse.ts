import type { TexJobEnqueueResponse, TexJobStatusResponse } from "@/types/tex";
import type { TexJobRecord } from "./jobStore";

export const getTexJobPollPath = (jobId: string) => `/jobs/${encodeURIComponent(jobId)}`;

export const buildTexJobEnqueueResponse = (record: TexJobRecord): TexJobEnqueueResponse => ({
  jobId: record.jobId,
  mode: record.mode,
  pollUrl: getTexJobPollPath(record.jobId),
  status: "queued",
});

export const buildTexJobStatusResponse = (record: TexJobRecord): TexJobStatusResponse => ({
  compileMs: record.compileMs,
  diagnostics: record.diagnostics,
  downloadUrl: record.downloadUrl,
  error: record.error,
  expiresAt: record.expiresAt,
  jobId: record.jobId,
  logSummary: record.logSummary,
  mode: record.mode,
  previewUrl: record.previewUrl,
  status: record.status,
});
