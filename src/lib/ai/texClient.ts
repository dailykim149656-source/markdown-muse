import type {
  TexHealthResponse,
  TexJobEnqueueResponse,
  TexJobStatusResponse,
  TexExportPdfRequest,
  TexPreviewRequest,
  TexValidateRequest,
  TexValidateResponse,
} from "@/types/tex";
import { getJson, postJson, type RequestOptions } from "@/lib/ai/httpClient";

export const getTexHealth = (options?: RequestOptions) =>
  getJson<TexHealthResponse>("/api/tex/health", options);

export const validateTex = (request: TexValidateRequest, options?: RequestOptions) =>
  postJson<TexValidateResponse, TexValidateRequest>("/api/tex/validate", request, options);

export const previewTex = (request: TexPreviewRequest, options?: RequestOptions) =>
  postJson<TexJobEnqueueResponse, TexPreviewRequest>("/api/tex/preview", request, options);

export const exportTexPdf = (request: TexExportPdfRequest, options?: RequestOptions) =>
  postJson<TexJobEnqueueResponse, TexExportPdfRequest>("/api/tex/export-pdf", request, options);

export const getTexJob = (jobId: string, options?: RequestOptions) =>
  getJson<TexJobStatusResponse>(`/api/tex/jobs/${encodeURIComponent(jobId)}`, options);
