import { describe, expect, it } from "vitest";
import { isDocumentPatchSet } from "@/lib/patches/isDocumentPatchSet";

describe("isDocumentPatchSet", () => {
  it("accepts a structurally valid patch set", () => {
    expect(isDocumentPatchSet({
      author: "ai",
      createdAt: Date.now(),
      documentId: "doc-1",
      patchSetId: "set-1",
      patches: [
        {
          author: "ai",
          operation: "replace_text_range",
          patchId: "patch-1",
          status: "pending",
          target: {
            endOffset: 4,
            nodeId: "node-1",
            startOffset: 0,
            targetType: "text_range",
          },
          title: "Update paragraph",
        },
      ],
      status: "in_review",
      title: "Patch set",
    })).toBe(true);
  });

  it("accepts a document_text patch target", () => {
    expect(isDocumentPatchSet({
      author: "ai",
      createdAt: Date.now(),
      documentId: "doc-1",
      patchSetId: "set-2",
      patches: [
        {
          author: "ai",
          operation: "replace_text_range",
          patchId: "patch-1",
          status: "pending",
          target: {
            endOffset: 120,
            startOffset: 0,
            targetType: "document_text",
          },
          title: "Replace document source",
        },
      ],
      status: "in_review",
      title: "Patch set",
    })).toBe(true);
  });

  it("rejects plain document JSON", () => {
    expect(isDocumentPatchSet({
      content: "{}",
      createdAt: Date.now(),
      id: "doc-1",
      mode: "json",
      name: "data",
      updatedAt: Date.now(),
    })).toBe(false);
  });
});
