import { describe, expect, it } from "vitest";
import { serializeTiptapToAst } from "@/lib/ast/tiptapAst";
import { renderAstToHtml } from "@/lib/ast/renderAstToHtml";
import { technicalDocumentFixture } from "@/test/fixtures/technicalDocument.fixture";
import { htmlToLatex } from "@/components/editor/utils/htmlToLatex";
import { htmlToTypst } from "@/components/editor/utils/htmlToTypst";

describe("renderAstToHtml", () => {
  it("renders a technical AST fixture into exporter-compatible HTML", () => {
    const ast = serializeTiptapToAst(technicalDocumentFixture, { documentNodeId: "doc_render" });
    const html = renderAstToHtml(ast);

    expect(html).toContain('data-type="admonition"');
    expect(html).toContain('data-type="cross-ref"');
    expect(html).toContain('data-type="mermaid"');
    expect(html).toContain('data-type="mathBlock"');
    expect(html).toContain('data-type="figure-caption"');
    expect(html).toContain('data-type="footnote-ref"');
    expect(html).toContain('data-type="footnote-item"');
    expect(html).toContain('data-max-depth="3"');
    expect(html).toContain('data-node-id="');
    expect(html).toMatchSnapshot();
  });

  it("feeds existing export converters without relying on editor DOM", () => {
    const ast = serializeTiptapToAst(technicalDocumentFixture, { documentNodeId: "doc_render" });
    const html = renderAstToHtml(ast);
    const latex = htmlToLatex(html, false);
    const typst = htmlToTypst(html);

    expect(latex).toContain("% begin-mermaid");
    expect(latex).toContain("\\footnote{Footnote text}");
    expect(typst).toContain("#admonition(");
    expect(typst).toContain("#footnote[Footnote text]");
  });
});
