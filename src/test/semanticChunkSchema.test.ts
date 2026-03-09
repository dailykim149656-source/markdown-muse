import { describe, expect, it } from "vitest";
import { normalizeIngestionRequest } from "@/lib/ingestion/normalizeIngestionRequest";
import { buildSemanticChunkRecords } from "@/lib/retrieval/semanticChunkSchema";

describe("buildSemanticChunkRecords", () => {
  it("creates stable embedding-ready chunk records", () => {
    const document = normalizeIngestionRequest({
      fileName: "runbook.md",
      importedAt: 100,
      ingestionId: "ing-1",
      rawContent: [
        "---",
        'title: "Operations Runbook"',
        "authors:",
        "  - Alice",
        "tags:",
        "  - ops",
        "---",
        "",
        "# Recovery",
        "",
        "Reset API token and rotate credentials.",
        "",
        "## Audit",
        "",
        "Enable audit logging and validate retention alerts.",
      ].join("\n"),
      sourceFormat: "markdown",
    });

    const records = buildSemanticChunkRecords(document);
    const repeated = buildSemanticChunkRecords(document);

    expect(records).toHaveLength(document.chunks.length);
    expect(records[0]).toEqual(expect.objectContaining({
      documentId: "ing-1",
      hierarchy: expect.objectContaining({
        sectionPath: ["Recovery"],
        sectionTitle: "Recovery",
      }),
      metadata: expect.objectContaining({
        fileName: "runbook.md",
        sourceFormat: "markdown",
        title: "Operations Runbook",
      }),
      semanticChunkId: expect.any(String),
      textBoundary: {
        endOffset: records[0].text.length,
        startOffset: 0,
      },
    }));
    expect(repeated).toEqual(records);
    expect(records[1].textBoundary.startOffset).toBeGreaterThan(records[0].textBoundary.endOffset);
  });
});
