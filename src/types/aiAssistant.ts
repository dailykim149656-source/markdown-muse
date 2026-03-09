import type { EditorMode } from "@/types/document";

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
}

export interface GenerateSectionResponse {
  attributions: AiSourceAttribution[];
  body: string;
  rationale: string;
  title: string;
}
