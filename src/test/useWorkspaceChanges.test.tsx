import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWorkspaceChanges } from "@/hooks/useWorkspaceChanges";
import type { DocumentData } from "@/types/document";

const getWorkspaceChanges = vi.fn();
const importWorkspaceFile = vi.fn();
const rescanWorkspaceChanges = vi.fn();

vi.mock("@/lib/workspace/client", () => ({
  getWorkspaceChanges: (...args: Parameters<typeof getWorkspaceChanges>) => getWorkspaceChanges(...args),
  importWorkspaceFile: (...args: Parameters<typeof importWorkspaceFile>) => importWorkspaceFile(...args),
  rescanWorkspaceChanges: (...args: Parameters<typeof rescanWorkspaceChanges>) => rescanWorkspaceChanges(...args),
}));

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

const documentsFixture: DocumentData[] = [
  {
    content: "<h1>Imported</h1>",
    createdAt: 1,
    id: "doc-google",
    mode: "html",
    name: "Imported Google Doc",
    sourceSnapshots: {
      html: "<h1>Imported</h1>",
      markdown: "# Imported",
    },
    storageKind: "docsy",
    updatedAt: 2,
    workspaceBinding: {
      documentKind: "google_docs",
      driveModifiedTime: "2026-03-11T00:00:00Z",
      fileId: "file-123",
      importedAt: 10,
      mimeType: "application/vnd.google-apps.document",
      provider: "google_drive",
      revisionId: "rev-1",
      syncStatus: "synced",
    },
  },
];

describe("useWorkspaceChanges", () => {
  beforeEach(() => {
    getWorkspaceChanges.mockReset();
    importWorkspaceFile.mockReset();
    rescanWorkspaceChanges.mockReset();
    getWorkspaceChanges.mockResolvedValue({
      changes: [],
      lastRescannedAt: null,
    });
  });

  it("marks imported documents as conflict when remote changes are detected", async () => {
    getWorkspaceChanges.mockResolvedValueOnce({
      changes: [
        {
          changeType: "changed",
          detectedAt: 500,
          documentId: "doc-google",
          fileId: "file-123",
          modifiedTime: "2026-03-12T01:00:00Z",
          name: "Imported Google Doc",
          revisionId: "rev-2",
        },
      ],
      lastRescannedAt: 500,
    });

    const onImportRefresh = vi.fn();
    const updateDocument = vi.fn();

    const { result } = renderHook(
      () => useWorkspaceChanges({
        documents: documentsFixture,
        enabled: true,
        onImportRefresh,
        updateDocument,
      }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(updateDocument).toHaveBeenCalledWith("doc-google", {
        workspaceBinding: expect.objectContaining({
          driveModifiedTime: "2026-03-12T01:00:00Z",
          syncError: "Remote Google Doc changed. Refresh before syncing.",
          syncWarnings: undefined,
          syncStatus: "conflict",
        }),
      });
    });

    expect(result.current.remoteChangedSources).toEqual([
      expect.objectContaining({
        changeType: "changed",
        documentId: "doc-google",
        documentName: "Imported Google Doc",
        sourceLabel: "Google",
      }),
    ]);
  });

  it("refreshes an imported document and forwards the imported payload", async () => {
    importWorkspaceFile.mockResolvedValueOnce({
      document: {
        content: "<h1>Refreshed</h1>",
        id: "doc-google",
        mode: "html",
        name: "Refreshed Google Doc",
        sourceSnapshots: {
          html: "<h1>Refreshed</h1>",
        },
      },
    });

    const onImportRefresh = vi.fn();
    const updateDocument = vi.fn();

    const { result } = renderHook(
      () => useWorkspaceChanges({
        documents: documentsFixture,
        enabled: true,
        onImportRefresh,
        updateDocument,
      }),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      await result.current.refreshDocument("doc-google");
    });

    expect(importWorkspaceFile).toHaveBeenCalledWith("file-123");
    expect(onImportRefresh).toHaveBeenCalledWith(expect.objectContaining({
      content: "<h1>Refreshed</h1>",
      id: "doc-google",
      name: "Refreshed Google Doc",
    }));
  });
});
