import { createEmptyIngestionDocument, type NormalizedIngestionDocument } from "@/lib/ingestion/contracts";
import { normalizeIngestionRequest } from "@/lib/ingestion/normalizeIngestionRequest";
import { asciidocToHtml } from "@/components/editor/utils/asciidocToHtml";
import { rstToHtml } from "@/components/editor/utils/rstToHtml";
import { keywordRetrieve, type KeywordRetrievalMatch } from "@/lib/retrieval/keywordRetrieval";
import type { CreateDocumentOptions, DocumentData, EditorMode } from "@/types/document";
import type { SourceFileReference } from "@/types/documentAst";
import type { IngestionChunk, IngestionImage, IngestionSection, IngestionSourceFormat } from "@/lib/ingestion/contracts";

export const KNOWLEDGE_RECORD_SCHEMA_VERSION = 2;

export type KnowledgeRecordStatus = "fresh" | "stale";
export type KnowledgeStaleReason = "schema_version" | "source_changed";
export type KnowledgeSearchResultKind = "chunk" | "image";
export type KnowledgeSearchMode = "keyword" | "semantic";

export interface KnowledgeDocumentRecord {
  contentHash: string;
  documentId: string;
  fileName: string;
  indexStatus: KnowledgeRecordStatus;
  indexedAt: number;
  normalizedDocument: NormalizedIngestionDocument;
  rawContent: string;
  schemaVersion: number;
  sourceFile: SourceFileReference;
  sourceFormat: IngestionSourceFormat;
  sourceUpdatedAt: number;
  staleReasons?: KnowledgeStaleReason[];
  updatedAt: number;
}

export interface KnowledgeSearchResult {
  image?: IngestionImage;
  kind: KnowledgeSearchResultKind;
  match?: KeywordRetrievalMatch;
  matchedTerms: string[];
  record: KnowledgeDocumentRecord;
  rerankLabel?: string;
  score: number;
  snippet: string;
}

export interface KnowledgeIndexSummary {
  documentCount: number;
  freshCount: number;
  imageCount: number;
  lastIndexedAt: number | null;
  staleCount: number;
}

const FILE_EXTENSIONS: Record<EditorMode, string> = {
  html: ".html",
  json: ".json",
  latex: ".tex",
  markdown: ".md",
  yaml: ".yaml",
};

const stripFileExtension = (value: string) => value.replace(/\.[^.]+$/, "");

const isIngestionSourceFormat = (value: unknown): value is IngestionSourceFormat =>
  value === "markdown"
  || value === "latex"
  || value === "html"
  || value === "json"
  || value === "yaml"
  || value === "asciidoc"
  || value === "rst";

const resolveFileName = (document: DocumentData) =>
  document.metadata?.sourceFiles?.[0]?.fileName || `${document.name || "Untitled"}${FILE_EXTENSIONS[document.mode]}`;

const resolveSourceFormat = (document: DocumentData, sourceFile: SourceFileReference): IngestionSourceFormat =>
  isIngestionSourceFormat(sourceFile.sourceFormat) ? sourceFile.sourceFormat : document.mode;

const resolveRawContent = (document: DocumentData, sourceFormat: IngestionSourceFormat) =>
  document.sourceSnapshots?.[sourceFormat]
  || document.sourceSnapshots?.[document.mode]
  || document.content
  || document.sourceSnapshots?.markdown
  || document.sourceSnapshots?.html
  || document.sourceSnapshots?.latex
  || "";

const resolveSourceFile = (document: DocumentData, fileName: string): SourceFileReference => {
  const existing = document.metadata?.sourceFiles?.[0];

  if (existing) {
    return existing;
  }

  return {
    fileName,
    importedAt: document.updatedAt,
    sourceFormat: document.mode,
    sourceId: document.id,
  };
};

const toEditorMode = (sourceFormat: IngestionSourceFormat): EditorMode => {
  if (sourceFormat === "asciidoc" || sourceFormat === "rst") {
    return "html";
  }

  return sourceFormat;
};

const stripInlineHtml = (value: string) =>
  value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const cleanInlineText = (value: string | null | undefined) => {
  if (!value) {
    return undefined;
  }

  const normalized = stripInlineHtml(value).replace(/\s+/g, " ").trim();
  return normalized || undefined;
};

const stripSummaryText = (sourceFormat: IngestionSourceFormat, rawContent: string) => {
  switch (sourceFormat) {
    case "html":
      return stripInlineHtml(rawContent);
    case "latex":
      return rawContent
        .replace(/%.*$/gm, "")
        .replace(/\\(begin|end)\{[^}]+\}/g, " ")
        .replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?\{([^}]*)\}/g, "$1")
        .replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?/g, " ")
        .replace(/[{}]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    case "markdown":
      return rawContent
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
        .replace(/[`*_>#-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    default:
      return rawContent.replace(/\s+/g, " ").trim();
  }
};

const stripHeadingMarkup = (value: string) =>
  stripInlineHtml(value)
    .replace(/[`*_#]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const extractSummarySections = (sourceFormat: IngestionSourceFormat, rawContent: string): IngestionSection[] => {
  const sections: IngestionSection[] = [];

  if (sourceFormat === "markdown") {
    const matches = rawContent.matchAll(/^(#{1,3})\s+(.+?)\s*$/gm);
    let order = 0;

    for (const match of matches) {
      const title = stripHeadingMarkup(match[2] || "");

      if (!title) {
        continue;
      }

      order += 1;
      sections.push({
        level: match[1]?.length || 1,
        path: [title],
        sectionId: `summary-md-${order}`,
        text: title,
        title,
      });
    }
  } else if (sourceFormat === "latex") {
    const levelByCommand: Record<string, number> = {
      section: 1,
      subsection: 2,
      subsubsection: 3,
    };
    const matches = rawContent.matchAll(/\\(section|subsection|subsubsection)\{([^}]*)\}/g);
    let order = 0;

    for (const match of matches) {
      const title = stripHeadingMarkup(match[2] || "");

      if (!title) {
        continue;
      }

      order += 1;
      sections.push({
        level: levelByCommand[match[1] || "section"] || 1,
        path: [title],
        sectionId: `summary-tex-${order}`,
        text: title,
        title,
      });
    }
  } else if (sourceFormat === "html") {
    const matches = rawContent.matchAll(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi);
    let order = 0;

    for (const match of matches) {
      const title = stripHeadingMarkup(match[2] || "");

      if (!title) {
        continue;
      }

      order += 1;
      sections.push({
        level: Number(match[1] || "1"),
        path: [title],
        sectionId: `summary-html-${order}`,
        text: title,
        title,
      });
    }
  }

  return sections.slice(0, 48);
};

const extractSummaryImages = (sourceFormat: IngestionSourceFormat, rawContent: string): IngestionImage[] => {
  if (sourceFormat === "markdown") {
    return Array.from(rawContent.matchAll(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)/g))
      .slice(0, 24)
      .map((match, index) => ({
        alt: cleanInlineText(match[1]),
        imageId: `summary-image-md-${index + 1}`,
        order: index,
        src: match[2] || "",
        title: cleanInlineText(match[3]),
      }));
  }

  if (sourceFormat === "latex") {
    return Array.from(rawContent.matchAll(/\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/g))
      .slice(0, 24)
      .map((match, index) => ({
        imageId: `summary-image-tex-${index + 1}`,
        order: index,
        src: match[1] || "",
      }));
  }

  if (sourceFormat === "html") {
    return Array.from(rawContent.matchAll(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi))
      .slice(0, 24)
      .map((match, index) => ({
        imageId: `summary-image-html-${index + 1}`,
        order: index,
        src: match[1] || "",
      }));
  }

  return [];
};

const buildSummaryChunks = (
  fileName: string,
  plainText: string,
  sections: IngestionSection[],
): IngestionChunk[] => {
  const chunkSources = sections.length > 0
    ? sections.map((section) => ({
      sectionId: section.sectionId,
      text: section.title,
    }))
    : [{ sectionId: undefined, text: plainText.slice(0, 1600) }];

  return chunkSources
    .filter((chunk) => chunk.text.trim().length > 0)
    .slice(0, 24)
    .map((chunk, index) => ({
      chunkId: `${fileName}:summary:${index + 1}`,
      metadata: chunk.sectionId
        ? { sectionTitle: sections.find((section) => section.sectionId === chunk.sectionId)?.title || "" }
        : undefined,
      order: index,
      sectionId: chunk.sectionId,
      text: chunk.text,
      tokenEstimate: Math.ceil(chunk.text.length / 4),
    }));
};

const buildSummaryNormalizedDocument = (
  document: DocumentData,
  fileName: string,
  sourceFormat: IngestionSourceFormat,
  rawContent: string,
  importedAt: number,
): NormalizedIngestionDocument => {
  const base = createEmptyIngestionDocument({
    fileName,
    importedAt,
    ingestionId: document.id,
    rawContent,
    sourceFormat,
  });
  const sections = extractSummarySections(sourceFormat, rawContent);
  const plainText = stripSummaryText(sourceFormat, rawContent).slice(0, 20_000);
  const metadataTitle = document.metadata?.title || sections[0]?.title || stripFileExtension(fileName);

  return {
    ...base,
    chunks: buildSummaryChunks(fileName, plainText, sections),
    images: extractSummaryImages(sourceFormat, rawContent),
    metadata: {
      ...base.metadata,
      authors: document.metadata?.authors,
      labels: document.metadata?.labels,
      tags: document.metadata?.tags,
      title: metadataTitle,
    },
    plainText,
    sections,
  };
};

const buildSnippet = (text: string, matchedTerms: string[], maxLength = 180) => {
  const normalizedText = text.replace(/\s+/g, " ").trim();

  if (!normalizedText) {
    return "";
  }

  if (normalizedText.length <= maxLength) {
    return normalizedText;
  }

  const firstMatchIndex = matchedTerms
    .map((term) => normalizedText.toLowerCase().indexOf(term.toLowerCase()))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0];

  if (firstMatchIndex === undefined) {
    return `${normalizedText.slice(0, maxLength).trim()}...`;
  }

  const start = Math.max(0, firstMatchIndex - Math.floor(maxLength / 3));
  const end = Math.min(normalizedText.length, start + maxLength);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < normalizedText.length ? "..." : "";

  return `${prefix}${normalizedText.slice(start, end).trim()}${suffix}`;
};

const normalizeTerm = (value: string) => value.trim().toLowerCase();

const tokenize = (value: string) =>
  Array.from(new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9가-힣]+/i)
      .map((term) => term.trim())
      .filter((term) => term.length >= 2),
  ));

const intersectTerms = (left: string[], right: string[]) =>
  left.filter((term) => right.includes(term));

const jaccardSimilarity = (left: string[], right: string[]) => {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }

  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const intersection = left.filter((term) => rightSet.has(term)).length;
  const union = new Set([...leftSet, ...rightSet]).size;

  return union === 0 ? 0 : intersection / union;
};

const QUERY_TERM_EXPANSIONS: Record<string, string[]> = {
  auth: ["authentication"],
  authentication: ["auth"],
  cfg: ["config", "configuration"],
  config: ["configuration", "cfg"],
  configuration: ["config", "cfg"],
  credential: ["token", "secret"],
  credentials: ["token", "secret"],
  doc: ["document", "docs"],
  docs: ["document", "doc"],
  incident: ["outage", "runbook"],
  outage: ["incident", "runbook"],
  playbook: ["runbook"],
  runbook: ["playbook", "incident"],
  secret: ["credential", "token"],
  token: ["credential", "secret"],
};

const expandQueryTerms = (terms: string[]) => {
  const expanded = new Set(terms);

  for (const term of terms) {
    for (const synonym of QUERY_TERM_EXPANSIONS[term] || []) {
      expanded.add(synonym);
    }
  }

  return Array.from(expanded);
};

const countOccurrences = (haystack: string, needle: string) => haystack.split(needle).length - 1;

const createKnowledgeContentHash = (value: string) => {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
};

const buildRecordSignature = (fileName: string, sourceFormat: IngestionSourceFormat, rawContent: string) =>
  `${sourceFormat}\u0000${fileName}\u0000${rawContent}`;

const buildRecordStatus = (
  record: Pick<KnowledgeDocumentRecord, "contentHash" | "schemaVersion" | "sourceUpdatedAt">,
  liveRecord: Pick<KnowledgeDocumentRecord, "contentHash" | "sourceUpdatedAt"> | undefined,
) => {
  const staleReasons: KnowledgeStaleReason[] = [];

  if (record.schemaVersion < KNOWLEDGE_RECORD_SCHEMA_VERSION) {
    staleReasons.push("schema_version");
  }

  if (liveRecord && (record.sourceUpdatedAt < liveRecord.sourceUpdatedAt || record.contentHash !== liveRecord.contentHash)) {
    staleReasons.push("source_changed");
  }

  return {
    indexStatus: staleReasons.length > 0 ? "stale" : "fresh",
    staleReasons: staleReasons.length > 0 ? staleReasons : undefined,
  } satisfies Pick<KnowledgeDocumentRecord, "indexStatus" | "staleReasons">;
};

const ensureNormalizedDocument = (
  fileName: string,
  documentId: string,
  importedAt: number,
  rawContent: string,
  sourceFormat: IngestionSourceFormat,
  candidate: unknown,
) => {
  if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
    const normalizedDocument = candidate as Partial<NormalizedIngestionDocument>;

    if (
      typeof normalizedDocument.fileName === "string"
      && normalizedDocument.fileName.length > 0
      && Array.isArray(normalizedDocument.sections)
      && Array.isArray(normalizedDocument.chunks)
    ) {
      return {
        ...normalizedDocument,
        chunks: normalizedDocument.chunks,
        fileName: normalizedDocument.fileName,
        images: Array.isArray(normalizedDocument.images) ? normalizedDocument.images : [],
        importedAt: typeof normalizedDocument.importedAt === "number" ? normalizedDocument.importedAt : importedAt,
        ingestionId: typeof normalizedDocument.ingestionId === "string" ? normalizedDocument.ingestionId : documentId,
        metadata: normalizedDocument.metadata ?? {},
        plainText: typeof normalizedDocument.plainText === "string" ? normalizedDocument.plainText : "",
        sections: normalizedDocument.sections,
        sourceFormat: isIngestionSourceFormat(normalizedDocument.sourceFormat) ? normalizedDocument.sourceFormat : sourceFormat,
      } satisfies NormalizedIngestionDocument;
    }
  }

  return normalizeIngestionRequest({
    fileName,
    importedAt,
    ingestionId: documentId,
    rawContent,
    sourceFormat,
  });
};

export const coerceKnowledgeRecord = (candidate: unknown): KnowledgeDocumentRecord | null => {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return null;
  }

  const rawRecord = candidate as Partial<KnowledgeDocumentRecord>;

  if (
    typeof rawRecord.documentId !== "string"
    || typeof rawRecord.fileName !== "string"
    || typeof rawRecord.rawContent !== "string"
    || !rawRecord.sourceFile
    || !isIngestionSourceFormat(rawRecord.sourceFormat)
  ) {
    return null;
  }

  const updatedAt = typeof rawRecord.updatedAt === "number" ? rawRecord.updatedAt : Date.now();
  const sourceUpdatedAt = typeof rawRecord.sourceUpdatedAt === "number" ? rawRecord.sourceUpdatedAt : updatedAt;
  const indexedAt = typeof rawRecord.indexedAt === "number" ? rawRecord.indexedAt : updatedAt;
  const schemaVersion = typeof rawRecord.schemaVersion === "number" ? rawRecord.schemaVersion : 1;
  const contentHash = typeof rawRecord.contentHash === "string"
    ? rawRecord.contentHash
    : createKnowledgeContentHash(buildRecordSignature(rawRecord.fileName, rawRecord.sourceFormat, rawRecord.rawContent));
  const normalizedDocument = ensureNormalizedDocument(
    rawRecord.fileName,
    rawRecord.documentId,
    rawRecord.sourceFile.importedAt || updatedAt,
    rawRecord.rawContent,
    rawRecord.sourceFormat,
    rawRecord.normalizedDocument,
  );
  const status = buildRecordStatus({
    contentHash,
    schemaVersion,
    sourceUpdatedAt,
  }, undefined);

  return {
    contentHash,
    documentId: rawRecord.documentId,
    fileName: rawRecord.fileName,
    indexStatus: status.indexStatus,
    indexedAt,
    normalizedDocument,
    rawContent: rawRecord.rawContent,
    schemaVersion,
    sourceFile: rawRecord.sourceFile,
    sourceFormat: rawRecord.sourceFormat,
    sourceUpdatedAt,
    staleReasons: status.staleReasons,
    updatedAt,
  };
};

export const buildKnowledgeRecordFromDocument = (
  document: DocumentData,
  options?: { indexedAt?: number; stage?: "summary" | "full" },
): KnowledgeDocumentRecord | null => {
  const fileName = resolveFileName(document);
  const sourceFile = resolveSourceFile(document, fileName);
  const sourceFormat = resolveSourceFormat(document, sourceFile);
  const rawContent = resolveRawContent(document, sourceFormat);

  if (!rawContent.trim()) {
    return null;
  }

  const indexedAt = options?.indexedAt ?? Date.now();
  const sourceUpdatedAt = document.updatedAt;
  const contentHash = createKnowledgeContentHash(buildRecordSignature(fileName, sourceFormat, rawContent));
  const normalizedDocument = options?.stage === "summary"
    ? buildSummaryNormalizedDocument(document, fileName, sourceFormat, rawContent, sourceFile.importedAt || document.updatedAt)
    : normalizeIngestionRequest({
      fileName,
      importedAt: sourceFile.importedAt || document.updatedAt,
      ingestionId: document.id,
      rawContent,
      sourceFormat,
    });

  return {
    contentHash,
    documentId: document.id,
    fileName,
    indexStatus: "fresh",
    indexedAt,
    normalizedDocument,
    rawContent,
    schemaVersion: KNOWLEDGE_RECORD_SCHEMA_VERSION,
    sourceFile,
    sourceFormat,
    sourceUpdatedAt,
    updatedAt: sourceUpdatedAt,
  };
};

export const buildKnowledgeDocumentFingerprint = (document: DocumentData) => {
  const fileName = resolveFileName(document);
  const sourceFile = resolveSourceFile(document, fileName);
  const sourceFormat = resolveSourceFormat(document, sourceFile);
  const rawContent = resolveRawContent(document, sourceFormat);

  return `${document.id}:${document.updatedAt}:${document.mode}:${fileName}:${rawContent.length}`;
};

export const reconcileKnowledgeRecord = (
  record: KnowledgeDocumentRecord,
  liveRecord: KnowledgeDocumentRecord | undefined,
) => {
  const status = buildRecordStatus(record, liveRecord);

  return {
    ...record,
    indexStatus: status.indexStatus,
    staleReasons: status.staleReasons,
  } satisfies KnowledgeDocumentRecord;
};

export const reconcileKnowledgeRecords = (
  records: KnowledgeDocumentRecord[],
  liveRecords: KnowledgeDocumentRecord[],
) => {
  const liveRecordById = new Map(liveRecords.map((record) => [record.documentId, record]));

  return records
    .map((record) => reconcileKnowledgeRecord(record, liveRecordById.get(record.documentId)))
    .sort((left, right) =>
      Number(left.indexStatus === "stale") - Number(right.indexStatus === "stale")
      || right.updatedAt - left.updatedAt
      || left.fileName.localeCompare(right.fileName));
};

export const mergeKnowledgeRecords = (
  currentRecords: KnowledgeDocumentRecord[],
  nextRecords: KnowledgeDocumentRecord[],
) => {
  const merged = new Map(currentRecords.map((record) => [record.documentId, record]));

  for (const candidate of nextRecords) {
    const record = coerceKnowledgeRecord(candidate);

    if (!record) {
      continue;
    }

    const existing = merged.get(record.documentId);
    const existingCursor = existing ? Math.max(existing.sourceUpdatedAt, existing.indexedAt) : -1;
    const nextCursor = Math.max(record.sourceUpdatedAt, record.indexedAt);

    if (!existing || existingCursor <= nextCursor) {
      merged.set(record.documentId, record);
    }
  }

  return Array.from(merged.values()).sort((left, right) =>
    Number(left.indexStatus === "stale") - Number(right.indexStatus === "stale")
    || right.updatedAt - left.updatedAt
    || left.fileName.localeCompare(right.fileName));
};

const getRecencyBoost = (record: KnowledgeDocumentRecord) => {
  const age = Date.now() - record.sourceUpdatedAt;

  if (age <= 86_400_000) {
    return 8;
  }

  if (age <= 7 * 86_400_000) {
    return 5;
  }

  if (age <= 30 * 86_400_000) {
    return 2;
  }

  return 0;
};

const getRecordScoreAdjustment = (record: KnowledgeDocumentRecord) =>
  getRecencyBoost(record) - (record.indexStatus === "stale" ? 18 : 0);

type SemanticRerankCandidateKind = "body" | "image" | "section" | "title";

const getSemanticRerank = (
  normalizedQuery: string,
  originalQueryTerms: string[],
  expandedQueryTerms: string[],
  candidates: Array<{ kind: SemanticRerankCandidateKind; text: string }>,
) => {
  let boost = 0;
  const signals: string[] = [];

  for (const candidate of candidates) {
    if (!candidate.text) {
      continue;
    }

      const normalizedCandidate = normalizeTerm(candidate.text);
      const candidateTerms = tokenize(normalizedCandidate);
      const overlappingOriginalTerms = intersectTerms(originalQueryTerms, candidateTerms);
      const overlappingExpandedTerms = intersectTerms(expandedQueryTerms, candidateTerms);
      const primaryWeight = candidate.kind === "section"
        ? 1.4
        : candidate.kind === "title"
          ? 1.25
          : candidate.kind === "image"
          ? 1.1
          : 0.75;

      if (normalizedCandidate.includes(normalizedQuery)) {
        boost += Math.round(16 * primaryWeight);
        signals.push(candidate.kind === "body" ? "body phrase" : "exact phrase");
      }

      if (originalQueryTerms.length > 1 && overlappingOriginalTerms.length === originalQueryTerms.length) {
        boost += Math.round(12 * primaryWeight);
        signals.push(candidate.kind === "section" || candidate.kind === "title"
          ? "all query terms"
          : "term coverage");
      }

      if (
        expandedQueryTerms.length > originalQueryTerms.length
        && overlappingExpandedTerms.length > overlappingOriginalTerms.length
        && overlappingExpandedTerms.length >= Math.min(2, expandedQueryTerms.length)
      ) {
        boost += Math.round(8 * primaryWeight);
        signals.push("synonym match");
      }

      const similarity = jaccardSimilarity(expandedQueryTerms, candidateTerms);

    if (similarity >= 0.6) {
      boost += Math.round(10 * primaryWeight);
      signals.push(candidate.kind === "body" ? "related terms" : "strong title match");
    } else if (similarity >= 0.35) {
      boost += Math.round(6 * primaryWeight);
      signals.push("related terms");
    }
  }

  return {
    boost,
    label: signals.length > 0 ? Array.from(new Set(signals)).slice(0, 2).join(", ") : undefined,
  };
};

const buildImageSearchResults = (
  record: KnowledgeDocumentRecord,
  normalizedQuery: string,
  originalTerms: string[],
  expandedTerms: string[],
  searchMode: KnowledgeSearchMode,
): KnowledgeSearchResult[] =>
  record.normalizedDocument.images.flatMap((image) => {
    const haystack = [
      image.src,
      image.alt,
      image.title,
      image.caption,
      image.surroundingText,
      image.metadata?.sectionTitle,
      record.fileName,
      record.normalizedDocument.metadata.title,
    ]
      .filter(Boolean)
      .join("\n")
      .toLowerCase();
    const activeTerms = searchMode === "semantic" ? expandedTerms : originalTerms;
    const matchedTerms = activeTerms.filter((term) => haystack.includes(term));

    if (matchedTerms.length === 0) {
      return [];
    }

    let score = matchedTerms.length * 12;

    if (haystack.includes(normalizedQuery)) {
      score += 18;
    }

    for (const term of matchedTerms) {
      score += countOccurrences(haystack, term) * 2;
    }

    if (image.alt && matchedTerms.some((term) => image.alt?.toLowerCase().includes(term))) {
      score += 12;
    }

    if (image.caption && matchedTerms.some((term) => image.caption?.toLowerCase().includes(term))) {
      score += 8;
    }

    const semanticRerank = searchMode === "semantic"
      ? getSemanticRerank(normalizedQuery, originalTerms, expandedTerms, [
        { kind: "image", text: image.alt || "" },
        { kind: "image", text: image.caption || "" },
        { kind: "image", text: image.title || "" },
        { kind: "section", text: image.metadata?.sectionTitle || "" },
        { kind: "title", text: record.normalizedDocument.metadata.title || "" },
      ])
      : { boost: 0, label: undefined };
    score += semanticRerank.boost;
    score += getRecordScoreAdjustment(record);

    return [{
      image,
      kind: "image",
      matchedTerms,
      record,
      rerankLabel: semanticRerank.label,
      score,
      snippet: buildSnippet(
        [
          image.caption,
          image.surroundingText,
          image.alt,
          image.title,
          image.src,
        ]
          .filter(Boolean)
          .join(" "),
        matchedTerms,
      ),
    } satisfies KnowledgeSearchResult];
  });

export const searchKnowledgeRecords = (
  records: KnowledgeDocumentRecord[],
  query: string,
  limit = 8,
  options?: { mode?: KnowledgeSearchMode },
): KnowledgeSearchResult[] => {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const normalizedQuery = normalizeTerm(trimmedQuery);
  const terms = tokenize(normalizedQuery);
  const expandedTerms = expandQueryTerms(terms);
  const searchMode = options?.mode ?? "semantic";
  const retrievalTerms = searchMode === "semantic" ? expandedTerms : terms;

  if (terms.length === 0) {
    return [];
  }

  const recordById = new Map(records.map((record) => [record.documentId, record]));
  const retrieval = keywordRetrieve(records.map((record) => record.normalizedDocument), {
    limit: limit * 3,
    query: searchMode === "semantic"
      ? [trimmedQuery, ...expandedTerms.filter((term) => !terms.includes(term))].join(" ")
      : trimmedQuery,
  });
  const chunkResults = retrieval.matches.flatMap((match) => {
    const record = recordById.get(match.documentId);

    if (!record) {
      return [];
    }

    const semanticRerank = searchMode === "semantic"
      ? getSemanticRerank(normalizedQuery, terms, expandedTerms, [
        { kind: "section", text: match.chunk.metadata?.sectionTitle || "" },
        { kind: "title", text: record.normalizedDocument.metadata.title || "" },
        { kind: "body", text: match.chunk.text.slice(0, 220) },
      ])
      : { boost: 0, label: undefined };
    const score = match.score + semanticRerank.boost + getRecordScoreAdjustment(record);

    return [{
      kind: "chunk",
      match: {
        ...match,
        score,
      },
      matchedTerms: match.matchedTerms,
      record,
      rerankLabel: semanticRerank.label,
      score,
      snippet: buildSnippet(match.chunk.text, match.matchedTerms),
    } satisfies KnowledgeSearchResult];
  });
  const imageResults = records.flatMap((record) =>
    buildImageSearchResults(record, normalizedQuery, terms, retrievalTerms, searchMode));

  return [...chunkResults, ...imageResults]
    .sort((left, right) =>
      right.score - left.score
      || Number(left.record.indexStatus === "stale") - Number(right.record.indexStatus === "stale")
      || left.record.fileName.localeCompare(right.record.fileName))
    .slice(0, limit);
};

export const buildKnowledgeRecentRecords = (records: KnowledgeDocumentRecord[], limit = 6) =>
  [...records]
    .sort((left, right) =>
      Number(left.indexStatus === "stale") - Number(right.indexStatus === "stale")
      || right.updatedAt - left.updatedAt
      || left.fileName.localeCompare(right.fileName))
    .slice(0, limit);

export const summarizeKnowledgeRecords = (records: KnowledgeDocumentRecord[]): KnowledgeIndexSummary => ({
  documentCount: records.length,
  freshCount: records.filter((record) => record.indexStatus === "fresh").length,
  imageCount: records.reduce((count, record) => count + record.normalizedDocument.images.length, 0),
  lastIndexedAt: records.reduce<number | null>((latest, record) =>
    latest === null || record.indexedAt > latest ? record.indexedAt : latest, null),
  staleCount: records.filter((record) => record.indexStatus === "stale").length,
});

export const buildDocumentOptionsFromKnowledgeRecord = (
  record: KnowledgeDocumentRecord,
): CreateDocumentOptions => {
  const mode = toEditorMode(record.sourceFormat);
  const title = record.normalizedDocument.metadata.title || stripFileExtension(record.fileName);
  const content = record.sourceFormat === "asciidoc"
    ? asciidocToHtml(record.rawContent)
    : record.sourceFormat === "rst"
      ? rstToHtml(record.rawContent)
      : record.rawContent;
  const sourceSnapshots = record.sourceFormat === "asciidoc"
    ? { asciidoc: record.rawContent, html: content }
    : record.sourceFormat === "rst"
      ? { html: content, rst: record.rawContent }
      : { [mode]: content };

  return {
    content,
    createdAt: record.normalizedDocument.importedAt,
    id: record.documentId,
    metadata: {
      authors: record.normalizedDocument.metadata.authors,
      labels: record.normalizedDocument.metadata.labels,
      sourceFiles: [record.sourceFile],
      tags: record.normalizedDocument.metadata.tags,
      title,
    },
    mode,
    name: title,
    sourceSnapshots,
    storageKind: "docsy",
    updatedAt: record.updatedAt,
  };
};

export const getKnowledgeRecordLabel = (record: KnowledgeDocumentRecord) =>
  record.normalizedDocument.metadata.title || stripFileExtension(record.fileName);
