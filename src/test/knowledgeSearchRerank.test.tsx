import { describe, expect, it } from "vitest";
import type { KnowledgeDocumentRecord } from "@/lib/knowledge/knowledgeIndex";
import { searchKnowledgeRecords } from "@/lib/knowledge/knowledgeIndex";

const createRecord = (
  documentId: string,
  title: string,
  sectionTitle: string,
  chunkText: string,
): KnowledgeDocumentRecord => ({
  contentHash: `${documentId}-hash`,
  documentId,
  fileName: `${documentId}.md`,
  indexStatus: "fresh",
  indexedAt: 1,
  normalizedDocument: {
    chunks: [
      {
        chunkId: `${documentId}-chunk-1`,
        metadata: { sectionTitle },
        text: chunkText,
      },
    ],
    fileName: `${documentId}.md`,
    images: [],
    importedAt: 1,
    ingestionId: documentId,
    metadata: { title },
    plainText: `${sectionTitle} ${chunkText}`,
    sections: [
      {
        sectionId: `${documentId}-section-1`,
        title: sectionTitle,
      },
    ],
    sourceFormat: "markdown",
  },
  rawContent: `# ${title}\n\n## ${sectionTitle}\n\n${chunkText}`,
  schemaVersion: 2,
  sourceFile: {
    fileName: `${documentId}.md`,
    importedAt: 1,
    sourceFormat: "markdown",
    sourceId: documentId,
  },
  sourceFormat: "markdown",
  sourceUpdatedAt: 1,
  updatedAt: 1,
});

describe("knowledge search semantic rerank", () => {
  it("promotes results with stronger title and section alignment", () => {
    const records = [
      createRecord("doc-1", "Authentication Runbook", "Reset auth token", "Steps to rotate the token."),
      createRecord("doc-2", "General Notes", "Incidents", "Authentication token reset runbook for production systems."),
    ];

    const results = searchKnowledgeRecords(records, "auth token reset", 5);

    expect(results[0]?.record.documentId).toBe("doc-1");
    expect(results[0]?.rerankLabel).toBeTruthy();
  });

  it("supports strict keyword mode without semantic assist", () => {
    const records = [
      createRecord("doc-1", "Authentication Reset Runbook", "Token recovery", "Credential rotation checklist."),
      createRecord("doc-2", "General Notes", "Ops", "Auth token reset steps are documented here."),
    ];

    const results = searchKnowledgeRecords(records, "auth token reset", 5, { mode: "keyword" });

    expect(results[0]?.record.documentId).toBe("doc-2");
    expect(results[0]?.rerankLabel).toBeUndefined();
  });
});
