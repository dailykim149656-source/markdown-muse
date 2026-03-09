import type { EditorMode } from "@/types/document";

export type IngestionSourceFormat = EditorMode | "asciidoc" | "rst";

export interface IngestionRequest {
  ingestionId: string;
  fileName: string;
  sourceFormat: IngestionSourceFormat;
  rawContent: string;
  importedAt: number;
}

export interface IngestionSection {
  sectionId: string;
  title: string;
  level: number;
  text: string;
  path: string[];
}

export interface IngestionMetadata {
  title?: string;
  authors?: string[];
  tags?: string[];
  documentType?: string;
  labels?: Record<string, string>;
}

export interface IngestionChunk {
  chunkId: string;
  sectionId?: string;
  order: number;
  text: string;
  tokenEstimate: number;
  metadata?: Record<string, string>;
}

export interface IngestionImage {
  imageId: string;
  order: number;
  src: string;
  alt?: string;
  title?: string;
  caption?: string;
  sectionId?: string;
  surroundingText?: string;
  metadata?: Record<string, string>;
}

export interface NormalizedIngestionDocument {
  ingestionId: string;
  fileName: string;
  sourceFormat: IngestionSourceFormat;
  plainText: string;
  metadata: IngestionMetadata;
  sections: IngestionSection[];
  chunks: IngestionChunk[];
  images: IngestionImage[];
  importedAt: number;
}

export const createEmptyIngestionDocument = (request: IngestionRequest): NormalizedIngestionDocument => ({
  ingestionId: request.ingestionId,
  fileName: request.fileName,
  sourceFormat: request.sourceFormat,
  plainText: "",
  metadata: {},
  sections: [],
  chunks: [],
  images: [],
  importedAt: request.importedAt,
});
