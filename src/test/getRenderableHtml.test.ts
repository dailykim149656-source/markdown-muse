import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/core";
import { getRenderableHtml } from "@/lib/ast/getRenderableHtml";
import { renderAstToHtml } from "@/lib/ast/renderAstToHtml";
import { serializeTiptapToAst } from "@/lib/ast/tiptapAst";
import { technicalDocumentFixture } from "@/test/fixtures/technicalDocument.fixture";

describe("getRenderableHtml", () => {
  it("prefers AST-rendered HTML for supported editor documents", () => {
    const expected = renderAstToHtml(serializeTiptapToAst(technicalDocumentFixture));
    const actual = getRenderableHtml(technicalDocumentFixture, "<p>fallback</p>");

    expect(actual).toBe(expected);
    expect(actual).toContain('data-type="admonition"');
  });

  it("falls back to existing HTML when AST serialization fails", () => {
    const unsupportedDocument: JSONContent = {
      type: "doc",
      content: [{ type: "unsupportedNode" }],
    };

    expect(getRenderableHtml(unsupportedDocument, "<p>fallback</p>")).toBe("<p>fallback</p>");
  });

  it("falls back to existing HTML when tiptap document is structurally empty", () => {
    const emptyDocument: JSONContent = {
      type: "doc",
      content: [{ type: "paragraph" }],
    };

    expect(getRenderableHtml(emptyDocument, "<p>fallback</p>")).toBe("<p>fallback</p>");
  });
});
