import type { EditorMode } from "@/types/document";
import type { Locale } from "@/i18n/types";

export interface AiAssistantDocumentPayload {
  documentId: string;
  fileName: string;
  markdown: string;
  mode: Exclude<EditorMode, "json" | "yaml">;
}

export interface AiAssistantScreenshotPayload {
  capturedAt: number;
  dataBase64: string;
  height: number;
  mimeType: "image/jpeg" | "image/png";
  width: number;
}

export interface AiSourceAttribution {
  chunkId: string;
  ingestionId: string;
  rationale?: string;
  sectionId?: string;
}

export interface SummarizeDocumentRequest {
  document: AiAssistantDocumentPayload;
  objective: string;
  locale?: Locale;
  screenshot?: AiAssistantScreenshotPayload;
}

export interface SummarizeDocumentResponse {
  attributions: AiSourceAttribution[];
  bulletPoints: string[];
  requestId: string;
  summary: string;
}

export interface GenerateSectionHeadingContext {
  level: number;
  nodeId: string;
  text: string;
}

export interface GenerateSectionRequest {
  document: AiAssistantDocumentPayload;
  existingHeadings: GenerateSectionHeadingContext[];
  prompt: string;
  locale?: Locale;
  screenshot?: AiAssistantScreenshotPayload;
}

export interface GenerateSectionResponse {
  attributions: AiSourceAttribution[];
  body: string;
  rationale: string;
  title: string;
}

export interface GenerateTocEntry {
  anchorStrategy: "existing_heading" | "promote_block" | "unmatched";
  anchorText: string;
  level: 1 | 2 | 3;
  title: string;
}

export interface GenerateTocRequest {
  document: AiAssistantDocumentPayload;
  existingHeadings: GenerateSectionHeadingContext[];
  locale?: Locale;
  screenshot?: AiAssistantScreenshotPayload;
}

export interface GenerateTocResponse {
  attributions: AiSourceAttribution[];
  entries: GenerateTocEntry[];
  maxDepth: 1 | 2 | 3;
  rationale: string;
}

export type AiAssistantActionType = "none" | "open_patch_review";

export interface ProposeEditorActionRequest {
  candidatePatchCount?: number;
  document: AiAssistantDocumentPayload;
  existingHeadings: GenerateSectionHeadingContext[];
  intent: "review_patch_suggestion";
  issueSummary?: string;
  locale?: Locale;
  screenshot?: AiAssistantScreenshotPayload;
  targetDocumentId?: string;
  targetDocumentName?: string;
}

export interface ProposeEditorActionResponse {
  action: AiAssistantActionType;
  confidence: number;
  payload: {
    targetDocumentId?: string;
    title: string;
  };
  reason: string;
}

export type AutosaveDiffSummaryDeltaKind = "added" | "removed" | "changed" | "inconsistent";

export interface AutosaveDiffSummaryDelta {
  afterExcerpt?: string;
  beforeExcerpt?: string;
  kind: AutosaveDiffSummaryDeltaKind;
  summary: string;
  title: string;
}

export interface AutosaveDiffSummaryRequest {
  comparison: {
    counts: Record<AutosaveDiffSummaryDeltaKind, number>;
    deltas: AutosaveDiffSummaryDelta[];
  };
  document: {
    documentId: string;
    fileName: string;
    mode: Exclude<EditorMode, "json" | "yaml">;
  };
  locale?: Locale;
}

export interface AutosaveDiffSummaryResponse {
  requestId: string;
  summary: string;
}
