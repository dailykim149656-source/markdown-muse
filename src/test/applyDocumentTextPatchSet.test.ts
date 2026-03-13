import { describe, expect, it } from "vitest";
import { applyDocumentTextPatchSet } from "@/lib/patches/applyDocumentTextPatchSet";
import type { DocumentPatchSet } from "@/types/documentPatch";

describe("applyDocumentTextPatchSet", () => {
  it("replaces the targeted document text range", () => {
    const patchSet: DocumentPatchSet = {
      author: "ai",
      createdAt: Date.now(),
      documentId: "doc-1",
      patchSetId: "set-1",
      patches: [{
        author: "ai",
        operation: "replace_text_range",
        patchId: "patch-1",
        payload: {
          kind: "replace_text",
          text: "\\section{Overview}\nFixed body.",
        },
        precondition: {
          expectedText: "\\section{Overview}\nBroken body.",
        },
        status: "accepted",
        target: {
          endOffset: "\\section{Overview}\nBroken body.".length,
          startOffset: 0,
          targetType: "document_text",
        },
        title: "Fix LaTeX source",
      }],
      status: "in_review",
      title: "AI LaTeX compile fix",
    };

    const result = applyDocumentTextPatchSet("\\section{Overview}\nBroken body.", patchSet);

    expect(result.appliedPatchIds).toEqual(["patch-1"]);
    expect(result.failures).toEqual([]);
    expect(result.value).toBe("\\section{Overview}\nFixed body.");
  });

  it("reports failures for invalid document_text ranges", () => {
    const patchSet: DocumentPatchSet = {
      author: "ai",
      createdAt: Date.now(),
      documentId: "doc-1",
      patchSetId: "set-2",
      patches: [{
        author: "ai",
        operation: "replace_text_range",
        patchId: "patch-1",
        payload: {
          kind: "replace_text",
          text: "next",
        },
        status: "accepted",
        target: {
          endOffset: 99,
          startOffset: 0,
          targetType: "document_text",
        },
        title: "Broken range",
      }],
      status: "in_review",
      title: "AI LaTeX compile fix",
    };

    const result = applyDocumentTextPatchSet("body", patchSet);

    expect(result.appliedPatchIds).toEqual([]);
    expect(result.failures).toEqual([
      expect.objectContaining({
        patchId: "patch-1",
      }),
    ]);
    expect(result.value).toBe("body");
  });
});
