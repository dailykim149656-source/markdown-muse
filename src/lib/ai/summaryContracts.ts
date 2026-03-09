import type { IngestionMetadata, NormalizedIngestionDocument } from "@/lib/ingestion/contracts";
import type { KeywordRetrievalMatch } from "@/lib/retrieval/keywordRetrieval";

export type SummaryStyle = "bullets" | "executive" | "paragraph";

export interface SummaryChunkInput {
  chunkId: string;
  ingestionId: string;
  metadata?: Record<string, string>;
  sectionId?: string;
  text: string;
  tokenEstimate: number;
}

export interface SummaryDocumentContext {
  fileName: string;
  ingestionId: string;
  metadata: IngestionMetadata;
  sourceFormat: string;
}

export interface SummaryRequest {
  chunkInputs: SummaryChunkInput[];
  documents: SummaryDocumentContext[];
  maxWords?: number;
  objective: string;
  requestId: string;
  style: SummaryStyle;
}

export interface SummarySourceAttribution {
  chunkId: string;
  excerpt?: string;
  ingestionId: string;
  rationale?: string;
  sectionId?: string;
}

export interface SummaryResponse {
  attributions: SummarySourceAttribution[];
  bulletPoints?: string[];
  requestId: string;
  summary: string;
}

export interface SummaryResponseValidationResult {
  missingChunkReferences: string[];
  valid: boolean;
}

interface BuildSummaryRequestOptions {
  maxWords?: number;
  requestId: string;
  style?: SummaryStyle;
}

const dedupeByChunkId = (matches: KeywordRetrievalMatch[]) => {
  const seen = new Set<string>();
  return matches.filter((match) => {
    const key = `${match.documentId}:${match.chunk.chunkId}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

export const buildSummaryRequestFromMatches = (
  objective: string,
  matches: KeywordRetrievalMatch[],
  documents: NormalizedIngestionDocument[],
  options: BuildSummaryRequestOptions,
): SummaryRequest => {
  const uniqueMatches = dedupeByChunkId(matches);

  return {
    chunkInputs: uniqueMatches.map((match) => ({
      chunkId: match.chunk.chunkId,
      ingestionId: match.documentId,
      metadata: match.chunk.metadata,
      sectionId: match.chunk.sectionId,
      text: match.chunk.text,
      tokenEstimate: match.chunk.tokenEstimate,
    })),
    documents: documents
      .filter((document) => uniqueMatches.some((match) => match.documentId === document.ingestionId))
      .map((document) => ({
        fileName: document.fileName,
        ingestionId: document.ingestionId,
        metadata: document.metadata,
        sourceFormat: document.sourceFormat,
      })),
    maxWords: options.maxWords,
    objective,
    requestId: options.requestId,
    style: options.style || "paragraph",
  };
};

export const validateSummaryResponse = (
  request: SummaryRequest,
  response: SummaryResponse,
): SummaryResponseValidationResult => {
  const validChunkIds = new Set(
    request.chunkInputs.map((chunkInput) => `${chunkInput.ingestionId}:${chunkInput.chunkId}`),
  );
  const missingChunkReferences = response.attributions
    .map((attribution) => `${attribution.ingestionId}:${attribution.chunkId}`)
    .filter((key) => !validChunkIds.has(key));

  return {
    missingChunkReferences,
    valid: response.requestId === request.requestId && missingChunkReferences.length === 0,
  };
};
