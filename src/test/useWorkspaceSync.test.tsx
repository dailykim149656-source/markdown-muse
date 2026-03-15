import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWorkspaceSync } from "@/hooks/useWorkspaceSync";
import { WorkspaceApiError } from "@/lib/workspace/client";
import type { DocumentData } from "@/types/document";

const applyWorkspaceDocument = vi.fn();

vi.mock("@/lib/workspace/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/workspace/client")>("@/lib/workspace/client");

  return {
    ...actual,
    applyWorkspaceDocument: (...args: Parameters<typeof applyWorkspaceDocument>) => applyWorkspaceDocument(...args),
  };
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const workspaceDocumentFixture: DocumentData = {
  content: "# Synced markdown",
  createdAt: 1,
  id: "doc-google",
  mode: "markdown",
  name: "Google Doc",
  sourceSnapshots: {
    markdown: "# Synced markdown",
  },
  storageKind: "docsy",
  updatedAt: 2,
  workspaceBinding: {
    documentKind: "google_docs",
    fileId: "file-123",
    importedAt: 10,
    mimeType: "application/vnd.google-apps.document",
    provider: "google_drive",
    revisionId: "rev-1",
    syncStatus: "dirty_local",
  },
};

describe("useWorkspaceSync", () => {
  beforeEach(() => {
    applyWorkspaceDocument.mockReset();
  });

  it("marks a workspace document as synced after a successful apply", async () => {
    applyWorkspaceDocument.mockResolvedValueOnce({
      appliedAt: 999,
      driveModifiedTime: "2026-03-12T00:00:00Z",
      ok: true,
      revisionId: "rev-2",
      syncStatus: "synced",
      warnings: [],
    });

    const updateActiveDoc = vi.fn();
    const { result } = renderHook(
      () => useWorkspaceSync({ updateActiveDoc }),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      await result.current.syncDocument(workspaceDocumentFixture);
    });

    expect(updateActiveDoc).toHaveBeenNthCalledWith(1, {
      workspaceBinding: expect.objectContaining({
        fileId: "file-123",
        syncError: undefined,
        syncWarnings: undefined,
        syncStatus: "syncing",
      }),
    });
    expect(updateActiveDoc).toHaveBeenNthCalledWith(2, {
      workspaceBinding: expect.objectContaining({
        driveModifiedTime: "2026-03-12T00:00:00Z",
        lastSyncedAt: 999,
        revisionId: "rev-2",
        syncError: undefined,
        syncWarnings: undefined,
        syncStatus: "synced",
      }),
    });
    expect(applyWorkspaceDocument).toHaveBeenCalledWith({
      baseRevisionId: "rev-1",
      documentId: "doc-google",
      fileId: "file-123",
      markdown: "# Synced markdown",
    });
  });

  it("marks a 409 apply failure as a sync conflict", async () => {
    applyWorkspaceDocument.mockRejectedValueOnce(
      new WorkspaceApiError("The Google Doc changed since it was imported. Refresh before syncing.", 409),
    );

    const updateActiveDoc = vi.fn();
    const { result } = renderHook(
      () => useWorkspaceSync({ updateActiveDoc }),
      { wrapper: createWrapper() },
    );

    let caughtError: unknown;

    await act(async () => {
      try {
        await result.current.syncDocument(workspaceDocumentFixture);
      } catch (error) {
        caughtError = error;
      }
    });

    expect(caughtError).toBeInstanceOf(WorkspaceApiError);
    expect((caughtError as Error).message).toBe("The Google Doc changed since it was imported. Refresh before syncing.");

    await waitFor(() => {
      expect(updateActiveDoc).toHaveBeenLastCalledWith({
        workspaceBinding: expect.objectContaining({
          syncError: "The Google Doc changed since it was imported. Refresh before syncing.",
          syncWarnings: undefined,
          syncStatus: "conflict",
        }),
      });
    });
  });

  it("stores sync warnings returned by the Workspace apply endpoint", async () => {
    applyWorkspaceDocument.mockResolvedValueOnce({
      appliedAt: 1001,
      driveModifiedTime: "2026-03-12T02:00:00Z",
      ok: true,
      revisionId: "rev-3",
      syncStatus: "synced",
      warnings: ["Markdown tables are not preserved in Google Docs sync."],
    });

    const updateActiveDoc = vi.fn();
    const { result } = renderHook(
      () => useWorkspaceSync({ updateActiveDoc }),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      await result.current.syncDocument(workspaceDocumentFixture);
    });

    expect(updateActiveDoc).toHaveBeenLastCalledWith({
      workspaceBinding: expect.objectContaining({
        syncStatus: "synced",
        syncWarnings: ["Markdown tables are not preserved in Google Docs sync."],
      }),
    });
  });
});
