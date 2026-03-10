import type { EditorMode } from "@/types/document";
import type { Locale } from "@/i18n/types";

export interface AiAssistantDocumentPayload {
  documentId: string;
  fileName: string;
  markdown: string;
  mode: Exclude<EditorMode, "json" | "yaml">;
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
}

export interface GenerateSectionResponse {
  attributions: AiSourceAttribution[];
  body: string;
  rationale: string;
  title: string;
}

export interface GenerateTocEntry {
  level: 1 | 2 | 3;
  title: string;
}

export interface GenerateTocRequest {
  document: AiAssistantDocumentPayload;
  existingHeadings: GenerateSectionHeadingContext[];
  locale?: Locale;
}

export interface GenerateTocResponse {
  attributions: AiSourceAttribution[];
  entries: GenerateTocEntry[];
  maxDepth: 1 | 2 | 3;
  rationale: string;
}
