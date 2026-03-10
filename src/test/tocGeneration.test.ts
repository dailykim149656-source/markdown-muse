import { describe, expect, it } from "vitest";
import {
  analyzeTocSuggestion,
  buildTocPatchSetWithAst,
} from "@/lib/ai/tocGeneration";
import type { DocumentAst } from "@/types/documentAst";

const createAst = (withExistingToc = false): DocumentAst => ({
  type: "document",
  nodeId: "doc-1",
  blocks: [
    ...(withExistingToc
      ? [{
        kind: "block" as const,
        maxDepth: 2 as const,
        nodeId: "toc-1",
        type: "table_of_contents" as const,
      }]
      : []),
    {
      children: [{ text: "Overview", type: "text" as const }],
      kind: "block" as const,
      level: 1 as const,
      nodeId: "heading-1",
      type: "heading" as const,
    },
    {
      children: [{ text: "Setup", type: "text" as const }],
      kind: "block" as const,
      level: 2 as const,
      nodeId: "heading-2",
      type: "heading" as const,
    },
  ],
});

describe("tocGeneration", () => {
  it("flags a conflict when suggested entries do not match headings", () => {
    const analysis = analyzeTocSuggestion(createAst(), [
      { level: 1, title: "Overview" },
      { level: 2, title: "Missing section" },
    ], 2);

    expect(analysis.conflicts).toContain("non_matching_titles");
    expect(analysis.existingTocNode).toBeNull();
  });

  it("builds an insert patch when no TOC placeholder exists", () => {
    const ast = createAst();
    const analysis = analyzeTocSuggestion(ast, [
      { level: 1, title: "Overview" },
      { level: 2, title: "Setup" },
    ], 2);
    const patchSet = buildTocPatchSetWithAst(ast, {
      analysis,
      documentId: "doc-1",
      maxDepth: 2,
      patchSetId: "toc-patch",
      rationale: "Add a TOC placeholder.",
    });

    expect(patchSet.patches).toHaveLength(1);
    expect(patchSet.patches[0]?.operation).toBe("insert_before");
    expect(patchSet.patches[0]?.target).toEqual({
      nodeId: "heading-1",
      targetType: "node",
    });
  });

  it("builds a replace patch when a TOC placeholder already exists", () => {
    const ast = createAst(true);
    const analysis = analyzeTocSuggestion(ast, [
      { level: 1, title: "Overview" },
      { level: 2, title: "Setup" },
    ], 3);
    const patchSet = buildTocPatchSetWithAst(ast, {
      analysis,
      documentId: "doc-1",
      maxDepth: 3,
      patchSetId: "toc-patch",
      rationale: "Increase TOC depth.",
    });

    expect(patchSet.patches).toHaveLength(1);
    expect(patchSet.patches[0]?.operation).toBe("replace_node");
    expect(patchSet.patches[0]?.target).toEqual({
      nodeId: "toc-1",
      targetType: "node",
    });
  });
});
