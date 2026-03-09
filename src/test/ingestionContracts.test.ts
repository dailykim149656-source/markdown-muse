import { describe, expect, it } from "vitest";
import { createEmptyIngestionDocument } from "@/lib/ingestion/contracts";

describe("createEmptyIngestionDocument", () => {
  it("creates an empty normalized ingestion envelope", () => {
    const normalized = createEmptyIngestionDocument({
      ingestionId: "ing-1",
      fileName: "spec.md",
      sourceFormat: "markdown",
      rawContent: "# Title",
      importedAt: 123456789,
    });

    expect(normalized).toEqual({
      ingestionId: "ing-1",
      fileName: "spec.md",
      sourceFormat: "markdown",
      plainText: "",
      metadata: {},
      sections: [],
      chunks: [],
      importedAt: 123456789,
    });
  });
});
