import { describe, expect, it } from "vitest";
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
      "  - auth",
      "docType: sop",
      "---",
      "",
      "# Overview",
      "",
      "Authentication overview and operational notes.",
      "",
      "## Recovery",
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
      "\\author{Bob}",
      "",
      "\\section{Authentication}",
      "Use bearer token authentication.",
      "",
      "\\subsection{Errors}",
      "Unauthorized responses return 401.",
    ].join("\n"),
    sourceFormat: "latex",
  }),
];

describe("keywordRetrieve", () => {
  it("ranks chunks by text and metadata matches", () => {
    const result = keywordRetrieve(documents, {
      query: "authentication token",
    });

    expect(result.terms).toEqual(["authentication", "token"]);
    expect(result.totalMatches).toBeGreaterThan(0);
    expect(result.matches[0]).toEqual(expect.objectContaining({
      documentId: "ing-2",
      matchedTerms: expect.arrayContaining(["authentication", "token"]),
    }));
  });

  it("filters by metadata deterministically", () => {
    const result = keywordRetrieve(documents, {
      filters: {
        documentTypes: ["sop"],
        tags: ["ops"],
      },
      query: "token recovery",
    });

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]).toEqual(expect.objectContaining({
      documentId: "ing-1",
      sourceFormat: "markdown",
    }));
  });

  it("returns an empty result for empty searchable queries", () => {
    const result = keywordRetrieve(documents, {
      query: "a + /",
    });

    expect(result).toEqual({
      matches: [],
      normalizedQuery: "a + /",
      terms: [],
      totalMatches: 0,
    });
  });
});
