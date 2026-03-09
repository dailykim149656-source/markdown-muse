import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/core";
import { getRenderableLatex } from "@/lib/ast/getRenderableLatex";
import { technicalDocumentFixture } from "@/test/fixtures/technicalDocument.fixture";

describe("getRenderableLatex", () => {
  it("prefers AST rendering when the editor document is supported", () => {
    const fallback = "\\section{fallback}";
    const result = getRenderableLatex(technicalDocumentFixture, fallback);

    expect(result).not.toBe(fallback);
    expect(result).toContain("\\section{System Overview}");
  });

  it("falls back when the editor document cannot be serialized", () => {
    const unsupported: JSONContent = {
      type: "doc",
      content: [{ type: "unsupportedNode" }],
    };
    const fallback = "\\section{fallback}";

    expect(getRenderableLatex(unsupported, fallback)).toBe(fallback);
  });
});
