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
import { batchUpdateGoogleDocument, createGoogleDocument, getGoogleDocument } from "./googleDocsClient";
import {
  buildGoogleDocsBatchUpdateFromMarkdown,
  buildImportedGoogleDocument,
  buildWorkspaceBinding,
  getRevisionIdFromGoogleDocument,
} from "./googleDocsMapper";

interface WorkspaceFilesQuery {
  cursor?: string | null;
  pageSize?: string | null;
  q?: string | null;
}

interface WorkspaceImportRequest {
  documentId?: string;
  fileId?: string;
}

interface WorkspaceExportRequest {
  documentId?: string;
  markdown?: string;
  title?: string;
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

const isLocalAbsoluteOrigin = (value: string) => {
  try {
    const url = new URL(value);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
};

const requiresExplicitFrontendOrigin = () =>
  Boolean(
    process.env.K_SERVICE
    || process.env.NODE_ENV === "production"
    || (process.env.AI_ALLOWED_ORIGIN || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .some((origin) => origin !== "*" && !isLocalAbsoluteOrigin(origin)),
  );

const resolveTrustedFrontendOrigin = () => {
  const configured = process.env.WORKSPACE_FRONTEND_ORIGIN?.trim();

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (requiresExplicitFrontendOrigin()) {
    throw new HttpError(500, "WORKSPACE_FRONTEND_ORIGIN must be configured for this deployment.");
  }

  return "http://localhost:8080";
};

const assertTrustedPostOrigin = (request: IncomingMessage) => {
  if (request.method !== "POST") {
    return;
  }

  const requestOrigin = typeof request.headers.origin === "string"
    ? request.headers.origin.trim().replace(/\/$/, "")
    : "";

  if (!requestOrigin) {
    if (requiresExplicitFrontendOrigin()) {
      throw new HttpError(403, "Origin header is required.");
    }

    return;
  }

  if (requestOrigin !== resolveTrustedFrontendOrigin()) {
    throw new HttpError(403, "Origin is not allowed.");
  }
};

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
    assertTrustedPostOrigin(request);
    const { accessToken, connection } = await getAuthorizedConnection(request);
    const body = await parseOptionalRequestBody<WorkspaceImportRequest>(request);
    const documentId = body?.documentId?.trim();
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
      documentId: documentId || undefined,
      docsRevisionId,
      exportedHtml,
      file,
      importedAt,
    });

    await repository.upsertImportedDocument({
      connectionId: connection.connectionId,
      createdAt: importedAt,
      documentId: document.id || documentId || fileId,
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

  if (request.method === "POST" && requestUrl.pathname === "/api/workspace/export") {
    assertTrustedPostOrigin(request);
    const { accessToken, connection } = await getAuthorizedConnection(request);
    const body = await parseOptionalRequestBody<WorkspaceExportRequest>(request);
    const documentId = body?.documentId?.trim();
    const markdown = typeof body?.markdown === "string" ? body.markdown : null;
    const title = body?.title?.trim() || "Untitled";

    if (!documentId) {
      throw new HttpError(400, "documentId is required.");
    }

    if (markdown === null) {
      throw new HttpError(400, "markdown is required.");
    }

    const existingImportedDocument = await repository.getImportedDocument(documentId);
    const createdDocument = await createGoogleDocument(accessToken, title);
    const fileId = (createdDocument as { documentId?: string })?.documentId?.trim();

    if (!fileId) {
      throw new HttpError(502, "Google Docs create did not return a documentId.");
    }

    const createdRevisionId = getRevisionIdFromGoogleDocument(createdDocument);
    const { requests, warnings } = buildGoogleDocsBatchUpdateFromMarkdown(createdDocument, markdown);

    await batchUpdateGoogleDocument(accessToken, fileId, requests, createdRevisionId);

    const [file, updatedDocument] = await Promise.all([
      getGoogleDriveFileMetadata(accessToken, fileId),
      getGoogleDocument(accessToken, fileId).catch(() => null),
    ]);
    const exportedAt = Date.now();
    const revisionId = getRevisionIdFromGoogleDocument(updatedDocument) || createdRevisionId || file.revisionId;
    const workspaceBinding = buildWorkspaceBinding(file, exportedAt, {
      lastSyncedAt: exportedAt,
      revisionId,
      syncStatus: "synced",
      syncWarnings: warnings.length > 0 ? warnings : undefined,
    });

    await repository.upsertImportedDocument({
      connectionId: connection.connectionId,
      createdAt: existingImportedDocument?.createdAt || exportedAt,
      documentId,
      driveModifiedTime: file.modifiedTime,
      fileId: file.fileId,
      fileName: file.name,
      latestRemoteModifiedTime: undefined,
      latestRemoteRevisionId: undefined,
      lastRescannedAt: existingImportedDocument?.lastRescannedAt,
      mimeType: file.mimeType,
      remoteChangeDetectedAt: undefined,
      revisionId,
      updatedAt: exportedAt,
    });

    return json({
      ok: true,
      warnings,
      workspaceBinding,
    }, 200, requestOrigin);
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/workspace/rescan") {
    assertTrustedPostOrigin(request);
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
    assertTrustedPostOrigin(request);
    const { accessToken, connection } = await getAuthorizedConnection(request);
    const body = await parseOptionalRequestBody<WorkspaceApplyRequest>(request);
    const fileId = body?.fileId?.trim();
    const documentId = body?.documentId?.trim();
    const markdown = typeof body?.markdown === "string" ? body.markdown : null;

    if (!fileId || !documentId) {
      throw new HttpError(400, "documentId and fileId are required.");
    }

    if (markdown === null) {
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
