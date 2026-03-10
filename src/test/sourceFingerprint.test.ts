import { describe, expect, it } from "vitest";
import type { KnowledgeDocumentRecord } from "@/lib/knowledge/knowledgeIndex";
import {
  buildSourceSnapshotRecordFromKnowledgeRecord,
  compareSourceSnapshots,
  createSourceFingerprint,
} from "@/lib/knowledge/sourceFingerprint";

const createKnowledgeRecord = (
  overrides: Partial<KnowledgeDocumentRecord> = {},
): KnowledgeDocumentRecord => ({
  contentHash: "hash",
  documentId: "doc-1",
  fileName: "guide.md",
  indexStatus: "fresh",
  indexedAt: 10,
  normalizedDocument: {
    chunks: [],
    fileName: "guide.md",
    images: [],
    importedAt: 10,
    ingestionId: "ing-1",
    metadata: { title: "Guide" },
    plainText: "hello world",
    sections: [],
    sourceFormat: "markdown",
  },
  rawContent: "# Guide\nhello world",
  schemaVersion: 2,
  sourceFile: {
    fileName: "guide.md",
    importedAt: 10,
    sourceFormat: "markdown",
    sourceId: "doc-1",
  },
  sourceFormat: "markdown",
  sourceUpdatedAt: 10,
  updatedAt: 10,
  ...overrides,
});

describe("sourceFingerprint", () => {
  it("creates a stable fingerprint for the same source", () => {
    expect(createSourceFingerprint("markdown", "guide.md", "hello")).toBe(
      createSourceFingerprint("markdown", "guide.md", "hello"),
    );
  });

  it("detects new and changed sources across rescans", () => {
    const previousRecord = createKnowledgeRecord();
    const previousSnapshot = buildSourceSnapshotRecordFromKnowledgeRecord(previousRecord, 100);
    const changedRecord = createKnowledgeRecord({
      rawContent: "# Guide\nupdated content",
      updatedAt: 20,
    });
    const changedSnapshot = buildSourceSnapshotRecordFromKnowledgeRecord(changedRecord, 200);
    const newSnapshot = buildSourceSnapshotRecordFromKnowledgeRecord(createKnowledgeRecord({
      documentId: "doc-2",
      fileName: "runbook.md",
      normalizedDocument: {
        ...previousRecord.normalizedDocument,
        fileName: "runbook.md",
        ingestionId: "ing-2",
        metadata: { title: "Runbook" },
      },
      rawContent: "# Runbook\nhello",
      sourceFile: {
        fileName: "runbook.md",
        importedAt: 20,
        sourceFormat: "markdown",
        sourceId: "doc-2",
      },
    }), 200);

    expect(compareSourceSnapshots([previousSnapshot], [changedSnapshot, newSnapshot])).toEqual([
      expect.objectContaining({
        changeType: "new",
        documentId: "doc-2",
      }),
      expect.objectContaining({
        changeType: "changed",
        documentId: "doc-1",
        previousScannedAt: 100,
      }),
    ]);
  });
});
