import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createNewDocument, saveData } from "@/components/editor/useAutoSave";
import { useDocumentManager } from "@/hooks/useDocumentManager";

describe("useDocumentManager", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
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

  it("persists a newly created document immediately without waiting for autosave", () => {
    const { result } = renderHook(() => useDocumentManager());

    act(() => {
      result.current.createDocument({
        content: "# Draft",
        id: "draft-doc",
        mode: "markdown",
        name: "Draft",
        sourceSnapshots: { markdown: "# Draft" },
      });
    });

    const saved = JSON.parse(localStorage.getItem("docsy-autosave-v2") || "{}") as {
      activeDocId?: string;
      documents?: Array<{ content: string; id: string; name: string }>;
    };

    expect(saved.activeDocId).toBe("draft-doc");
    expect(saved.documents).toEqual(expect.arrayContaining([
      expect.objectContaining({
        content: "# Draft",
        id: "draft-doc",
        name: "Draft",
      }),
    ]));
  });

  it("restores newly created content after unmount before the autosave interval", () => {
    const hook = renderHook(() => useDocumentManager());

    act(() => {
      hook.result.current.createDocument({
        content: "# Agent Draft\n\nBody content",
        id: "agent-draft",
        mode: "markdown",
        name: "Agent Draft",
        sourceSnapshots: { markdown: "# Agent Draft\n\nBody content" },
      });
    });

    hook.unmount();

    const restored = renderHook(() => useDocumentManager());

    expect(restored.result.current.documents).toEqual(expect.arrayContaining([
      expect.objectContaining({
        content: "# Agent Draft\n\nBody content",
        id: "agent-draft",
        name: "Agent Draft",
      }),
    ]));
    expect(restored.result.current.activeDocId).toBe("agent-draft");
  });

  it("flushes edited content on pagehide before the autosave interval", () => {
    const hook = renderHook(() => useDocumentManager());

    act(() => {
      hook.result.current.handleContentChange("# Draft before unload");
    });

    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });

    hook.unmount();

    const restored = renderHook(() => useDocumentManager());

    expect(restored.result.current.activeDoc.content).toBe("# Draft before unload");
  });

  it("resets documents to a fresh blank draft and persists it immediately", () => {
    const { result } = renderHook(() => useDocumentManager());
    const previousDocumentId = result.current.activeDocId;

    act(() => {
      result.current.createDocument({
        content: "# Existing",
        id: "existing-doc",
        mode: "markdown",
        name: "Existing",
        replaceDocumentId: previousDocumentId,
        sourceSnapshots: { markdown: "# Existing" },
      });
    });

    act(() => {
      result.current.resetDocuments();
    });

    expect(result.current.documents).toHaveLength(1);
    expect(result.current.activeDocId).toBe(result.current.documents[0].id);
    expect(result.current.documents[0]).toEqual(expect.objectContaining({
      content: "",
      mode: "markdown",
      name: "Untitled",
    }));
    expect(result.current.documents[0].id).not.toBe("existing-doc");
    expect(localStorage.getItem("docsy-autosave")).toBeNull();

    const saved = JSON.parse(localStorage.getItem("docsy-autosave-v2") || "{}") as {
      activeDocId?: string;
      documents?: Array<{ content: string; mode: string; name: string }>;
    };

    expect(saved.activeDocId).toBe(result.current.documents[0].id);
    expect(saved.documents).toEqual([
      expect.objectContaining({
        content: "",
        mode: "markdown",
        name: "Untitled",
      }),
    ]);
  });

  it("does not report a restored session for a persisted pristine blank draft", () => {
    const blankDocument = createNewDocument();
    saveData({
      activeDocId: blankDocument.id,
      documents: [blankDocument],
      lastSaved: Date.now(),
      version: 2,
    });

    const { result } = renderHook(() => useDocumentManager());

    expect(result.current.documents).toHaveLength(1);
    expect(result.current.documents[0]).toEqual(expect.objectContaining({
      content: "",
      mode: "markdown",
      name: "Untitled",
    }));
    expect(result.current.hasRestoredDocuments).toBe(false);
  });

  it("does not bootstrap a blank document when recovery hints indicate prior meaningful work", async () => {
    const blankDocument = createNewDocument();
    saveData({
      activeDocId: blankDocument.id,
      documents: [blankDocument],
      lastSaved: Date.now(),
      version: 2,
    });
    sessionStorage.setItem("docsy-autosave-last-save-marker", JSON.stringify({
      activeDocId: "doc-prev",
      contentHash: "meaningful-hash",
      docCount: 3,
      isMeaningful: true,
      lastSaved: Date.now(),
      reason: "autosave",
    }));

    const { result } = renderHook(() => useDocumentManager());

    expect(result.current.documents).toHaveLength(0);
    expect(result.current.isRecovering || result.current.recoveryFailure).toBeTruthy();
  });
});
