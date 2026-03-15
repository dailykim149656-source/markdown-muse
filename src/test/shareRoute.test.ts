import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildShareableDocsyPayload } from "@/lib/share/docShare";

const getSharedDocumentMock = vi.fn();
const pruneExpiredMock = vi.fn();
const upsertSharedDocumentMock = vi.fn();

vi.mock("../../server/modules/workspace/repository", () => ({
  getWorkspaceRepository: () => ({
    getSharedDocument: (...args: Parameters<typeof getSharedDocumentMock>) => getSharedDocumentMock(...args),
    pruneExpired: (...args: Parameters<typeof pruneExpiredMock>) => pruneExpiredMock(...args),
    upsertSharedDocument: (...args: Parameters<typeof upsertSharedDocumentMock>) => upsertSharedDocumentMock(...args),
  }),
}));

const ORIGINAL_ENV = { ...process.env };

const createJsonRequest = (body: unknown) => ({
  [Symbol.asyncIterator]: async function* () {
    yield Buffer.from(JSON.stringify(body));
  },
  headers: {
    host: "app.docsy.dev",
    origin: "https://app.docsy.dev",
    "x-forwarded-proto": "https",
  },
  method: "POST",
  url: "/api/share",
});

const createGetRequest = (pathname: string) => ({
  headers: {
    host: "app.docsy.dev",
    "x-forwarded-proto": "https",
  },
  method: "GET",
  url: pathname,
});

const documentFixture = {
  ast: null,
  content: "# Shared doc\n\nBody",
  createdAt: 1,
  id: "doc-share",
  metadata: {},
  mode: "markdown" as const,
  name: "Shared doc",
  sourceSnapshots: {
    markdown: "# Shared doc\n\nBody",
  },
  storageKind: "docsy" as const,
  tiptapJson: null,
  updatedAt: 2,
};

beforeEach(() => {
  getSharedDocumentMock.mockReset();
  pruneExpiredMock.mockReset();
  upsertSharedDocumentMock.mockReset();
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

describe("share route", () => {
  it("creates a public short share link and stores the compressed payload", async () => {
    process.env.WORKSPACE_FRONTEND_ORIGIN = "https://app.docsy.dev";

    const { handleShareRoute } = await import("../../server/modules/share/routes");
    const response = await handleShareRoute(createJsonRequest({
      payload: buildShareableDocsyPayload(documentFixture),
    }) as never);

    expect(pruneExpiredMock).toHaveBeenCalledOnce();
    expect(upsertSharedDocumentMock).toHaveBeenCalledOnce();
    expect(response?.statusCode).toBe(200);

    const payload = JSON.parse(String(response?.body)) as { expiresAt: number; link: string; shareId: string };
    expect(payload.link).toBe(`https://app.docsy.dev/s/${payload.shareId}`);
    expect(payload.shareId).toMatch(/^[A-Za-z0-9_-]{12}$/);
    expect(payload.expiresAt).toBeGreaterThan(Date.now());
    expect(upsertSharedDocumentMock).toHaveBeenCalledWith(expect.objectContaining({
      compressedPayload: expect.any(String),
      compression: "deflate-raw-base64url",
      shareId: payload.shareId,
    }));
  });

  it("rejects POST requests from a mismatched origin", async () => {
    process.env.WORKSPACE_FRONTEND_ORIGIN = "https://app.docsy.dev";

    const { handleShareRoute } = await import("../../server/modules/share/routes");

    await expect(handleShareRoute({
      ...createJsonRequest({ payload: buildShareableDocsyPayload(documentFixture) }),
      headers: {
        host: "app.docsy.dev",
        origin: "https://evil.example",
        "x-forwarded-proto": "https",
      },
    } as never)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("returns 404 when a shared document is missing", async () => {
    getSharedDocumentMock.mockResolvedValueOnce(null);

    const { handleShareRoute } = await import("../../server/modules/share/routes");

    await expect(handleShareRoute(createGetRequest("/api/share/missing-id") as never)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("returns 410 for expired shared documents and prunes them", async () => {
    getSharedDocumentMock.mockResolvedValueOnce({
      compressedPayload: "compressed",
      compression: "deflate-raw-base64url",
      createdAt: 1,
      expiresAt: Date.now() - 1_000,
      shareId: "expired-id",
      updatedAt: 1,
    });

    const { handleShareRoute } = await import("../../server/modules/share/routes");

    await expect(handleShareRoute(createGetRequest("/api/share/expired-id") as never)).rejects.toMatchObject({
      statusCode: 410,
    });
    expect(pruneExpiredMock).toHaveBeenCalledOnce();
  });
});
