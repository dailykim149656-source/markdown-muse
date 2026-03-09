import { describe, expect, it } from "vitest";
import { buildSummaryRequestFromMatches, validateSummaryResponse } from "@/lib/ai/summaryContracts";
import { normalizeIngestionRequest } from "@/lib/ingestion/normalizeIngestionRequest";
import { keywordRetrieve } from "@/lib/retrieval/keywordRetrieval";

const documents = [
  normalizeIngestionRequest({
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
    ].join("\n"),
    sourceFormat: "markdown",
  }),
  normalizeIngestionRequest({
    fileName: "api-spec.tex",
    importedAt: 200,
    ingestionId: "ing-2",
    rawContent: [
      "\\title{API Specification}",
      "\\section{Authentication}",
      "Use bearer token authentication.",
    ].join("\n"),
    sourceFormat: "latex",
  }),
];

describe("summaryContracts", () => {
  it("builds a chunk-grounded summary request from retrieval matches", () => {
    const retrieval = keywordRetrieve(documents, { query: "token authentication" });
    const request = buildSummaryRequestFromMatches(
      "Summarize authentication recovery steps",
      retrieval.matches,
      documents,
      { maxWords: 120, requestId: "sum-1", style: "bullets" },
    );

    expect(request).toEqual({
      chunkInputs: expect.arrayContaining([
        expect.objectContaining({
          chunkId: expect.any(String),
          ingestionId: expect.any(String),
          text: expect.stringContaining("token"),
        }),
      ]),
      documents: expect.arrayContaining([
        expect.objectContaining({
          ingestionId: "ing-1",
        }),
        expect.objectContaining({
          ingestionId: "ing-2",
        }),
      ]),
      maxWords: 120,
      objective: "Summarize authentication recovery steps",
      requestId: "sum-1",
      style: "bullets",
    });
  });

  it("validates source attributions against request chunk ids", () => {
    const retrieval = keywordRetrieve(documents, { query: "token authentication" });
    const request = buildSummaryRequestFromMatches(
      "Summarize authentication recovery steps",
      retrieval.matches,
      documents,
      { requestId: "sum-2" },
    );

    const validResponse = validateSummaryResponse(request, {
      attributions: request.chunkInputs.slice(0, 1).map((chunkInput) => ({
        chunkId: chunkInput.chunkId,
        ingestionId: chunkInput.ingestionId,
      })),
      requestId: "sum-2",
      summary: "Authentication relies on bearer tokens and recovery rotates credentials.",
    });
    const invalidResponse = validateSummaryResponse(request, {
      attributions: [{
        chunkId: "unknown-chunk",
        ingestionId: "ing-1",
      }],
      requestId: "sum-2",
      summary: "Invalid response.",
    });

    expect(validResponse).toEqual({ missingChunkReferences: [], valid: true });
    expect(invalidResponse.valid).toBe(false);
    expect(invalidResponse.missingChunkReferences).toEqual(["ing-1:unknown-chunk"]);
  });
});
