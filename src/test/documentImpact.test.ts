import { describe, expect, it } from "vitest";
import type { KnowledgeDocumentRecord } from "@/lib/knowledge/knowledgeIndex";
import {
  buildKnowledgeDocumentImpact,
  buildKnowledgeWorkspaceInsights,
} from "@/lib/knowledge/workspaceInsights";

const createKnowledgeRecord = (
  documentId: string,
  title: string,
  rawContent: string,
): KnowledgeDocumentRecord => ({
  contentHash: `hash-${documentId}`,
  documentId,
  fileName: `${title.toLowerCase().replace(/\s+/g, "-")}.md`,
  indexStatus: "fresh",
  indexedAt: 10,
  normalizedDocument: {
    chunks: [{
      chunkId: `${documentId}-chunk`,
      order: 0,
      sectionId: `${documentId}-section`,
      text: rawContent,
      tokenEstimate: rawContent.length,
    }],
    fileName: `${title.toLowerCase().replace(/\s+/g, "-")}.md`,
    images: [],
    importedAt: 10,
    ingestionId: `ing-${documentId}`,
    metadata: { title },
    plainText: rawContent,
    sections: [{
      level: 1,
      path: ["Overview"],
      sectionId: `${documentId}-section`,
      text: rawContent,
      title: "Overview",
    }],
    sourceFormat: "markdown",
  },
  rawContent,
  schemaVersion: 2,
  sourceFile: {
    fileName: `${title.toLowerCase().replace(/\s+/g, "-")}.md`,
    importedAt: 10,
    sourceFormat: "markdown",
    sourceId: documentId,
  },
  sourceFormat: "markdown",
  sourceUpdatedAt: 10,
  updatedAt: 10,
});

describe("buildKnowledgeDocumentImpact", () => {
  it("builds direct and indirect impact paths", () => {
    const sourceRecord = createKnowledgeRecord("source", "Source", "# Overview\nBase source");
    const middleRecord = createKnowledgeRecord("middle", "Middle", "# Overview\nSee source.md.");
    const targetRecord = createKnowledgeRecord("target", "Target", "# Overview\nSee middle.md.");
    const insights = buildKnowledgeWorkspaceInsights([sourceRecord, middleRecord, targetRecord]);
    const impact = buildKnowledgeDocumentImpact([sourceRecord, middleRecord, targetRecord], insights, "source");

    expect(impact?.relatedDocuments.map((document) => document.documentId)).toEqual(["middle"]);
    expect(impact?.paths).toEqual(expect.arrayContaining([
      expect.objectContaining({
        depth: 1,
        targetDocumentId: "middle",
      }),
      expect.objectContaining({
        depth: 2,
        targetDocumentId: "target",
        viaDocumentId: "middle",
      }),
    ]));
  });
});
