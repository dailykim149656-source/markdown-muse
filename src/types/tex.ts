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
  pdfBase64?: string;
}

export interface TexExportPdfRequest {
  documentName?: string;
  latex: string;
  sourceType: TexSourceType;
}

export interface TexHealthResponse {
  configured: boolean;
  engine: TexEngine;
  ok: boolean;
}
