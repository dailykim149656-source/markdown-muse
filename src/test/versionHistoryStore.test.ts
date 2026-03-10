import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  appendDocumentVersionSnapshot,
  clearDocumentVersionSnapshots,
  listDocumentVersionSnapshots,
} from "@/lib/history/versionHistoryStore";
import type { DocumentVersionSnapshot } from "@/types/document";

const createSnapshot = (
  documentId: string,
  createdAt: number,
  trigger: DocumentVersionSnapshot["trigger"] = "autosave",
): DocumentVersionSnapshot => ({
  contentHash: `${documentId}-${createdAt}`,
  createdAt,
  document: {
    content: `snapshot ${createdAt}`,
    createdAt: 1,
    id: documentId,
    metadata: {},
    mode: "markdown",
    name: `Doc ${documentId}`,
    sourceSnapshots: { markdown: `snapshot ${createdAt}` },
    storageKind: "docsy",
    tiptapJson: null,
    updatedAt: createdAt,
    ast: null,
  },
  documentId,
  mode: "markdown",
  snapshotId: `snapshot:${documentId}:${createdAt}:${trigger}`,
  trigger,
});

describe("versionHistoryStore fallback persistence", () => {
  beforeEach(() => {
    Object.defineProperty(window, "indexedDB", {
      configurable: true,
      value: undefined,
    });
    window.localStorage.clear();
  });

  afterEach(async () => {
    await clearDocumentVersionSnapshots();
    window.localStorage.clear();
  });

  it("keeps only the five most recent snapshots per document", async () => {
    for (let index = 0; index < 6; index += 1) {
      await appendDocumentVersionSnapshot(createSnapshot("doc-1", index + 1), 5);
    }

    const snapshots = await listDocumentVersionSnapshots("doc-1");

    expect(snapshots).toHaveLength(5);
    expect(snapshots.map((snapshot) => snapshot.createdAt)).toEqual([6, 5, 4, 3, 2]);
  });

  it("returns snapshots for only the requested document", async () => {
    await appendDocumentVersionSnapshot(createSnapshot("doc-1", 10), 5);
    await appendDocumentVersionSnapshot(createSnapshot("doc-2", 20), 5);

    const docOneSnapshots = await listDocumentVersionSnapshots("doc-1");
    const docTwoSnapshots = await listDocumentVersionSnapshots("doc-2");

    expect(docOneSnapshots).toHaveLength(1);
    expect(docOneSnapshots[0]?.documentId).toBe("doc-1");
    expect(docTwoSnapshots).toHaveLength(1);
    expect(docTwoSnapshots[0]?.documentId).toBe("doc-2");
  });

  it("clears snapshots for a single document", async () => {
    await appendDocumentVersionSnapshot(createSnapshot("doc-1", 10), 5);
    await appendDocumentVersionSnapshot(createSnapshot("doc-2", 20), 5);

    await clearDocumentVersionSnapshots("doc-1");

    const docOneSnapshots = await listDocumentVersionSnapshots("doc-1");
    const docTwoSnapshots = await listDocumentVersionSnapshots("doc-2");

    expect(docOneSnapshots).toEqual([]);
    expect(docTwoSnapshots).toHaveLength(1);
  });
});
