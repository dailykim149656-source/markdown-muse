import { normalizeIngestionRequest } from "../../../src/lib/ingestion/normalizeIngestionRequest";
import { keywordRetrieve } from "../../../src/lib/retrieval/keywordRetrieval";
import type {
  AgentDriveCandidate,
  AgentSelectedDriveReference,
} from "../../../src/types/liveAgent";
import { ensureGoogleAccessToken } from "../auth/googleOAuth";
import { assertWorkspaceSession } from "../auth/routes";
import { HttpError } from "../http/http";
import { exportGoogleDocAsHtml, getGoogleDriveFileMetadata, listGoogleDocsFiles } from "./googleDriveClient";
import { getWorkspaceRepository } from "./repository";

const MAX_QUERY_LENGTH = 120;
const SHORTLIST_PAGE_SIZE = 12;
const SHORTLIST_FALLBACK_COUNT = 6;
const MAX_DOCUMENTS_TO_READ = 6;
const MAX_CANDIDATES = 5;
const MAX_EXCERPTS_PER_DOCUMENT = 2;

const DRIVE_INTENT_PATTERN = /\b(google|drive|docs|import|load|find|search|open)\b|(?:구글|드라이브|문서|불러|가져와|찾아|열어)/i;

interface LoadedDriveDocument {
  excerpt: string;
  fileId: string;
  fileName: string;
  modifiedTime?: string;
  normalized: ReturnType<typeof normalizeIngestionRequest>;
  webViewLink?: string;
}

const trimExcerpt = (value: string, maxLength = 220) => {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3)}...`;
};

const normalizeSearchQuery = (query: string) => query.trim().slice(0, MAX_QUERY_LENGTH);

const mergeUniqueFiles = <TFile extends { fileId: string }>(files: TFile[]) => {
  const seen = new Set<string>();

  return files.filter((file) => {
    if (seen.has(file.fileId)) {
      return false;
    }

    seen.add(file.fileId);
    return true;
  });
};

const getAuthorizedConnection = async (request: import("node:http").IncomingMessage) => {
  const repository = getWorkspaceRepository();
  const sessionState = await assertWorkspaceSession(request);
  const refreshed = await ensureGoogleAccessToken(sessionState.connection.tokens);

  if (refreshed.didRefresh) {
    await repository.upsertConnection({
      ...sessionState.connection,
      tokens: refreshed.tokens,
      updatedAt: Date.now(),
    });
  }

  return {
    accessToken: refreshed.tokens.accessToken,
    connectionId: sessionState.connection.connectionId,
  };
};

const loadDriveDocument = async (accessToken: string, fileId: string): Promise<LoadedDriveDocument> => {
  const [file, exportedHtml] = await Promise.all([
    getGoogleDriveFileMetadata(accessToken, fileId),
    exportGoogleDocAsHtml(accessToken, fileId),
  ]);

  const normalized = normalizeIngestionRequest({
    fileName: file.name.endsWith(".html") ? file.name : `${file.name}.html`,
    importedAt: Date.now(),
    ingestionId: file.fileId,
    rawContent: exportedHtml,
    sourceFormat: "html",
  });
  const excerptSource = normalized.chunks[0]?.text || normalized.plainText;

  return {
    excerpt: trimExcerpt(excerptSource || file.name),
    fileId: file.fileId,
    fileName: file.name,
    modifiedTime: file.modifiedTime,
    normalized,
    webViewLink: file.webViewLink,
  };
};

const createFallbackCandidates = (loadedDocuments: LoadedDriveDocument[]): AgentDriveCandidate[] =>
  loadedDocuments.slice(0, MAX_CANDIDATES).map((document) => ({
    excerpt: document.excerpt,
    fileId: document.fileId,
    fileName: document.fileName,
    modifiedTime: document.modifiedTime,
    relevanceReason: "Matched Google Drive title search and recent document shortlist.",
    webViewLink: document.webViewLink,
  }));

export const loadDriveReferenceDocuments = async (
  request: import("node:http").IncomingMessage,
  fileIds: string[],
) => {
  if (fileIds.length === 0) {
    return [];
  }

  const { accessToken } = await getAuthorizedConnection(request);
  const uniqueFileIds = Array.from(new Set(fileIds)).slice(0, 3);
  const loadedDocuments = await Promise.all(uniqueFileIds.map((fileId) => loadDriveDocument(accessToken, fileId)));

  return loadedDocuments.map((document) => ({
    excerpt: document.excerpt,
    fileId: document.fileId,
    fileName: document.fileName,
    normalized: document.normalized,
  }));
};

export const shouldSearchDriveDocuments = ({
  driveReferenceFileIds,
  latestUserMessage,
}: {
  driveReferenceFileIds: string[];
  latestUserMessage: string;
}) => driveReferenceFileIds.length > 0 || DRIVE_INTENT_PATTERN.test(latestUserMessage);

export const searchDriveDocuments = async ({
  latestUserMessage,
  request,
}: {
  latestUserMessage: string;
  request: import("node:http").IncomingMessage;
}) => {
  const normalizedQuery = normalizeSearchQuery(latestUserMessage);

  if (!normalizedQuery) {
    return [];
  }

  const { accessToken } = await getAuthorizedConnection(request);
  const [titleResults, fallbackResults] = await Promise.all([
    listGoogleDocsFiles(accessToken, {
      pageSize: SHORTLIST_PAGE_SIZE,
      query: normalizedQuery,
    }),
    listGoogleDocsFiles(accessToken, {
      pageSize: SHORTLIST_FALLBACK_COUNT,
    }),
  ]);
  const shortlistedFiles = mergeUniqueFiles([
    ...titleResults.files,
    ...(titleResults.files.length < SHORTLIST_FALLBACK_COUNT ? fallbackResults.files : []),
  ]).slice(0, MAX_DOCUMENTS_TO_READ);

  if (shortlistedFiles.length === 0) {
    return [];
  }

  const loadedDocuments = await Promise.all(shortlistedFiles.map((file) => loadDriveDocument(accessToken, file.fileId)));
  const retrieval = keywordRetrieve(
    loadedDocuments.map((document) => document.normalized),
    {
      limit: 12,
      query: normalizedQuery,
    },
  );

  if (retrieval.matches.length === 0) {
    return createFallbackCandidates(loadedDocuments);
  }

  const groupedByDocumentId = new Map<
    string,
    {
      bestScore: number;
      excerpts: string[];
      matchedTerms: string[];
    }
  >();

  for (const match of retrieval.matches) {
    const current = groupedByDocumentId.get(match.documentId) || {
      bestScore: 0,
      excerpts: [],
      matchedTerms: [],
    };

    current.bestScore = Math.max(current.bestScore, match.score);
    current.matchedTerms = Array.from(new Set([...current.matchedTerms, ...match.matchedTerms]));

    if (current.excerpts.length < MAX_EXCERPTS_PER_DOCUMENT) {
      current.excerpts.push(trimExcerpt(match.chunk.text));
    }

    groupedByDocumentId.set(match.documentId, current);
  }

  return loadedDocuments
    .filter((document) => groupedByDocumentId.has(document.fileId))
    .map((document) => {
      const grouped = groupedByDocumentId.get(document.fileId);

      if (!grouped) {
        throw new HttpError(500, "Drive search grouping failed unexpectedly.");
      }

      return {
        bestScore: grouped.bestScore,
        candidate: {
          excerpt: grouped.excerpts[0] || document.excerpt,
          fileId: document.fileId,
          fileName: document.fileName,
          modifiedTime: document.modifiedTime,
          relevanceReason: grouped.matchedTerms.length > 0
            ? `Matched terms: ${grouped.matchedTerms.join(", ")}.`
            : "Matched document content.",
          webViewLink: document.webViewLink,
        } satisfies AgentDriveCandidate,
      };
    })
    .sort((left, right) =>
      right.bestScore - left.bestScore
      || (right.candidate.modifiedTime || "").localeCompare(left.candidate.modifiedTime || ""),
    )
    .slice(0, MAX_CANDIDATES)
    .map((entry) => entry.candidate);
};
