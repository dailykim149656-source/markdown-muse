import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/core";
import { hydrateAstToTiptap, normalizeAstForComparison, serializeTiptapToAst } from "@/lib/ast/tiptapAst";
import { technicalDocumentFixture } from "@/test/fixtures/technicalDocument.fixture";

describe("TipTap <-> AST", () => {
  it("serializes a technical document fixture", () => {
    const ast = serializeTiptapToAst(technicalDocumentFixture, { documentNodeId: "doc_fixture" });

    expect(ast.type).toBe("document");
    expect(ast.nodeId).toBe("doc_fixture");
    expect(ast.blocks[0].type).toBe("heading");
    expect(ast.blocks[1].type).toBe("paragraph");
    expect(ast.blocks[2].type).toBe("admonition");
    expect(ast.blocks[6].type).toBe("mermaid_block");
    expect(ast.blocks[7].type).toBe("math_block");
    expect(ast.blocks[8].type).toBe("image");
    expect(ast.blocks[9].type).toBe("figure_caption");
    expect(ast.blocks[10].type).toBe("table_of_contents");
    expect(ast.blocks[11].type).toBe("table");
    expect(ast.blocks[13].type).toBe("footnote_item");

    const paragraph = ast.blocks[1];
    expect(paragraph.type).toBe("paragraph");
    if (paragraph.type === "paragraph") {
      expect(paragraph.children[1].type).toBe("cross_reference");
      expect(paragraph.children[3].type).toBe("text");
      expect(paragraph.children[5].type).toBe("math_inline");
    }
  });

  it("hydrates AST back into TipTap JSON", () => {
    const ast = serializeTiptapToAst(technicalDocumentFixture);
    const tiptap = hydrateAstToTiptap(ast);

    expect(tiptap.type).toBe("doc");
    expect(tiptap.content?.[0]?.type).toBe("heading");
    expect(tiptap.content?.[2]?.type).toBe("admonition");
    expect(tiptap.content?.[6]?.type).toBe("mermaidBlock");
    expect(tiptap.content?.[7]?.type).toBe("mathBlock");
    expect(tiptap.content?.[8]?.type).toBe("image");
    expect(tiptap.content?.[9]?.type).toBe("figureCaption");
    expect(tiptap.content?.[10]?.type).toBe("tableOfContents");
    expect(tiptap.content?.[11]?.type).toBe("table");
    expect(tiptap.content?.[13]?.type).toBe("footnoteItem");
    expect(tiptap.content?.[0]?.attrs?.nodeId).toBe(ast.blocks[0].nodeId);
    expect(tiptap.content?.[2]?.attrs?.nodeId).toBe(ast.blocks[2].nodeId);
  });

  it("round-trips structure without losing supported semantics", () => {
    const ast = serializeTiptapToAst(technicalDocumentFixture, { documentNodeId: "doc_rt" });
    const hydrated = hydrateAstToTiptap(ast);
    const restoredAst = serializeTiptapToAst(hydrated, { documentNodeId: "doc_rt_2" });

    expect(normalizeAstForComparison(restoredAst)).toEqual(normalizeAstForComparison(ast));
  });

  it("preserves rich text marks in AST", () => {
    const tiptap: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Styled",
              marks: [
                { type: "bold" },
                { type: "underline" },
                { type: "textStyle", attrs: { color: "#ff0000", fontFamily: "Inter", fontSize: "18px" } },
              ],
            },
          ],
        },
      ],
    };

    const ast = serializeTiptapToAst(tiptap);
    const paragraph = ast.blocks[0];

    expect(paragraph.type).toBe("paragraph");
    if (paragraph.type === "paragraph") {
      const textNode = paragraph.children[0];
      expect(textNode.type).toBe("text");
      if (textNode.type === "text") {
        expect(textNode.marks).toEqual([
          { type: "bold" },
          { type: "underline" },
          { type: "text_style", color: "#ff0000", fontFamily: "Inter", fontSize: "18px" },
        ]);
      }
    }
  });

  it("throws on unsupported node types by default", () => {
    const unsupported: JSONContent = {
      type: "doc",
      content: [{ type: "unsupportedNode" }],
    };

    expect(() => serializeTiptapToAst(unsupported)).toThrow(/Unsupported block node type/);
  });
});
