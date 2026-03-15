import { describe, expect, it } from "vitest";
import { applyDocumentPatchSet } from "@/lib/ast/applyDocumentPatch";
import { buildComparisonPatchSet, compareDocuments } from "@/lib/ai/compareDocuments";
import { normalizeIngestionRequest } from "@/lib/ingestion/normalizeIngestionRequest";
import type { NormalizedIngestionDocument } from "@/lib/ingestion/contracts";
import type { DocumentAst } from "@/types/documentAst";

const createSourceAst = (): DocumentAst => ({
  blocks: [
    {
      children: [{ type: "text", text: "Overview" }],
      kind: "block",
      level: 1,
      nodeId: "heading-1",
      type: "heading",
    },
    {
      children: [{ type: "text", text: "Legacy authentication overview." }],
      kind: "block",
      nodeId: "paragraph-1",
      type: "paragraph",
    },
    {
      children: [{ type: "text", text: "Recovery" }],
      kind: "block",
      level: 2,
      nodeId: "heading-2",
      type: "heading",
    },
    {
      children: [{ type: "text", text: "Reset API token and rotate credentials." }],
      kind: "block",
      nodeId: "paragraph-2",
      type: "paragraph",
    },
    {
      children: [{ type: "text", text: "Operations" }],
      kind: "block",
      level: 2,
      nodeId: "heading-3",
      type: "heading",
    },
    {
      children: [{ type: "text", text: "Disable the legacy v1 webhook integration." }],
      kind: "block",
      nodeId: "paragraph-3",
      type: "paragraph",
    },
    {
      children: [{ type: "text", text: "Legacy" }],
      kind: "block",
      level: 2,
      nodeId: "heading-4",
      type: "heading",
    },
    {
      children: [{ type: "text", text: "This section will be removed." }],
      kind: "block",
      nodeId: "paragraph-4",
      type: "paragraph",
    },
  ],
  nodeId: "doc-source",
  type: "document",
});

const sourceDocument = normalizeIngestionRequest({
  fileName: "source.md",
  importedAt: 100,
  ingestionId: "src-ing",
  rawContent: [
    "# Overview",
    "",
    "Legacy authentication overview.",
    "",
    "## Recovery",
    "",
    "Reset API token and rotate credentials.",
    "",
    "## Operations",
    "",
    "Disable the legacy v1 webhook integration.",
    "",
    "## Legacy",
    "",
    "This section will be removed.",
  ].join("\n"),
  sourceFormat: "markdown",
});

const targetDocument = normalizeIngestionRequest({
  fileName: "target.md",
  importedAt: 200,
  ingestionId: "tgt-ing",
  rawContent: [
    "# Overview",
    "",
    "Updated authentication overview with deployment notes.",
    "",
    "## Recovery",
    "",
    "Reset API token, rotate credentials, and notify security.",
    "",
    "## Operations",
    "",
    "Provision SCIM and identity federation for the new control plane.",
    "",
    "## Audit",
    "",
    "Enable audit logging and validate retention alerts.",
  ].join("\n"),
  sourceFormat: "markdown",
});

describe("compareDocuments", () => {
  it("distinguishes added, removed, changed, and inconsistent deltas", () => {
    const result = compareDocuments(sourceDocument, targetDocument);

    expect(result.counts).toEqual({
      added: 1,
      changed: 2,
      inconsistent: 1,
      removed: 1,
    });
    expect(result.deltas.map((delta) => delta.kind)).toEqual([
      "changed",
      "changed",
      "inconsistent",
      "removed",
      "added",
    ]);
  });

  it("maps comparison deltas into an applyable patch set where headings exist", () => {
    const comparison = compareDocuments(sourceDocument, targetDocument);
    const patchBuild = buildComparisonPatchSet(comparison, createSourceAst(), targetDocument, {
      documentId: "doc-editor-1",
      patchSetId: "cmp-set-1",
    });

    expect(patchBuild.unmappedDeltaIds).toEqual([]);
    expect(patchBuild.patchSet.patches).toEqual(expect.arrayContaining([
      expect.objectContaining({
        operation: "delete_node",
        title: "Remove section: Legacy",
      }),
      expect.objectContaining({
        operation: "insert_after",
        title: "Add section: Audit",
      }),
    ]));

    const acceptedPatchSet = {
      ...patchBuild.patchSet,
      patches: patchBuild.patchSet.patches.map((patch) => ({ ...patch, status: "accepted" as const })),
    };
    const applied = applyDocumentPatchSet(createSourceAst(), acceptedPatchSet);

    expect(applied.failures).toEqual([]);
    expect(applied.document.blocks.some((block) => block.nodeId === "heading-4")).toBe(false);
    expect(applied.document.blocks.some((block) => block.nodeId === "cmp-005-audit-heading")).toBe(true);
  });

  it("tolerates malformed section path entries without throwing", () => {
    const malformedSource: NormalizedIngestionDocument = {
      chunks: [{
        chunkId: "chunk-1",
        order: 0,
        sectionId: "section-1",
        text: "Old text",
        tokenEstimate: 2,
      }],
      fileName: "source.md",
      images: [],
      importedAt: 100,
      ingestionId: "src-malformed",
      metadata: {},
      plainText: "Old text",
      sections: [{
        level: 1,
        path: [undefined as unknown as string, "Audit"],
        sectionId: "section-1",
        text: "Old text",
        title: "Audit",
      }],
      sourceFormat: "markdown",
    };
    const malformedTarget: NormalizedIngestionDocument = {
      ...malformedSource,
      chunks: [{
        chunkId: "chunk-2",
        order: 0,
        sectionId: "section-1",
        text: "New text",
        tokenEstimate: 2,
      }],
      ingestionId: "tgt-malformed",
      plainText: "New text",
      sections: [{
        ...malformedSource.sections[0],
        text: "New text",
      }],
    };

    expect(() => compareDocuments(malformedSource, malformedTarget)).not.toThrow();
    expect(compareDocuments(malformedSource, malformedTarget).deltas).toHaveLength(1);
  });
});
