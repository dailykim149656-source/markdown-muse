import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import { renderAstToLatex } from "@/lib/ast/renderAstToLatex";
import { serializeTiptapToAst } from "@/lib/ast/tiptapAst";
import { technicalDocumentFixture } from "@/test/fixtures/technicalDocument.fixture";

describe("renderAstToLatex", () => {
  it("renders the representative technical document fixture", () => {
    const ast = serializeTiptapToAst(technicalDocumentFixture, { documentNodeId: "doc_fixture" });
    const result = renderAstToLatex(ast);

    expect(result).toContain("\\section{System Overview}");
    expect(result).toContain("Figure~\\ref{fig:system}");
    expect(result).toContain("\\footnote{Footnote text}");
    expect(result).toContain("\\begin{figure}[H]");
    expect(result).toContain("\\label{fig:system}");
    expect(result).toContain("% begin-mermaid");
    expect(result).toContain("\\begin{lstlisting}[language=ts]");
    expect(result).toMatchSnapshot();
  });

  it("can wrap the output in a full LaTeX document", () => {
    const ast = serializeTiptapToAst(technicalDocumentFixture, { documentNodeId: "doc_fixture" });
    const result = renderAstToLatex(ast, { includeWrapper: true, title: "System Overview" });

    expect(result).toContain("\\documentclass[11pt]{article}");
    expect(result).toContain("\\begin{document}");
    expect(result).toContain("\\maketitle");
    expect(result).toContain("\\end{document}");
  });

  it("renders font family and font size marks into LaTeX source", () => {
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
                { type: "textStyle", attrs: { fontFamily: "Inter", fontSize: "18px" } },
              ],
            },
          ],
        },
      ],
    };

    const ast = serializeTiptapToAst(tiptap);
    const result = renderAstToLatex(ast, { includeWrapper: true });

    expect(result).toContain("\\docsyfontfamily{Inter}{\\docsyfontsize{18px}{13.5pt}{Styled}}");
    expect(result).toContain("\\newcommand{\\docsyfontfamily}[2]");
    expect(result).toContain("\\newcommand{\\docsyfontsize}[3]");
    expect(result).toContain("% !TeX program = xelatex");
    expect(result).toContain("\\usepackage{fontspec}");
    expect(result).toContain("\\usepackage{xeCJK}");
    expect(result).toContain("\\usepackage{etoolbox}");
    expect(result).toContain("\\ifdefstrequal{#1}{Nanum Gothic}{\\def\\docsyresolvedfont{NanumGothic}}{}");
  });
});
