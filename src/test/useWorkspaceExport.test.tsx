import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWorkspaceExport } from "@/hooks/useWorkspaceExport";
import type { DocumentData } from "@/types/document";

const exportWorkspaceDocument = vi.fn();

vi.mock("@/lib/workspace/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/workspace/client")>("@/lib/workspace/client");

  return {
    ...actual,
    exportWorkspaceDocument: (...args: Parameters<typeof exportWorkspaceDocument>) => exportWorkspaceDocument(...args),
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

const documentFixture: DocumentData = {
  content: "# Export me",
  createdAt: 1,
  id: "doc-export",
  mode: "markdown",
  name: "Export me",
  sourceSnapshots: {
    markdown: "# Export me",
  },
  storageKind: "docsy",
  updatedAt: 2,
};

describe("useWorkspaceExport", () => {
  beforeEach(() => {
    exportWorkspaceDocument.mockReset();
  });

  it("exports a local document to Google Docs and binds the result", async () => {
    exportWorkspaceDocument.mockResolvedValueOnce({
      ok: true,
      warnings: [],
      workspaceBinding: {
        documentKind: "google_docs",
        driveModifiedTime: "2026-03-12T00:00:00Z",
        fileId: "file-999",
        importedAt: 100,
        lastSyncedAt: 100,
        mimeType: "application/vnd.google-apps.document",
        provider: "google_drive",
        revisionId: "rev-1",
        syncStatus: "synced",
      },
    });

    const updateActiveDoc = vi.fn();
    const { result } = renderHook(
      () => useWorkspaceExport({ updateActiveDoc }),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      await result.current.exportDocument(documentFixture, {
        markdown: "# Export me",
        title: "Runbook",
      });
    });

    expect(exportWorkspaceDocument).toHaveBeenCalledWith({
      documentId: "doc-export",
      markdown: "# Export me",
      title: "Runbook",
    });
    expect(updateActiveDoc).toHaveBeenCalledWith({
      name: "Runbook",
      workspaceBinding: expect.objectContaining({
        fileId: "file-999",
        syncStatus: "synced",
      }),
    });
  });

  it("rejects structured documents", async () => {
    const updateActiveDoc = vi.fn();
    const { result } = renderHook(
      () => useWorkspaceExport({ updateActiveDoc }),
      { wrapper: createWrapper() },
    );

    let caughtError: unknown;

    await act(async () => {
      try {
        await result.current.exportDocument({
          ...documentFixture,
          mode: "json",
        });
      } catch (error) {
        caughtError = error;
      }
    });

    expect(caughtError).toBeInstanceOf(Error);
    expect((caughtError as Error).message).toBe("Google Docs export is only available for rich-text documents.");
    expect(exportWorkspaceDocument).not.toHaveBeenCalled();
  });
});
