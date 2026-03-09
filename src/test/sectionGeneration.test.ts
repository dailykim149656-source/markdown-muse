import { describe, expect, it } from "vitest";
import { applyDocumentPatchSet } from "@/lib/ast/applyDocumentPatch";
import { buildSectionGenerationPatchSet } from "@/lib/ai/sectionGeneration";
import type { DocumentAst } from "@/types/documentAst";

const createAst = (): DocumentAst => ({
  blocks: [
    {
      children: [{ type: "text", text: "Overview" }],
      kind: "block",
      level: 1,
      nodeId: "heading-1",
      type: "heading",
    },
    {
      children: [{ type: "text", text: "Current overview." }],
      kind: "block",
      nodeId: "paragraph-1",
      type: "paragraph",
    },
  ],
  nodeId: "doc-1",
  type: "document",
});

describe("buildSectionGenerationPatchSet", () => {
  it("creates a reviewable section insertion patch", () => {
    const patchSet = buildSectionGenerationPatchSet({
      anchorNodeId: "paragraph-1",
      body: "Enable audit logging.\n\nValidate retention alerts.",
      documentId: "doc-1",
      patchSetId: "gen-1",
      sectionTitle: "Audit",
    });

    const applied = applyDocumentPatchSet(createAst(), {
      ...patchSet,
      patches: patchSet.patches.map((patch) => ({ ...patch, status: "accepted" as const })),
    });

    expect(applied.failures).toEqual([]);
    expect(applied.document.blocks.some((block) => block.nodeId === "gen-1-generated-heading")).toBe(true);
  });
});
