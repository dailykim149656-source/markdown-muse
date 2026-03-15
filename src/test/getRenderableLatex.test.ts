import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/core";
import { getRenderableLatex } from "@/lib/ast/getRenderableLatex";

describe("getRenderableLatex", () => {
  it("falls back to latex when tiptap document is structurally empty", () => {
    const emptyDocument: JSONContent = {
      type: "doc",
      content: [{ type: "paragraph" }],
    };

    expect(getRenderableLatex(emptyDocument, "\\section{Fallback}")).toBe("\\section{Fallback}");
  });
});
