import type { JSONContent } from "@tiptap/core";
import * as yaml from "js-yaml";
import { migrateStoredDocumentData } from "@/lib/documents/storedDocument";
import { renderAstToHtml } from "@/lib/ast/renderAstToHtml";
import { renderAstToLatex } from "@/lib/ast/renderAstToLatex";
import { renderAstToMarkdown } from "@/lib/ast/renderAstToMarkdown";
import { hydrateAstToTiptap, serializeTiptapToAst } from "@/lib/ast/tiptapAst";
import type { CreateDocumentOptions, DocumentData, EditorMode, SourceSnapshots } from "@/types/document";
import type {
  DocsyDocument,
  DocumentMetadata,
  RichTextDocument,
  StructuredDataAst,
  StructuredDataDocument,
  StructuredValue,
} from "@/types/documentAst";

export const DOCSY_FILE_FORMAT = "docsy";
export const DOCSY_FILE_VERSION = "1.0";

export interface DocsyFileEnvelope {
  document: DocsyDocument;
  format: typeof DOCSY_FILE_FORMAT;
  savedAt: number;
  sourceSnapshots?: SourceSnapshots;
  tiptap?: JSONContent | null;
  version: typeof DOCSY_FILE_VERSION;
}

const EMPTY_TIPTAP_DOCUMENT: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeMetadata = (metadata: DocumentMetadata | undefined): DocumentMetadata => ({
  ...(metadata || {}),
});

const normalizeSourceSnapshots = (
  snapshots: SourceSnapshots | undefined,
  mode: EditorMode,
  content: string,
): SourceSnapshots => ({
  ...(snapshots || {}),
  [mode]: snapshots?.[mode] ?? content,
});

const buildRichTextSnapshots = (document: RichTextDocument, snapshots?: SourceSnapshots): SourceSnapshots => ({
  ...(snapshots || {}),
  html: renderAstToHtml(document.ast),
  latex: renderAstToLatex(document.ast, { includeWrapper: false }),
  markdown: renderAstToMarkdown(document.ast),
});

const toStructuredValue = (value: unknown): StructuredValue => {
  if (value === null) {
    return {
      type: "scalar",
      value: null,
      valueType: "null",
    };
  }

  if (Array.isArray(value)) {
    return {
      type: "array",
      items: value.map(toStructuredValue),
    };
  }

  if (typeof value === "object") {
    return {
      type: "object",
      properties: Object.entries(value as Record<string, unknown>).map(([key, child]) => ({
        key,
        value: toStructuredValue(child),
      })),
    };
  }

  if (typeof value === "number") {
    return {
      type: "scalar",
      value,
      valueType: "number",
    };
  }

  if (typeof value === "boolean") {
    return {
      type: "scalar",
      value,
      valueType: "boolean",
    };
  }

  return {
    type: "scalar",
    value: typeof value === "string" ? value : String(value ?? ""),
    valueType: "string",
  };
};

const fromStructuredValue = (value: StructuredValue): unknown => {
  switch (value.type) {
    case "scalar":
      return value.value;
    case "array":
      return value.items.map(fromStructuredValue);
    case "object":
      return Object.fromEntries(value.properties.map((property) => [property.key, fromStructuredValue(property.value)]));
    default:
      return null;
  }
};

const parseStructuredSource = (mode: "json" | "yaml", content: string): StructuredDataAst => {
  try {
    const parsed = mode === "json" ? JSON.parse(content || "null") : yaml.load(content || "null");

    return {
      format: mode,
      root: toStructuredValue(parsed),
    };
  } catch {
    return {
      format: mode,
      root: toStructuredValue(content),
    };
  }
};

const serializeStructuredSource = (structured: StructuredDataAst): string => {
  const value = fromStructuredValue(structured.root);

  if (structured.format === "json") {
    return JSON.stringify(value, null, 2);
  }

  return yaml.dump(value, { indent: 2, lineWidth: 120, noRefs: true });
};

const resolveRichTextTiptap = (document: DocumentData) => {
  if (document.tiptapJson) {
    return document.tiptapJson;
  }

  if (document.ast) {
    return hydrateAstToTiptap(document.ast);
  }

  return EMPTY_TIPTAP_DOCUMENT;
};

const resolveRichTextAst = (document: DocumentData, tiptap: JSONContent) => {
  if (document.ast) {
    return document.ast;
  }

  return serializeTiptapToAst(tiptap, {
    documentNodeId: `doc-${document.id}`,
    throwOnUnsupported: false,
  });
};

const isDocsyDocument = (value: unknown): value is DocsyDocument => {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.docId === "string"
    && typeof value.name === "string"
    && typeof value.primaryMode === "string"
    && typeof value.createdAt === "number"
    && typeof value.updatedAt === "number"
    && value.version === DOCSY_FILE_VERSION
    && (value.kind === "rich_text" || value.kind === "structured_data");
};

export const isDocsyFileEnvelope = (value: unknown): value is DocsyFileEnvelope => {
  if (!isRecord(value)) {
    return false;
  }

  return value.format === DOCSY_FILE_FORMAT
    && value.version === DOCSY_FILE_VERSION
    && typeof value.savedAt === "number"
    && isDocsyDocument(value.document);
};

export const parseDocsyFile = (raw: string): DocsyFileEnvelope => {
  const parsed = JSON.parse(raw) as unknown;

  if (!isDocsyFileEnvelope(parsed)) {
    throw new Error("Invalid .docsy file format.");
  }

  return parsed;
};

export const serializeDocsyFile = (input: DocsyFileEnvelope) => JSON.stringify(input, null, 2);

export const migrateLegacyDocumentData = (document: DocumentData): DocumentData =>
  migrateStoredDocumentData(document);

export const buildDocsyFileFromDocumentData = (document: DocumentData): DocsyFileEnvelope => {
  const normalizedDocument = migrateLegacyDocumentData(document);

  if (normalizedDocument.mode === "json" || normalizedDocument.mode === "yaml") {
    const structured = parseStructuredSource(normalizedDocument.mode, normalizedDocument.content);
    const structuredDocument: StructuredDataDocument = {
      createdAt: normalizedDocument.createdAt,
      docId: normalizedDocument.id,
      kind: "structured_data",
      metadata: normalizeMetadata(normalizedDocument.metadata),
      name: normalizedDocument.name,
      primaryMode: normalizedDocument.mode,
      structured,
      updatedAt: normalizedDocument.updatedAt,
      version: DOCSY_FILE_VERSION,
    };

    return {
      document: structuredDocument,
      format: DOCSY_FILE_FORMAT,
      savedAt: Date.now(),
      sourceSnapshots: normalizeSourceSnapshots(
        normalizedDocument.sourceSnapshots,
        normalizedDocument.mode,
        normalizedDocument.content,
      ),
      version: DOCSY_FILE_VERSION,
    };
  }

  const tiptap = resolveRichTextTiptap(normalizedDocument);
  const ast = resolveRichTextAst(normalizedDocument, tiptap);
  const richTextDocument: RichTextDocument = {
    ast,
    createdAt: normalizedDocument.createdAt,
    docId: normalizedDocument.id,
    kind: "rich_text",
    metadata: normalizeMetadata(normalizedDocument.metadata),
    name: normalizedDocument.name,
    primaryMode: normalizedDocument.mode,
    updatedAt: normalizedDocument.updatedAt,
    version: DOCSY_FILE_VERSION,
  };
  const sourceSnapshots = normalizeSourceSnapshots(
    buildRichTextSnapshots(richTextDocument, normalizedDocument.sourceSnapshots),
    normalizedDocument.mode,
    normalizedDocument.content,
  );

  return {
    document: richTextDocument,
    format: DOCSY_FILE_FORMAT,
    savedAt: Date.now(),
    sourceSnapshots,
    tiptap,
    version: DOCSY_FILE_VERSION,
  };
};

export const buildDocumentDataFromDocsyFile = (file: DocsyFileEnvelope): CreateDocumentOptions => {
  const { document, sourceSnapshots } = file;

  if (document.kind === "structured_data") {
    const structuredSnapshots = normalizeSourceSnapshots(
      sourceSnapshots,
      document.primaryMode,
      sourceSnapshots?.[document.primaryMode] ?? serializeStructuredSource(document.structured),
    );

    return {
      content: structuredSnapshots[document.primaryMode] || "",
      createdAt: document.createdAt,
      id: document.docId,
      metadata: normalizeMetadata(document.metadata),
      mode: document.primaryMode,
      name: document.name,
      sourceSnapshots: structuredSnapshots,
      storageKind: "docsy",
      updatedAt: document.updatedAt,
    };
  }

  const richTextSnapshots = buildRichTextSnapshots(document, sourceSnapshots);

  return {
    ast: document.ast,
    content: richTextSnapshots[document.primaryMode] || "",
    createdAt: document.createdAt,
    id: document.docId,
    metadata: normalizeMetadata(document.metadata),
    mode: document.primaryMode,
    name: document.name,
    sourceSnapshots: richTextSnapshots,
    storageKind: "docsy",
    tiptapJson: file.tiptap ?? hydrateAstToTiptap(document.ast),
    updatedAt: document.updatedAt,
  };
};
