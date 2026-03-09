import { describe, expect, it } from "vitest";
import { serializeTiptapToAst } from "@/lib/ast/tiptapAst";
import { validateDocumentAst } from "@/lib/ast/validateDocumentAst";
import type { DocumentAst } from "@/types/documentAst";
import { technicalDocumentFixture } from "@/test/fixtures/technicalDocument.fixture";

const createValidFixtureAst = (): DocumentAst => serializeTiptapToAst(technicalDocumentFixture, { documentNodeId: "doc-valid" });

describe("validateDocumentAst", () => {
  it("accepts the representative technical document fixture", () => {
    const result = validateDocumentAst(createValidFixtureAst());

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("reports duplicate node ids and invalid local node shapes", () => {
    const document: DocumentAst = {
      type: "document",
      nodeId: "doc-invalid",
      blocks: [
        {
          type: "heading",
          kind: "block",
          nodeId: "dup-node",
          level: 4 as 1,
          children: [{ type: "text", text: "Heading" }],
        },
        {
          type: "image",
          kind: "block",
          nodeId: "dup-node",
          src: "",
        },
        {
          type: "math_block",
          kind: "block",
          nodeId: "math-1",
          latex: "",
        },
        {
          type: "mermaid_block",
          kind: "block",
          nodeId: "mermaid-1",
          code: "",
        },
        {
          type: "table",
          kind: "block",
          nodeId: "table-1",
          rows: [
            {
              type: "table_row",
              nodeId: "row-1",
              cells: [],
            },
          ],
        },
      ],
    };

    const result = validateDocumentAst(document);

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "invalid_heading_level",
        "duplicate_node_id",
        "missing_image_src",
        "empty_math_latex",
        "empty_mermaid_code",
        "empty_table_row",
      ]),
    );
  });

  it("reports unresolved cross references and footnote consistency issues", () => {
    const document: DocumentAst = {
      type: "document",
      nodeId: "doc-refs",
      blocks: [
        {
          type: "paragraph",
          kind: "block",
          nodeId: "para-1",
          children: [
            {
              type: "cross_reference",
              kind: "inline",
              nodeId: "xref-1",
              targetLabel: "fig:missing",
              targetNodeId: "missing-node",
            },
            {
              type: "footnote_ref",
              kind: "inline",
              nodeId: "fn-ref-1",
              footnoteId: "fn-1",
            },
          ],
        },
        {
          type: "footnote_item",
          kind: "block",
          nodeId: "fn-item-1",
          footnoteId: "fn-2",
          children: [{ type: "text", text: "Unused footnote" }],
        },
      ],
    };

    const result = validateDocumentAst(document);

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "unresolved_cross_reference_target",
        "invalid_footnote_resolution",
      ]),
    );
    expect(result.warnings.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "footnote_ref_without_item",
        "footnote_item_without_ref",
      ]),
    );
  });

  it("reports duplicate caption labels and unresolved label-based references as warnings", () => {
    const document: DocumentAst = {
      type: "document",
      nodeId: "doc-labels",
      blocks: [
        {
          type: "figure_caption",
          kind: "block",
          nodeId: "caption-1",
          captionType: "figure",
          label: "fig:dup",
          children: [{ type: "text", text: "Figure one" }],
        },
        {
          type: "figure_caption",
          kind: "block",
          nodeId: "caption-2",
          captionType: "figure",
          label: "fig:dup",
          children: [{ type: "text", text: "Figure two" }],
        },
        {
          type: "paragraph",
          kind: "block",
          nodeId: "para-1",
          children: [
            {
              type: "cross_reference",
              kind: "inline",
              nodeId: "xref-1",
              targetLabel: "fig:missing",
            },
          ],
        },
      ],
    };

    const result = validateDocumentAst(document);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "duplicate_figure_caption_label",
        "unresolved_cross_reference_label",
      ]),
    );
  });
});
