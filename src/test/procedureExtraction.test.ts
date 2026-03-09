import { describe, expect, it } from "vitest";
import { extractProcedure } from "@/lib/ai/procedureExtraction";
import { normalizeIngestionRequest } from "@/lib/ingestion/normalizeIngestionRequest";

describe("extractProcedure", () => {
  it("extracts attributable ordered steps from operational documents", () => {
    const document = normalizeIngestionRequest({
      fileName: "recovery-runbook.md",
      importedAt: 100,
      ingestionId: "ing-1",
      rawContent: [
        "# Recovery",
        "",
        "Reset API token. Rotate credentials. Notify security.",
        "",
        "## Audit",
        "",
        "Enable audit logging. Validate retention alerts.",
      ].join("\n"),
      sourceFormat: "markdown",
    });

    const result = extractProcedure([document]);

    expect(result.steps).toEqual([
      expect.objectContaining({ order: 1, text: "Reset API token" }),
      expect.objectContaining({ order: 2, text: "Rotate credentials" }),
      expect.objectContaining({ order: 3, text: "Notify security" }),
      expect.objectContaining({ order: 4, text: "Enable audit logging" }),
      expect.objectContaining({ order: 5, text: "Validate retention alerts" }),
    ]);
    expect(result.steps[0]?.attributions[0]).toEqual({
      chunkId: document.chunks[0].chunkId,
      ingestionId: "ing-1",
      sectionId: document.chunks[0].sectionId,
    });
  });
});
