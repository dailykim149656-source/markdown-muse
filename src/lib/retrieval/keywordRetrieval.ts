import type { IngestionChunk, NormalizedIngestionDocument } from "@/lib/ingestion/contracts";

export interface KeywordRetrievalFilters {
  authors?: string[];
  documentTypes?: string[];
  ingestionIds?: string[];
  sourceFormats?: string[];
  tags?: string[];
}

export interface KeywordRetrievalQuery {
  filters?: KeywordRetrievalFilters;
  limit?: number;
  query: string;
}

export interface KeywordRetrievalMatch {
  chunk: IngestionChunk;
  documentId: string;
  fileName: string;
  matchedTerms: string[];
  score: number;
  sourceFormat: NormalizedIngestionDocument["sourceFormat"];
}

export interface KeywordRetrievalResult {
  matches: KeywordRetrievalMatch[];
  normalizedQuery: string;
  terms: string[];
  totalMatches: number;
}

const normalizeTerm = (value: string) => value.trim().toLowerCase();

const tokenize = (value: string) =>
  Array.from(new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9가-힣]+/i)
      .map((term) => term.trim())
      .filter((term) => term.length >= 2),
  ));

const includesAny = (candidates: string[] | undefined, filters: string[] | undefined) => {
  if (!filters?.length) {
    return true;
  }

  if (!candidates?.length) {
    return false;
  }

  const normalizedCandidates = candidates.map(normalizeTerm);
  return filters.some((filter) => normalizedCandidates.includes(normalizeTerm(filter)));
};

const matchesFilters = (document: NormalizedIngestionDocument, filters: KeywordRetrievalFilters | undefined) => {
  if (!filters) {
    return true;
  }

  if (filters.ingestionIds?.length && !filters.ingestionIds.includes(document.ingestionId)) {
    return false;
  }

  if (filters.sourceFormats?.length && !filters.sourceFormats.includes(document.sourceFormat)) {
    return false;
  }

  if (!includesAny(document.metadata.tags, filters.tags)) {
    return false;
  }

  if (!includesAny(document.metadata.authors, filters.authors)) {
    return false;
  }

  if (
    filters.documentTypes?.length
    && (!document.metadata.documentType || !filters.documentTypes.includes(document.metadata.documentType))
  ) {
    return false;
  }

  return true;
};

const scoreChunk = (
  document: NormalizedIngestionDocument,
  chunk: IngestionChunk,
  normalizedQuery: string,
  terms: string[],
) => {
  const haystack = `${chunk.text}\n${Object.values(chunk.metadata || {}).join(" ")}\n${document.fileName}\n${document.metadata.title || ""}`.toLowerCase();
  const matchedTerms = terms.filter((term) => haystack.includes(term));

  if (matchedTerms.length === 0) {
    return null;
  }

  let score = matchedTerms.length * 10;

  if (haystack.includes(normalizedQuery)) {
    score += 25;
  }

  for (const term of matchedTerms) {
    const occurrences = haystack.split(term).length - 1;
    score += occurrences * 3;
  }

  const sectionTitle = chunk.metadata?.sectionTitle?.toLowerCase();

  if (sectionTitle && matchedTerms.some((term) => sectionTitle.includes(term))) {
    score += 12;
  }

  const documentTitle = document.metadata.title?.toLowerCase();

  if (documentTitle && matchedTerms.some((term) => documentTitle.includes(term))) {
    score += 8;
  }

  return {
    chunk,
    documentId: document.ingestionId,
    fileName: document.fileName,
    matchedTerms,
    score,
    sourceFormat: document.sourceFormat,
  } satisfies KeywordRetrievalMatch;
};

export const keywordRetrieve = (
  documents: NormalizedIngestionDocument[],
  query: KeywordRetrievalQuery,
): KeywordRetrievalResult => {
  const normalizedQuery = normalizeTerm(query.query);
  const terms = tokenize(normalizedQuery);

  if (terms.length === 0) {
    return {
      matches: [],
      normalizedQuery,
      terms: [],
      totalMatches: 0,
    };
  }

  const matches = documents
    .filter((document) => matchesFilters(document, query.filters))
    .flatMap((document) =>
      document.chunks
        .map((chunk) => scoreChunk(document, chunk, normalizedQuery, terms))
        .filter((match): match is KeywordRetrievalMatch => match !== null),
    )
    .sort((left, right) =>
      right.score - left.score
      || left.documentId.localeCompare(right.documentId)
      || left.chunk.chunkId.localeCompare(right.chunk.chunkId),
    );

  const limit = query.limit ?? 10;

  return {
    matches: matches.slice(0, limit),
    normalizedQuery,
    terms,
    totalMatches: matches.length,
  };
};
