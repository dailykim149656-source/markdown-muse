import type { IncomingMessage } from "node:http";
import { assertWorkspaceSession } from "../auth/routes";
import { ensureGoogleAccessToken } from "../auth/googleOAuth";
import { HttpError, getRequestUrl, json, parseOptionalRequestBody, type HttpResponse } from "../http/http";
import { getWorkspaceRepository } from "./repository";
import {
  exportGoogleDocAsHtml,
  getGoogleDriveStartPageToken,
  getGoogleDriveFileMetadata,
  listGoogleDocsFiles,
  listGoogleDriveChanges,
} from "./googleDriveClient";
import { batchUpdateGoogleDocument, getGoogleDocument } from "./googleDocsClient";
import {
  buildGoogleDocsBatchUpdateFromMarkdown,
  buildImportedGoogleDocument,
  getRevisionIdFromGoogleDocument,
} from "./googleDocsMapper";

interface WorkspaceFilesQuery {
  cursor?: string | null;
  pageSize?: string | null;
  q?: string | null;
}

interface WorkspaceImportRequest {
  fileId?: string;
}

interface WorkspaceApplyRequest {
  baseRevisionId?: string;
  documentId?: string;
  fileId?: string;
  markdown?: string;
}

interface WorkspaceRemoteChangePayload {
  changeType: "changed";
  detectedAt: number;
  documentId: string;
  fileId: string;
  modifiedTime?: string;
  name: string;
  revisionId?: string;
}

const buildRemoteChangePayload = ({
  detectedAt,
  documentId,
  fileId,
  modifiedTime,
  name,
  revisionId,
}: Omit<WorkspaceRemoteChangePayload, "changeType">): WorkspaceRemoteChangePayload => ({
  changeType: "changed",
  detectedAt,
  documentId,
  fileId,
  modifiedTime,
  name,
  revisionId,
});

const getAuthorizedConnection = async (request: IncomingMessage) => {
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
    connection: {
      ...sessionState.connection,
      tokens: refreshed.tokens,
    },
  };
};

const performFullWorkspaceRescan = async ({
  accessToken,
  importedDocuments,
  repository,
  rescannedAt,
}: {
  accessToken: string;
  importedDocuments: Awaited<ReturnType<ReturnType<typeof getWorkspaceRepository>["listImportedDocuments"]>>;
  repository: ReturnType<typeof getWorkspaceRepository>;
  rescannedAt: number;
}) => {
  const changedRecords = await Promise.all(importedDocuments.map(async (importedDocument) => {
    const [file, currentDocument] = await Promise.all([
      getGoogleDriveFileMetadata(accessToken, importedDocument.fileId),
      getGoogleDocument(accessToken, importedDocument.fileId).catch(() => null),
    ]);
    const currentRevisionId = getRevisionIdFromGoogleDocument(currentDocument) || file.revisionId;
    const isChanged = (
      Boolean(currentRevisionId && importedDocument.revisionId && currentRevisionId !== importedDocument.revisionId)
      || Boolean(file.modifiedTime && importedDocument.driveModifiedTime && file.modifiedTime !== importedDocument.driveModifiedTime)
    );

    await repository.upsertImportedDocument({
      ...importedDocument,
      lastRescannedAt: rescannedAt,
      latestRemoteModifiedTime: isChanged ? file.modifiedTime : undefined,
      latestRemoteRevisionId: isChanged ? currentRevisionId : undefined,
      remoteChangeDetectedAt: isChanged ? rescannedAt : undefined,
    });

    if (!isChanged) {
      return null;
    }

    return buildRemoteChangePayload({
      detectedAt: rescannedAt,
      documentId: importedDocument.documentId,
      fileId: importedDocument.fileId,
      modifiedTime: file.modifiedTime,
      name: importedDocument.fileName,
      revisionId: currentRevisionId,
    });
  }));

  return changedRecords.filter((record): record is NonNullable<typeof record> => Boolean(record));
};

const performIncrementalWorkspaceRescan = async ({
  accessToken,
  importedDocuments,
  repository,
  rescannedAt,
  startPageToken,
}: {
  accessToken: string;
  importedDocuments: Awaited<ReturnType<ReturnType<typeof getWorkspaceRepository>["listImportedDocuments"]>>;
  repository: ReturnType<typeof getWorkspaceRepository>;
  rescannedAt: number;
  startPageToken: string;
}) => {
  const importedByFileId = new Map(importedDocuments.map((document) => [document.fileId, document]));
  let pageToken: string | null = startPageToken;
  let newStartPageToken: string | null = null;
  const changedFileIds = new Set<string>();

  while (pageToken) {
    const response = await listGoogleDriveChanges(accessToken, pageToken);

    for (const change of response.changes) {
      if (change.fileId && importedByFileId.has(change.fileId)) {
        changedFileIds.add(change.fileId);
      }
    }

    if (response.nextPageToken) {
      pageToken = response.nextPageToken;
      continue;
    }

    newStartPageToken = response.newStartPageToken || pageToken;
    pageToken = null;
  }

  const changedRecords = await Promise.all(Array.from(changedFileIds).map(async (fileId) => {
    const importedDocument = importedByFileId.get(fileId);

    if (!importedDocument) {
      return null;
    }

    const [file, currentDocument] = await Promise.all([
      getGoogleDriveFileMetadata(accessToken, importedDocument.fileId),
      getGoogleDocument(accessToken, importedDocument.fileId).catch(() => null),
    ]);
    const currentRevisionId = getRevisionIdFromGoogleDocument(currentDocument) || file.revisionId;

    await repository.upsertImportedDocument({
      ...importedDocument,
      lastRescannedAt: rescannedAt,
      latestRemoteModifiedTime: file.modifiedTime,
      latestRemoteRevisionId: currentRevisionId,
      remoteChangeDetectedAt: rescannedAt,
    });

    return buildRemoteChangePayload({
      detectedAt: rescannedAt,
      documentId: importedDocument.documentId,
      fileId: importedDocument.fileId,
      modifiedTime: file.modifiedTime,
      name: importedDocument.fileName,
      revisionId: currentRevisionId,
    });
  }));

  return {
    changes: changedRecords.filter((record): record is NonNullable<typeof record> => Boolean(record)),
    newStartPageToken,
  };
};

export const handleWorkspaceRoute = async (request: IncomingMessage): Promise<HttpResponse | null> => {
  const requestUrl = getRequestUrl(request);
  const requestOrigin = request.headers.origin;
  const repository = getWorkspaceRepository();

  if (request.method === "GET" && requestUrl.pathname === "/api/workspace/changes") {
    const { connection } = await getAuthorizedConnection(request);
    const importedDocuments = await repository.listImportedDocuments(connection.connectionId);
    const changes: WorkspaceRemoteChangePayload[] = importedDocuments
      .filter((document) => Boolean(document.remoteChangeDetectedAt))
      .map((document) => ({
        changeType: "changed",
        detectedAt: document.remoteChangeDetectedAt || document.updatedAt,
        documentId: document.documentId,
        fileId: document.fileId,
        modifiedTime: document.latestRemoteModifiedTime || document.driveModifiedTime,
        name: document.fileName,
        revisionId: document.latestRemoteRevisionId || document.revisionId,
      } satisfies WorkspaceRemoteChangePayload))
      .sort((left, right) => right.detectedAt - left.detectedAt || left.name.localeCompare(right.name));
    const lastRescannedAt = importedDocuments.reduce<number | null>(
      (latest, document) =>
        document.lastRescannedAt && (!latest || document.lastRescannedAt > latest)
          ? document.lastRescannedAt
          : latest,
      null,
    );

    return json({
      changes,
      lastRescannedAt,
    }, 200, requestOrigin);
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/workspace/files") {
    const { accessToken } = await getAuthorizedConnection(request);
    const query = Object.fromEntries(requestUrl.searchParams.entries()) as WorkspaceFilesQuery;
    const pageSize = query.pageSize ? Number.parseInt(query.pageSize, 10) : undefined;
    const result = await listGoogleDocsFiles(accessToken, {
      pageSize: Number.isFinite(pageSize) ? pageSize : undefined,
      pageToken: query.cursor || undefined,
      query: query.q || undefined,
    });

    return json(result, 200, requestOrigin);
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/workspace/import") {
    const { accessToken, connection } = await getAuthorizedConnection(request);
    const body = await parseOptionalRequestBody<WorkspaceImportRequest>(request);
    const fileId = body?.fileId?.trim();

    if (!fileId) {
      throw new HttpError(400, "fileId is required.");
    }

    const [file, exportedHtml, docsJson] = await Promise.all([
      getGoogleDriveFileMetadata(accessToken, fileId),
      exportGoogleDocAsHtml(accessToken, fileId),
      getGoogleDocument(accessToken, fileId).catch(() => null),
    ]);
    const docsRevisionId = getRevisionIdFromGoogleDocument(docsJson);
    const importedAt = Date.now();
    const document = buildImportedGoogleDocument({
      docsRevisionId,
      exportedHtml,
      file,
      importedAt,
    });

    await repository.upsertImportedDocument({
      connectionId: connection.connectionId,
      content: document.content || "",
      createdAt: importedAt,
      docsJson: docsJson || undefined,
      documentId: document.id || fileId,
      driveModifiedTime: file.modifiedTime,
      fileId: file.fileId,
      fileName: file.name,
      latestRemoteModifiedTime: undefined,
      latestRemoteRevisionId: undefined,
      lastRescannedAt: undefined,
      mimeType: file.mimeType,
      remoteChangeDetectedAt: undefined,
      revisionId: docsRevisionId || file.revisionId,
      updatedAt: importedAt,
    });

    return json({ document }, 200, requestOrigin);
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/workspace/rescan") {
    const { accessToken, connection } = await getAuthorizedConnection(request);
    const importedDocuments = await repository.listImportedDocuments(connection.connectionId);
    const rescannedAt = Date.now();
    let changes: WorkspaceRemoteChangePayload[] = [];
    let nextChangePageToken = connection.changePageToken || null;

    if (!nextChangePageToken) {
      changes = await performFullWorkspaceRescan({
        accessToken,
        importedDocuments,
        repository,
        rescannedAt,
      });
      nextChangePageToken = await getGoogleDriveStartPageToken(accessToken);
    } else {
      const incrementalResult = await performIncrementalWorkspaceRescan({
        accessToken,
        importedDocuments,
        repository,
        rescannedAt,
        startPageToken: nextChangePageToken,
      });
      changes = incrementalResult.changes;
      nextChangePageToken = incrementalResult.newStartPageToken || nextChangePageToken;
    }

    await repository.upsertConnection({
      ...connection,
      changePageToken: nextChangePageToken || connection.changePageToken,
      lastChangeScanAt: rescannedAt,
      updatedAt: Date.now(),
    });

    return json({
      changes,
      lastRescannedAt: rescannedAt,
    }, 200, requestOrigin);
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/patches/apply") {
    const { accessToken, connection } = await getAuthorizedConnection(request);
    const body = await parseOptionalRequestBody<WorkspaceApplyRequest>(request);
    const fileId = body?.fileId?.trim();
    const documentId = body?.documentId?.trim();
    const markdown = body?.markdown || "";

    if (!fileId || !documentId) {
      throw new HttpError(400, "documentId and fileId are required.");
    }

    if (!markdown.trim()) {
      throw new HttpError(400, "markdown is required.");
    }

    const importedDocument = await repository.getImportedDocument(documentId);

    if (!importedDocument || importedDocument.connectionId !== connection.connectionId || importedDocument.fileId !== fileId) {
      throw new HttpError(404, "Imported Google document snapshot was not found.");
    }

    const [file, currentDocument] = await Promise.all([
      getGoogleDriveFileMetadata(accessToken, fileId),
      getGoogleDocument(accessToken, fileId),
    ]);
    const currentRevisionId = getRevisionIdFromGoogleDocument(currentDocument);
    const expectedRevisionId = body?.baseRevisionId || importedDocument.revisionId;

    if (expectedRevisionId && currentRevisionId && expectedRevisionId !== currentRevisionId) {
      throw new HttpError(409, "The Google Doc changed since it was imported. Refresh before syncing.");
    }

    const { requests, warnings } = buildGoogleDocsBatchUpdateFromMarkdown(currentDocument, markdown);
    await batchUpdateGoogleDocument(accessToken, fileId, requests, currentRevisionId || expectedRevisionId);

    const [updatedFile, updatedDocument] = await Promise.all([
      getGoogleDriveFileMetadata(accessToken, fileId),
      getGoogleDocument(accessToken, fileId).catch(() => null),
    ]);
    const appliedAt = Date.now();
    const revisionId = getRevisionIdFromGoogleDocument(updatedDocument) || currentRevisionId || expectedRevisionId;

    await repository.upsertImportedDocument({
      ...importedDocument,
      content: markdown,
      docsJson: updatedDocument || importedDocument.docsJson,
      driveModifiedTime: updatedFile.modifiedTime,
      latestRemoteModifiedTime: undefined,
      latestRemoteRevisionId: undefined,
      remoteChangeDetectedAt: undefined,
      revisionId,
      updatedAt: appliedAt,
    });

    return json({
      appliedAt,
      driveModifiedTime: updatedFile.modifiedTime,
      ok: true,
      revisionId,
      syncStatus: "synced",
      warnings,
    }, 200, requestOrigin);
  }

  return null;
};
