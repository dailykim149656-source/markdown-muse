import { describe, expect, it, vi } from "vitest";
import { searchDriveDocuments, shouldSearchDriveDocuments } from "../../server/modules/workspace/searchDriveDocuments";

vi.mock("../../server/modules/auth/routes", () => ({
  assertWorkspaceSession: vi.fn().mockResolvedValue({
    connection: {
      connectionId: "conn-1",
      tokens: {
        accessToken: "token",
      },
    },
  }),
}));

vi.mock("../../server/modules/auth/googleOAuth", () => ({
  ensureGoogleAccessToken: vi.fn().mockResolvedValue({
    didRefresh: false,
    tokens: {
      accessToken: "token",
    },
  }),
}));

vi.mock("../../server/modules/workspace/repository", () => ({
  getWorkspaceRepository: () => ({
    upsertConnection: vi.fn(),
  }),
}));

vi.mock("../../server/modules/workspace/googleDriveClient", () => ({
  exportGoogleDocAsHtml: vi.fn(async (_token: string, fileId: string) => `<html><body><h1>${fileId}</h1><p>Runbook rollback authentication guide.</p></body></html>`),
  getGoogleDriveFileMetadata: vi.fn(async (_token: string, fileId: string) => ({
    fileId,
    mimeType: "application/vnd.google-apps.document",
    modifiedTime: fileId === "file-2" ? "2026-03-14T00:00:00Z" : "2026-03-13T00:00:00Z",
    name: fileId === "file-2" ? "Rollback Guide" : "Runbook",
    webViewLink: `https://docs.google.com/document/d/${fileId}/edit`,
  })),
  listGoogleDocsFiles: vi.fn(async (_token: string, options?: { query?: string }) => ({
    files: options?.query
      ? [
        {
          fileId: "file-1",
          mimeType: "application/vnd.google-apps.document",
          modifiedTime: "2026-03-13T00:00:00Z",
          name: "Runbook",
        },
        {
          fileId: "file-2",
          mimeType: "application/vnd.google-apps.document",
          modifiedTime: "2026-03-14T00:00:00Z",
          name: "Rollback Guide",
        },
      ]
      : [
        {
          fileId: "file-3",
          mimeType: "application/vnd.google-apps.document",
          modifiedTime: "2026-03-12T00:00:00Z",
          name: "Recent Doc",
        },
      ],
    nextCursor: null,
  })),
}));

describe("searchDriveDocuments", () => {
  it("detects Drive-search intent only for explicit Google/Drive requests", () => {
    expect(shouldSearchDriveDocuments({
      driveReferenceFileIds: [],
      latestUserMessage: "\uAD6C\uAE00 \uB4DC\uB77C\uC774\uBE0C\uC5D0\uC11C \uC778\uC99D runbook \uCC3E\uC544\uC918",
    })).toBe(true);

    expect(shouldSearchDriveDocuments({
      driveReferenceFileIds: [],
      latestUserMessage: "\uC778\uACC4\uC790\uB294 \uD64D\uAE38\uB3D9, \uC778\uC218\uC790\uB294 \uC2EC\uCCAD\uC774. \uC774 \uB0B4\uC6A9\uC744 \uBB38\uC11C\uC5D0 \uBC18\uC601\uD574",
    })).toBe(false);
  });

  it("returns ranked Google Drive candidates from on-demand reads", async () => {
    const candidates = await searchDriveDocuments({
      latestUserMessage: "find the rollback authentication runbook",
      request: { headers: {}, method: "POST", url: "/api/ai/agent/turn" } as never,
    });

    expect(candidates.length).toBeGreaterThanOrEqual(2);
    expect(candidates[0]?.fileId).toBe("file-2");
    expect(candidates[0]?.relevanceReason).toContain("Matched terms");
    expect(candidates[0]?.excerpt).toContain("Runbook rollback authentication guide");
  });
});
