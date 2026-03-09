import type { IngestionMetadata, NormalizedIngestionDocument } from "@/lib/ingestion/contracts";

export interface SemanticChunkHierarchy {
  level?: number;
  order: number;
  sectionId?: string;
  sectionPath: string[];
  sectionTitle?: string;
}

export interface SemanticChunkTextBoundary {
  endOffset: number;
  startOffset: number;
}

export interface SemanticChunkMetadata extends IngestionMetadata {
  fileName: string;
  importedAt: number;
  sourceFormat: string;
}

export interface SemanticChunkRecord {
  chunkId: string;
  documentId: string;
  hierarchy: SemanticChunkHierarchy;
  metadata: SemanticChunkMetadata;
  semanticChunkId: string;
  text: string;
  textBoundary: SemanticChunkTextBoundary;
  tokenEstimate: number;
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s]+/g, " ")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "chunk";

const buildSemanticChunkId = (
  document: NormalizedIngestionDocument,
  chunkId: string,
  sectionPath: string[],
) => [
  document.ingestionId,
  slugify(document.metadata.title || document.fileName.replace(/\.[^.]+$/, "")),
  slugify(sectionPath.join("-") || "root"),
  chunkId,
].join(":");

export const buildSemanticChunkRecords = (document: NormalizedIngestionDocument): SemanticChunkRecord[] => {
  let runningOffset = 0;
  const sectionLookup = new Map(document.sections.map((section) => [section.sectionId, section]));

  return document.chunks.map((chunk) => {
    const section = chunk.sectionId ? sectionLookup.get(chunk.sectionId) : undefined;
    const startOffset = runningOffset;
    const endOffset = startOffset + chunk.text.length;
    runningOffset = endOffset + 1;
    const sectionPath = section?.path || [];

    return {
      chunkId: chunk.chunkId,
      documentId: document.ingestionId,
      hierarchy: {
        level: section?.level,
        order: chunk.order,
        sectionId: chunk.sectionId,
        sectionPath,
        sectionTitle: section?.title,
      },
      metadata: {
        authors: document.metadata.authors,
        documentType: document.metadata.documentType,
        fileName: document.fileName,
        importedAt: document.importedAt,
        labels: document.metadata.labels,
        sourceFormat: document.sourceFormat,
        tags: document.metadata.tags,
        title: document.metadata.title,
      },
      semanticChunkId: buildSemanticChunkId(document, chunk.chunkId, sectionPath),
      text: chunk.text,
      textBoundary: {
        endOffset,
        startOffset,
      },
      tokenEstimate: chunk.tokenEstimate,
    };
  });
};
