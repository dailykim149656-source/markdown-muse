import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  assertWorkspaceSessionMock,
  batchUpdateGoogleDocumentMock,
  buildGoogleDocsBatchUpdateFromMarkdownMock,
  ensureGoogleAccessTokenMock,
  getGoogleDocumentMock,
  getGoogleDriveFileMetadataMock,
  getGoogleDriveStartPageTokenMock,
  getImportedDocumentMock,
  listImportedDocumentsMock,
  upsertConnectionMock,
  upsertImportedDocumentMock,
} = vi.hoisted(() => ({
  assertWorkspaceSessionMock: vi.fn(),
  batchUpdateGoogleDocumentMock: vi.fn(),
  buildGoogleDocsBatchUpdateFromMarkdownMock: vi.fn(),
  ensureGoogleAccessTokenMock: vi.fn(),
  getGoogleDocumentMock: vi.fn(),
  getGoogleDriveFileMetadataMock: vi.fn(),
  getGoogleDriveStartPageTokenMock: vi.fn(),
  getImportedDocumentMock: vi.fn(),
  listImportedDocumentsMock: vi.fn(),
  upsertConnectionMock: vi.fn(),
  upsertImportedDocumentMock: vi.fn(),
}));

vi.mock("../../server/modules/auth/routes", () => ({
  assertWorkspaceSession: (...args: Parameters<typeof assertWorkspaceSessionMock>) => assertWorkspaceSessionMock(...args),
}));

vi.mock("../../server/modules/auth/googleOAuth", () => ({
  ensureGoogleAccessToken: (...args: Parameters<typeof ensureGoogleAccessTokenMock>) => ensureGoogleAccessTokenMock(...args),
}));

vi.mock("../../server/modules/workspace/repository", () => ({
  getWorkspaceRepository: () => ({
    getImportedDocument: (...args: Parameters<typeof getImportedDocumentMock>) => getImportedDocumentMock(...args),
    listImportedDocuments: (...args: Parameters<typeof listImportedDocumentsMock>) => listImportedDocumentsMock(...args),
    upsertConnection: (...args: Parameters<typeof upsertConnectionMock>) => upsertConnectionMock(...args),
    upsertImportedDocument: (...args: Parameters<typeof upsertImportedDocumentMock>) => upsertImportedDocumentMock(...args),
  }),
}));

vi.mock("../../server/modules/workspace/googleDriveClient", () => ({
  exportGoogleDocAsHtml: vi.fn(),
  getGoogleDriveFileMetadata: (...args: Parameters<typeof getGoogleDriveFileMetadataMock>) =>
    getGoogleDriveFileMetadataMock(...args),
  getGoogleDriveStartPageToken: (...args: Parameters<typeof getGoogleDriveStartPageTokenMock>) =>
    getGoogleDriveStartPageTokenMock(...args),
  listGoogleDocsFiles: vi.fn(),
  listGoogleDriveChanges: vi.fn(),
}));

vi.mock("../../server/modules/workspace/googleDocsClient", () => ({
  batchUpdateGoogleDocument: (...args: Parameters<typeof batchUpdateGoogleDocumentMock>) =>
    batchUpdateGoogleDocumentMock(...args),
  createGoogleDocument: vi.fn(),
  getGoogleDocument: (...args: Parameters<typeof getGoogleDocumentMock>) => getGoogleDocumentMock(...args),
}));

vi.mock("../../server/modules/workspace/googleDocsMapper", () => ({
  buildGoogleDocsBatchUpdateFromMarkdown: (...args: Parameters<typeof buildGoogleDocsBatchUpdateFromMarkdownMock>) =>
    buildGoogleDocsBatchUpdateFromMarkdownMock(...args),
  buildImportedGoogleDocument: vi.fn(),
  buildWorkspaceBinding: vi.fn(),
  getRevisionIdFromGoogleDocument: (document: unknown) => (document as { revisionId?: string } | null)?.revisionId,
}));

const ORIGINAL_ENV = { ...process.env };

const createJsonRequest = (pathname: string, body?: unknown) => ({
  [Symbol.asyncIterator]: async function* () {
    if (body !== undefined) {
      yield Buffer.from(JSON.stringify(body));
    }
  },
  headers: {
    host: "app.docsy.dev",
    origin: "https://app.docsy.dev",
    "x-forwarded-proto": "https",
  },
  method: "POST",
  url: pathname,
});

describe("workspace route", () => {
  beforeEach(() => {
    process.env.WORKSPACE_FRONTEND_ORIGIN = "https://app.docsy.dev";

    assertWorkspaceSessionMock.mockReset();
    batchUpdateGoogleDocumentMock.mockReset();
    buildGoogleDocsBatchUpdateFromMarkdownMock.mockReset();
    ensureGoogleAccessTokenMock.mockReset();
    getGoogleDocumentMock.mockReset();
    getGoogleDriveFileMetadataMock.mockReset();
    getGoogleDriveStartPageTokenMock.mockReset();
    getImportedDocumentMock.mockReset();
    listImportedDocumentsMock.mockReset();
    upsertConnectionMock.mockReset();
    upsertImportedDocumentMock.mockReset();

    assertWorkspaceSessionMock.mockResolvedValue({
      connection: {
        connectionId: "conn-1",
        tokens: { accessToken: "stale-token" },
      },
      session: { sessionId: "session-1" },
    });
    ensureGoogleAccessTokenMock.mockResolvedValue({
      didRefresh: false,
      tokens: { accessToken: "access-token" },
    });
    buildGoogleDocsBatchUpdateFromMarkdownMock.mockReturnValue({
      requests: [{ replaceAllText: { containsText: "old", replaceText: "new" } }],
      warnings: ["Formatting note"],
    });
  });

  afterEach(() => {
    vi.resetModules();

    for (const key of Object.keys(process.env)) {
      if (!(key in ORIGINAL_ENV)) {
        delete process.env[key];
      }
    }

    Object.assign(process.env, ORIGINAL_ENV);
  });

  it("automatically merges stale Google Docs revisions and persists the latest docs revision", async () => {
    getImportedDocumentMock.mockResolvedValueOnce({
      connectionId: "conn-1",
      createdAt: 1,
      documentId: "doc-google",
      driveModifiedTime: "2026-03-12T00:00:00Z",
      fileId: "file-123",
      fileName: "Runbook",
      mimeType: "application/vnd.google-apps.document",
      revisionId: "docs-old",
      updatedAt: 1,
    });
    getGoogleDocumentMock
      .mockResolvedValueOnce({ revisionId: "docs-current" })
      .mockResolvedValueOnce({ revisionId: "docs-updated" });
    getGoogleDriveFileMetadataMock.mockResolvedValueOnce({
      fileId: "file-123",
      mimeType: "application/vnd.google-apps.document",
      modifiedTime: "2026-03-12T01:00:00Z",
      name: "Runbook",
    });
    batchUpdateGoogleDocumentMock.mockResolvedValueOnce({});

    const { handleWorkspaceRoute } = await import("../../server/modules/workspace/routes");
    const response = await handleWorkspaceRoute(createJsonRequest("/api/patches/apply", {
      baseRevisionId: "docs-old",
      documentId: "doc-google",
      fileId: "file-123",
      markdown: "# Updated runbook",
    }) as never);

    expect(batchUpdateGoogleDocumentMock).toHaveBeenCalledWith(
      "access-token",
      "file-123",
      [{ replaceAllText: { containsText: "old", replaceText: "new" } }],
      { targetRevisionId: "docs-current" },
    );
    expect(upsertImportedDocumentMock).toHaveBeenCalledWith(expect.objectContaining({
      driveModifiedTime: "2026-03-12T01:00:00Z",
      revisionId: "docs-updated",
    }));

    const payload = JSON.parse(String(response?.body)) as { revisionId?: string; warnings: string[] };
    expect(response?.statusCode).toBe(200);
    expect(payload.revisionId).toBe("docs-updated");
    expect(payload.warnings).toEqual(expect.arrayContaining([
      "Formatting note",
      expect.stringContaining("latest Google Docs revision automatically"),
    ]));
  });

  it("does not flag legacy Drive version tokens as remote changes during a full rescan", async () => {
    listImportedDocumentsMock.mockResolvedValueOnce([{
      connectionId: "conn-1",
      createdAt: 1,
      documentId: "doc-google",
      driveModifiedTime: "2026-03-12T00:00:00Z",
      fileId: "file-123",
      fileName: "Runbook",
      mimeType: "application/vnd.google-apps.document",
      revisionId: "123456",
      updatedAt: 1,
    }]);
    getGoogleDocumentMock.mockResolvedValueOnce({ revisionId: "docs-current" });
    getGoogleDriveFileMetadataMock.mockResolvedValueOnce({
      fileId: "file-123",
      mimeType: "application/vnd.google-apps.document",
      modifiedTime: "2026-03-12T00:00:00Z",
      name: "Runbook",
    });
    getGoogleDriveStartPageTokenMock.mockResolvedValueOnce("next-token");

    const { handleWorkspaceRoute } = await import("../../server/modules/workspace/routes");
    const response = await handleWorkspaceRoute(createJsonRequest("/api/workspace/rescan", {}) as never);

    const payload = JSON.parse(String(response?.body)) as { changes: unknown[]; lastRescannedAt: number };
    expect(response?.statusCode).toBe(200);
    expect(payload.changes).toEqual([]);
    expect(upsertImportedDocumentMock).toHaveBeenCalledWith(expect.objectContaining({
      latestRemoteRevisionId: undefined,
      remoteChangeDetectedAt: undefined,
    }));
  });

  it("propagates actual batch update failures instead of returning a success payload", async () => {
    getImportedDocumentMock.mockResolvedValueOnce({
      connectionId: "conn-1",
      createdAt: 1,
      documentId: "doc-google",
      driveModifiedTime: "2026-03-12T00:00:00Z",
      fileId: "file-123",
      fileName: "Runbook",
      mimeType: "application/vnd.google-apps.document",
      revisionId: "docs-current",
      updatedAt: 1,
    });
    getGoogleDocumentMock.mockResolvedValueOnce({ revisionId: "docs-current" });
    batchUpdateGoogleDocumentMock.mockRejectedValueOnce(new Error("write control failed"));

    const { handleWorkspaceRoute } = await import("../../server/modules/workspace/routes");

    await expect(handleWorkspaceRoute(createJsonRequest("/api/patches/apply", {
      baseRevisionId: "docs-current",
      documentId: "doc-google",
      fileId: "file-123",
      markdown: "# Updated runbook",
    }) as never)).rejects.toThrow("write control failed");
  });
});
