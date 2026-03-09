import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/core";
import { getRenderableMarkdown } from "@/lib/ast/getRenderableMarkdown";
import { renderAstToMarkdown } from "@/lib/ast/renderAstToMarkdown";
import { serializeTiptapToAst } from "@/lib/ast/tiptapAst";
import { technicalDocumentFixture } from "@/test/fixtures/technicalDocument.fixture";

describe("renderAstToMarkdown", () => {
  it("renders a technical AST fixture into readable markdown", () => {
    const ast = serializeTiptapToAst(technicalDocumentFixture, { documentNodeId: "doc_md" });
    const markdown = renderAstToMarkdown(ast);

    expect(markdown).toContain("# System Overview");
    expect(markdown).toContain("```mermaid");
    expect(markdown).toContain("[^fn-1]");
    expect(markdown).toContain("[^fn-1]: Footnote text");
    expect(markdown).toContain("> [!WARNING Review]");
    expect(markdown).toContain("[[toc]]");
    expect(markdown).toMatchSnapshot();
  });

  it("falls back when the editor document cannot be serialized", () => {
    const unsupported: JSONContent = {
      type: "doc",
      content: [{ type: "unsupportedNode" }],
    };

    expect(getRenderableMarkdown(unsupported, "fallback markdown")).toBe("fallback markdown");
  });
});
