import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { renderAstToLatex } from "@/lib/ast/renderAstToLatex";
import { htmlToLatex } from "@/components/editor/utils/htmlToLatex";
import type { DocumentAst } from "@/types/documentAst";
import { assertTexCompilationAllowed, extractRequestedTexPackages, getAllowedTexPackages } from "../../server/modules/tex/security";

const assertAllowedPackages = (packages: string[]) => {
  const allowed = getAllowedTexPackages();
  expect(packages.filter((packageName) => !allowed.has(packageName))).toEqual([]);
};

describe("tex generated package allowlist", () => {
  it("covers packages emitted by representative html exports", () => {
    const baseLatex = htmlToLatex("<p>Plain text</p>", true);
    const richLatex = htmlToLatex([
      "<p><mark>Highlight</mark> <u>Underline</u> <s>Strike</s> <span style=\"font-family: Inter\">Styled</span></p>",
      "<ul data-type=\"taskList\"><li><input type=\"checkbox\" checked /><span>Task item</span></li></ul>",
      "<pre><code class=\"language-ts\">const answer = 42;</code></pre>",
      "<div data-type=\"admonition\" data-admonition-type=\"note\" title=\"Note\">Admonition body</div>",
      "<img src=\"figure.png\" alt=\"Figure\" />",
      "<table><tr><th>Head</th></tr><tr><td>Cell</td></tr></table>",
    ].join(""), true);

    const packages = Array.from(new Set([
      ...extractRequestedTexPackages(baseLatex),
      ...extractRequestedTexPackages(richLatex),
    ])).sort();

    expect(packages).toEqual(expect.arrayContaining([
      "amsmath",
      "amssymb",
      "array",
      "booktabs",
      "caption",
      "enumitem",
      "etoolbox",
      "float",
      "fontspec",
      "graphicx",
      "hyperref",
      "inputenc",
      "listings",
      "soul",
      "tcolorbox",
      "ulem",
      "xcolor",
      "xeCJK",
    ]));
    assertAllowedPackages(packages);
  });

  it("covers packages emitted by representative AST exports", () => {
    const document: DocumentAst = {
      type: "document",
      nodeId: "doc_generated_packages",
      blocks: [
        {
          kind: "block",
          nodeId: "paragraph_styled",
          type: "paragraph",
          children: [
            {
              type: "text",
              text: "Styled",
              marks: [
                { type: "highlight" },
                { type: "underline" },
                { type: "strike" },
                { type: "text_style", color: "#112233", fontFamily: "Inter", fontSize: "18px" },
              ],
            },
          ],
        },
        {
          kind: "block",
          nodeId: "code_block",
          type: "code_block",
          language: "ts",
          code: "const answer = 42;",
        },
        {
          kind: "block",
          nodeId: "task_list",
          type: "task_list",
          items: [
            {
              kind: "block",
              nodeId: "task_item",
              type: "task_list_item",
              checked: true,
              blocks: [
                {
                  kind: "block",
                  nodeId: "task_text",
                  type: "paragraph",
                  children: [{ type: "text", text: "Checklist item" }],
                },
              ],
            },
          ],
        },
        {
          kind: "block",
          nodeId: "figure_image",
          type: "image",
          src: "figure.png",
          alt: "Figure",
        },
        {
          kind: "block",
          nodeId: "figure_caption",
          type: "figure_caption",
          captionType: "figure",
          targetNodeId: "figure_image",
          children: [{ type: "text", text: "Figure caption" }],
        },
        {
          kind: "block",
          nodeId: "table_block",
          type: "table",
          rows: [
            {
              nodeId: "table_row_1",
              type: "table_row",
              cells: [
                {
                  nodeId: "table_cell_1",
                  type: "table_cell",
                  role: "header",
                  blocks: [
                    {
                      kind: "block",
                      nodeId: "table_header_text",
                      type: "paragraph",
                      children: [{ type: "text", text: "Head" }],
                    },
                  ],
                },
              ],
            },
            {
              nodeId: "table_row_2",
              type: "table_row",
              cells: [
                {
                  nodeId: "table_cell_2",
                  type: "table_cell",
                  role: "body",
                  blocks: [
                    {
                      kind: "block",
                      nodeId: "table_body_text",
                      type: "paragraph",
                      children: [{ type: "text", text: "Cell" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          kind: "block",
          nodeId: "admonition_block",
          type: "admonition",
          admonitionType: "note",
          title: "Note",
          blocks: [
            {
              kind: "block",
              nodeId: "admonition_text",
              type: "paragraph",
              children: [{ type: "text", text: "Body" }],
            },
          ],
        },
      ],
    };

    const latex = renderAstToLatex(document, { includeWrapper: true });
    const packages = extractRequestedTexPackages(latex);

    expect(packages).toEqual(expect.arrayContaining([
      "amsmath",
      "amssymb",
      "array",
      "booktabs",
      "enumitem",
      "etoolbox",
      "float",
      "fontspec",
      "graphicx",
      "hyperref",
      "listings",
      "soul",
      "tcolorbox",
      "ulem",
      "xcolor",
      "xeCJK",
    ]));
    assertAllowedPackages(packages);
  });

  it("covers packages used by the TeX compiler wrapper", () => {
    const compilerSource = readFileSync(
      resolve(process.cwd(), "server/modules/tex/compiler.ts"),
      "utf8",
    );
    const compilerPackages = Array.from(
      compilerSource.matchAll(/\\\\usepackage(?:\[[^\]]*\])?\{([^}]+)\}/g),
      (match) => match[1].trim(),
    );

    expect(compilerPackages).toEqual(expect.arrayContaining([
      "amsmath",
      "amssymb",
      "enumitem",
      "fontspec",
      "graphicx",
      "hyperref",
      "xeCJK",
    ]));
    assertAllowedPackages(compilerPackages);
  });

  it("accepts representative raw LaTeX with fullpage when all packages are allowed", () => {
    const latex = [
      "\\documentclass{article}",
      "\\usepackage{fullpage}",
      "\\begin{document}",
      "Hello",
      "\\end{document}",
    ].join("\n");

    expect(() => assertTexCompilationAllowed({
      env: {
        TEX_ALLOW_ALL_PACKAGES: "true",
        TEX_ALLOW_RAW_DOCUMENT: "true",
        TEX_ALLOW_RESTRICTED_COMMANDS: "false",
      },
      latex,
      sourceType: "raw-latex",
    })).not.toThrow();
  });
});
