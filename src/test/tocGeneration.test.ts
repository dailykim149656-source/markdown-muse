import { describe, expect, it } from "vitest";
import {
  analyzeTocSuggestion,
  buildTocPatchSetWithAst,
} from "@/lib/ai/tocGeneration";
import type { GenerateTocEntry } from "@/types/aiAssistant";
import type { DocumentAst } from "@/types/documentAst";

const textNode = (text: string) => ({ text, type: "text" as const });

const tocEntry = (
  title: string,
  level: 1 | 2 | 3,
  anchorStrategy: GenerateTocEntry["anchorStrategy"],
  anchorText: string,
): GenerateTocEntry => ({
  anchorStrategy,
  anchorText,
  level,
  title,
});

const createAst = ({
  headingTexts = [],
  paragraphTexts = [],
  tocDepths = [],
}: {
  headingTexts?: string[];
  paragraphTexts?: string[];
  tocDepths?: Array<1 | 2 | 3>;
} = {}): DocumentAst => ({
  type: "document",
  nodeId: "doc-1",
  blocks: [
    ...tocDepths.map((depth, index) => ({
      kind: "block" as const,
      maxDepth: depth,
      nodeId: `toc-${index + 1}`,
      type: "table_of_contents" as const,
    })),
    ...headingTexts.map((text, index) => ({
      children: [textNode(text)],
      kind: "block" as const,
      level: index === 0 ? 1 as const : 2 as const,
      nodeId: `heading-${index + 1}`,
      type: "heading" as const,
    })),
    ...paragraphTexts.map((text, index) => ({
      children: [textNode(text)],
      kind: "block" as const,
      nodeId: `paragraph-${index + 1}`,
      type: "paragraph" as const,
    })),
  ],
});

describe("tocGeneration", () => {
  it("reuses existing headings and inserts a TOC when no placeholder exists", () => {
    const ast = createAst({ headingTexts: ["Overview", "Setup"] });
    const analysis = analyzeTocSuggestion(ast, [
      tocEntry("Overview", 1, "existing_heading", "Overview"),
      tocEntry("Setup", 2, "existing_heading", "Setup"),
    ], 2);
    const patchSet = buildTocPatchSetWithAst(ast, {
      analysis,
      documentId: "doc-1",
      maxDepth: 2,
      patchSetId: "toc-patch",
      rationale: "Insert a TOC before the current headings.",
    });

    expect(analysis.matchedCount).toBe(2);
    expect(analysis.promotedCount).toBe(0);
    expect(patchSet.patches).toHaveLength(1);
    expect(patchSet.patches[0]).toEqual(expect.objectContaining({
      operation: "insert_before",
      target: {
        nodeId: "heading-1",
        targetType: "node",
      },
      title: "Insert table of contents (depth 2)",
    }));
  });

  it("promotes paragraphs to headings and inserts the TOC before the earliest promoted block", () => {
    const ast = createAst({
      paragraphTexts: [
        "Project background",
        "Project goal",
        "Implementation details",
      ],
    });
    const analysis = analyzeTocSuggestion(ast, [
      tocEntry("프로젝트 배경", 1, "promote_block", "Project background"),
      tocEntry("프로젝트 목표", 2, "promote_block", "Project goal"),
    ], 2);
    const patchSet = buildTocPatchSetWithAst(ast, {
      analysis,
      documentId: "doc-1",
      maxDepth: 2,
      patchSetId: "toc-promote",
      rationale: "Promote top-level blocks before inserting the TOC.",
    });

    expect(analysis.matchedCount).toBe(0);
    expect(analysis.promotedCount).toBe(2);
    expect(patchSet.patches.map((patch) => patch.operation)).toEqual([
      "replace_node",
      "replace_node",
      "insert_before",
    ]);
    expect(patchSet.patches[0]).toEqual(expect.objectContaining({
      target: { nodeId: "paragraph-1", targetType: "node" },
      title: "Promote block to heading: 프로젝트 배경",
    }));
    expect(patchSet.patches[2]).toEqual(expect.objectContaining({
      target: { nodeId: "paragraph-1", targetType: "node" },
    }));
  });

  it("skips partial anchor matches and reports that no safe targets were found", () => {
    const ast = createAst({
      paragraphTexts: ["Project background overview"],
    });
    const analysis = analyzeTocSuggestion(ast, [
      tocEntry("Project background", 1, "promote_block", "Project background"),
    ], 2);
    const patchSet = buildTocPatchSetWithAst(ast, {
      analysis,
      documentId: "doc-1",
      maxDepth: 2,
      patchSetId: "toc-partial",
      rationale: "Avoid unsafe partial anchor promotions.",
    });

    expect(analysis.conflicts).toContain("partial_anchor_match");
    expect(analysis.conflicts).toContain("no_promotable_targets");
    expect(analysis.skippedEntries).toEqual([
      expect.objectContaining({
        reason: "partial_match_only",
        title: "Project background",
      }),
    ]);
    expect(patchSet.patches).toHaveLength(0);
  });

  it("returns no patch when nothing can be anchored safely", () => {
    const ast = createAst({ paragraphTexts: ["Overview body only"] });
    const analysis = analyzeTocSuggestion(ast, [
      tocEntry("Missing section", 1, "unmatched", ""),
    ], 2);
    const patchSet = buildTocPatchSetWithAst(ast, {
      analysis,
      documentId: "doc-1",
      maxDepth: 2,
      patchSetId: "toc-empty",
      rationale: "No safe heading anchors are available.",
    });

    expect(analysis.conflicts).toContain("no_promotable_targets");
    expect(analysis.skippedEntries).toHaveLength(1);
    expect(patchSet.patches).toHaveLength(0);
  });

  it("replaces the primary TOC and removes duplicate placeholders", () => {
    const ast = createAst({
      headingTexts: ["Overview"],
      tocDepths: [2, 3],
    });
    const analysis = analyzeTocSuggestion(ast, [
      tocEntry("Overview", 1, "existing_heading", "Overview"),
    ], 1);
    const patchSet = buildTocPatchSetWithAst(ast, {
      analysis,
      documentId: "doc-1",
      maxDepth: 1,
      patchSetId: "toc-duplicate",
      rationale: "Keep a single TOC placeholder at the requested depth.",
    });

    expect(analysis.conflicts).toContain("duplicate_toc_placeholders");
    expect(patchSet.patches).toEqual([
      expect.objectContaining({
        operation: "replace_node",
        target: { nodeId: "toc-1", targetType: "node" },
      }),
      expect.objectContaining({
        operation: "delete_node",
        target: { nodeId: "toc-2", targetType: "node" },
      }),
    ]);
  });
});
