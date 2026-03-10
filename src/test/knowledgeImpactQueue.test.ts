import { describe, expect, it } from "vitest";
import type { KnowledgeDocumentRecord } from "@/lib/knowledge/knowledgeIndex";
import {
  buildKnowledgeImpactQueue,
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

describe("buildKnowledgeImpactQueue", () => {
  it("queues impacted documents that reference a changed source", () => {
    const sourceRecord = createKnowledgeRecord("guide", "Guide", "# Overview\nCore guide");
    const consumerRecord = createKnowledgeRecord("runbook", "Runbook", "# Overview\nSee guide.md for the base procedure.");
    const insights = buildKnowledgeWorkspaceInsights([sourceRecord, consumerRecord]);

    expect(buildKnowledgeImpactQueue(
      [sourceRecord, consumerRecord],
      insights,
      ["guide"],
    )).toEqual([
      expect.objectContaining({
        changedDocumentId: "guide",
        impactedDocumentId: "runbook",
        relationKinds: ["referenced_by"],
      }),
    ]);
  });
});
