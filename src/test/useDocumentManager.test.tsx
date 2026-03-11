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
});
