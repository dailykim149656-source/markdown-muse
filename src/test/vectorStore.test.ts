import { describe, expect, it } from "vitest";
import { normalizeIngestionRequest } from "@/lib/ingestion/normalizeIngestionRequest";
import { buildSemanticChunkRecords } from "@/lib/retrieval/semanticChunkSchema";
import { InMemoryVectorStore } from "@/lib/retrieval/vectorStore";

describe("InMemoryVectorStore", () => {
  it("indexes and queries semantic chunks deterministically", () => {
    const document = normalizeIngestionRequest({
      fileName: "runbook.md",
      importedAt: 100,
      ingestionId: "ing-1",
      rawContent: [
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
    const chunks = buildSemanticChunkRecords(document);
    const store = new InMemoryVectorStore();

    store.upsert([
      { chunk: chunks[0], embedding: [1, 0, 0] },
      { chunk: chunks[1], embedding: [0.1, 0.9, 0] },
    ]);

    const result = store.query({
      embedding: [1, 0, 0],
      limit: 1,
    });

    expect(store.size()).toBe(2);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(expect.objectContaining({
      record: expect.objectContaining({
        chunk: expect.objectContaining({
          chunkId: chunks[0].chunkId,
          documentId: "ing-1",
          metadata: expect.objectContaining({
            fileName: "runbook.md",
            sourceFormat: "markdown",
          }),
        }),
      }),
    }));
  });
});
