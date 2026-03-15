import type {
  GenerateTocRequest,
  GenerateTocResponse,
  GenerateSectionRequest,
  GenerateSectionResponse,
  ProposeEditorActionRequest,
  ProposeEditorActionResponse,
  SummarizeDocumentRequest,
  SummarizeDocumentResponse,
} from "@/types/aiAssistant";
import { postJson } from "@/lib/ai/httpClient";

export const summarizeDocument = (request: SummarizeDocumentRequest) =>
  postJson<SummarizeDocumentResponse, SummarizeDocumentRequest>("/api/ai/summarize", request);

export const generateSection = (request: GenerateSectionRequest) =>
  postJson<GenerateSectionResponse, GenerateSectionRequest>("/api/ai/generate-section", request);

export const generateToc = (request: GenerateTocRequest) =>
  postJson<GenerateTocResponse, GenerateTocRequest>("/api/ai/generate-toc", request);

export const proposeEditorAction = (request: ProposeEditorActionRequest) =>
  postJson<ProposeEditorActionResponse, ProposeEditorActionRequest>("/api/ai/propose-action", request);
