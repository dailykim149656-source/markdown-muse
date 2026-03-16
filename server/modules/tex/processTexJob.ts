import type { IncomingMessage } from "node:http";
import { HttpError } from "../http/http";
import { storeTexArtifactPdf } from "./artifactStorage";
import { getTexJobStore } from "./jobStore";
import { compileTexArtifact } from "./compiler";
import type { TexJobMode } from "@/types/tex";

const buildArtifactResult = async ({
  documentName,
  mode,
  pdfBuffer,
  request,
}: {
  documentName?: string;
  mode: TexJobMode;
  pdfBuffer: Buffer;
  request: IncomingMessage;
}) => {
  const artifact = await storeTexArtifactPdf({
    documentName,
    mode,
    pdfBuffer,
    request,
  });

  return mode === "preview"
    ? {
      expiresAt: artifact.expiresAt,
      previewUrl: artifact.url,
      storageBackend: artifact.storageBackend,
    }
    : {
      downloadUrl: artifact.url,
      expiresAt: artifact.expiresAt,
      storageBackend: artifact.storageBackend,
    };
};

export const processTexJobById = async ({
  jobId,
  request,
}: {
  jobId: string;
  request: IncomingMessage;
}) => {
  const jobStore = getTexJobStore();
  const job = await jobStore.claimJob(jobId);

  if (!job) {
    return null;
  }

  try {
    const compileResult = await compileTexArtifact({
      documentName: job.documentName,
      latex: job.latex,
      mode: job.mode,
      sourceType: job.sourceType,
    });

    if (!compileResult.ok || !compileResult.pdfBuffer) {
      await jobStore.completeJob(job.jobId, "failed", {
        compileMs: compileResult.compileMs,
        diagnostics: compileResult.diagnostics,
        error: compileResult.diagnostics.find((diagnostic) => diagnostic.severity === "error")?.message || "XeLaTeX compilation failed.",
        logSummary: compileResult.logSummary,
      });
      return null;
    }

    const artifactResult = await buildArtifactResult({
      documentName: job.documentName,
      mode: job.mode,
      pdfBuffer: compileResult.pdfBuffer,
      request,
    });

    await jobStore.completeJob(job.jobId, "succeeded", {
      compileMs: compileResult.compileMs,
      diagnostics: compileResult.diagnostics,
      ...(job.mode === "preview"
        ? { previewUrl: artifactResult.previewUrl }
        : { downloadUrl: artifactResult.downloadUrl }),
      expiresAt: artifactResult.expiresAt,
      logSummary: compileResult.logSummary,
    });

    return artifactResult;
  } catch (error) {
    const message = error instanceof HttpError || error instanceof Error
      ? error.message
      : "Unexpected TeX job failure.";

    await jobStore.completeJob(job.jobId, "failed", {
      error: message,
    }).catch(() => {});
    throw error;
  }
};
