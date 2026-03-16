export type TexSourceType = "generated-latex" | "raw-latex";
export type TexEngine = "xelatex";
export type TexDiagnosticSeverity = "error" | "warning";
export type TexDiagnosticStage = "compile" | "latexmk";

export interface TexDiagnostic {
  column?: number;
  line?: number;
  message: string;
  severity: TexDiagnosticSeverity;
  stage: TexDiagnosticStage;
}

export interface TexValidateRequest {
  contentHash: string;
  documentName?: string;
  latex: string;
  sourceType: TexSourceType;
}

export interface TexValidateResponse {
  compileMs: number;
  diagnostics: TexDiagnostic[];
  engine: TexEngine;
  logSummary: string;
  ok: boolean;
}

export interface TexPreviewRequest {
  contentHash: string;
  documentName?: string;
  latex: string;
  sourceType: TexSourceType;
}

export interface TexPreviewResponse extends TexValidateResponse {
  previewExpiresAt?: number;
  previewUrl?: string;
}

export type TexJobMode = "export" | "preview";
export type TexJobStatus = "failed" | "queued" | "running" | "succeeded";

export interface TexJobEnqueueResponse {
  jobId: string;
  mode: TexJobMode;
  pollUrl: string;
  status: Extract<TexJobStatus, "queued">;
}

export interface TexJobStatusResponse {
  compileMs?: number;
  diagnostics?: TexDiagnostic[];
  downloadUrl?: string;
  error?: string;
  expiresAt?: number;
  jobId: string;
  logSummary?: string;
  mode: TexJobMode;
  previewUrl?: string;
  status: TexJobStatus;
}

export interface TexExportPdfRequest {
  documentName?: string;
  latex: string;
  sourceType: TexSourceType;
}

export interface TexAutoFixRequest {
  diagnostics: TexDiagnostic[];
  documentName?: string;
  latex: string;
  logSummary: string;
  sourceType: TexSourceType;
  locale?: string;
}

export interface TexAutoFixResponse {
  fixedLatex: string;
  rationale: string;
  validation: TexValidateResponse;
}

export interface TexHealthResponse {
  configured: boolean;
  engine: TexEngine;
  ok: boolean;
}
