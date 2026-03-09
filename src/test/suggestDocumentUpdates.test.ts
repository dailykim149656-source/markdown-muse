import { describe, expect, it } from "vitest";
import { suggestDocumentUpdates } from "@/lib/ai/suggestDocumentUpdates";
import { normalizeIngestionRequest } from "@/lib/ingestion/normalizeIngestionRequest";
import type { DocumentAst } from "@/types/documentAst";

const sourceDocument = normalizeIngestionRequest({
  fileName: "source.md",
  importedAt: 100,
  ingestionId: "src-ing",
  rawContent: [
    "# Recovery",
    "",
    "Reset API token and rotate credentials.",
  ].join("\n"),
  sourceFormat: "markdown",
});

const targetDocument = normalizeIngestionRequest({
  fileName: "target.md",
  importedAt: 200,
  ingestionId: "tgt-ing",
  rawContent: [
    "# Recovery",
    "",
    "Reset API token, rotate credentials, and notify security.",
    "",
    "## Audit",
    "",
    "Enable audit logging.",
  ].join("\n"),
  sourceFormat: "markdown",
});

const sourceAst: DocumentAst = {
  blocks: [
    {
      children: [{ type: "text", text: "Recovery" }],
      kind: "block",
      level: 1,
      nodeId: "heading-1",
      type: "heading",
    },
    {
      children: [{ type: "text", text: "Reset API token and rotate credentials." }],
      kind: "block",
      nodeId: "paragraph-1",
      type: "paragraph",
    },
  ],
  nodeId: "doc-1",
  type: "document",
};

describe("suggestDocumentUpdates", () => {
  it("returns explicit reviewable patches instead of mutating the document", () => {
    const result = suggestDocumentUpdates(sourceDocument, targetDocument, sourceAst, {
      documentId: "doc-1",
      patchSetId: "update-1",
    });

    expect(result.comparison.counts).toEqual({
      added: 1,
      changed: 1,
      inconsistent: 0,
      removed: 0,
    });
    expect(result.patchBuild.patchSet.patches.length).toBeGreaterThan(0);
    expect(result.patchBuild.patchSet.patches.every((patch) => patch.status === "pending")).toBe(true);
  });
});
