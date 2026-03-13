import type {
  TexExportPdfRequest,
  TexHealthResponse,
  TexPreviewRequest,
  TexPreviewResponse,
  TexValidateRequest,
  TexValidateResponse,
} from "@/types/tex";
import { getJson, postBinary, postJson, type RequestOptions } from "@/lib/ai/httpClient";

export const getTexHealth = (options?: RequestOptions) =>
  getJson<TexHealthResponse>("/api/tex/health", options);

export const validateTex = (request: TexValidateRequest, options?: RequestOptions) =>
  postJson<TexValidateResponse, TexValidateRequest>("/api/tex/validate", request, options);

export const previewTex = (request: TexPreviewRequest, options?: RequestOptions) =>
  postJson<TexPreviewResponse, TexPreviewRequest>("/api/tex/preview", request, options);

export const exportTexPdf = (request: TexExportPdfRequest, options?: RequestOptions) =>
  postBinary("/api/tex/export-pdf", request, options);
