import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useDocumentManager } from "@/hooks/useDocumentManager";

describe("useDocumentManager", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("replaces the final document with a fresh blank draft when deleted", () => {
    const { result } = renderHook(() => useDocumentManager());
    const originalId = result.current.activeDocId;

    act(() => {
      result.current.deleteDocument(originalId);
    });

    expect(result.current.documents).toHaveLength(1);
    expect(result.current.activeDocId).toBe(result.current.documents[0].id);
    expect(result.current.documents[0].id).not.toBe(originalId);
    expect(result.current.documents[0].name).toBe("Untitled");
    expect(result.current.documents[0].content).toBe("");
  });

  it("can replace a blank draft during import without growing the document list", () => {
    const { result } = renderHook(() => useDocumentManager());
    const originalId = result.current.activeDocId;

    act(() => {
      result.current.createDocument({
        content: "# Imported",
        id: "imported-doc",
        mode: "markdown",
        name: "Imported",
        replaceDocumentId: originalId,
        sourceSnapshots: { markdown: "# Imported" },
      });
    });

    expect(result.current.documents).toHaveLength(1);
    expect(result.current.activeDocId).toBe("imported-doc");
    expect(result.current.documents[0]).toEqual(expect.objectContaining({
      content: "# Imported",
      id: "imported-doc",
      name: "Imported",
    }));
  });

  it("remaps duplicate document ids on create", () => {
    const { result } = renderHook(() => useDocumentManager());

    act(() => {
      result.current.createDocument({
        content: "# Primary",
        id: "shared-id",
        mode: "markdown",
        name: "Primary",
        replaceDocumentId: result.current.activeDocId,
        sourceSnapshots: { markdown: "# Primary" },
      });
    });

    act(() => {
      result.current.createDocument({
        content: "# Duplicate",
        id: "shared-id",
        mode: "markdown",
        name: "Duplicate",
        sourceSnapshots: { markdown: "# Duplicate" },
      });
    });

    const ids = result.current.documents.map((document) => document.id);
    expect(result.current.documents).toHaveLength(2);
    expect(ids[0]).toBe("shared-id");
    expect(ids[1]).not.toBe("shared-id");
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("marks workspace-bound documents as dirty when content changes", () => {
    const { result } = renderHook(() => useDocumentManager());

    act(() => {
      result.current.createDocument({
        content: "<p>Imported</p>",
        id: "google-doc:abc123",
        mode: "html",
        name: "Imported Google Doc",
        replaceDocumentId: result.current.activeDocId,
        sourceSnapshots: { html: "<p>Imported</p>" },
        workspaceBinding: {
          documentKind: "google_docs",
          fileId: "abc123",
          importedAt: Date.now(),
          mimeType: "application/vnd.google-apps.document",
          provider: "google_drive",
          revisionId: "17",
          syncStatus: "imported",
        },
      });
    });

    act(() => {
      result.current.handleContentChange("<p>Changed locally</p>");
    });

    expect(result.current.activeDoc.workspaceBinding?.syncStatus).toBe("dirty_local");
  });

  it("can update a non-active document directly", () => {
    const { result } = renderHook(() => useDocumentManager());

    let secondaryId = "";

    act(() => {
      const created = result.current.createDocument({
        content: "# Secondary",
        id: "secondary-doc",
        mode: "markdown",
        name: "Secondary",
        sourceSnapshots: { markdown: "# Secondary" },
      });
      secondaryId = created.id;
    });

    act(() => {
      result.current.updateDocument(secondaryId, {
        name: "Updated Secondary",
      });
    });

    expect(result.current.documents.find((document) => document.id === secondaryId)?.name).toBe("Updated Secondary");
  });
});
