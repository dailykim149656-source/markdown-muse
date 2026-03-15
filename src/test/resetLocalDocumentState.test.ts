import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createNewDocument } from "@/components/editor/useAutoSave";
import { resetLocalDocumentState } from "@/lib/documents/resetLocalDocumentState";
import { appendDocumentVersionSnapshot, listDocumentVersionSnapshots } from "@/lib/history/versionHistoryStore";
import { buildKnowledgeRecordFromDocument } from "@/lib/knowledge/knowledgeIndex";
import { listKnowledgeRecords, upsertKnowledgeRecords } from "@/lib/knowledge/knowledgeStore";
import { listSourceSnapshots, replaceSourceSnapshots } from "@/lib/knowledge/sourceSnapshotStore";

describe("resetLocalDocumentState", () => {
  const originalIndexedDb = window.indexedDB;

  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, "indexedDB", {
      configurable: true,
      value: undefined,
    });
  });

  afterEach(() => {
    localStorage.clear();
    Object.defineProperty(window, "indexedDB", {
      configurable: true,
      value: originalIndexedDb,
    });
  });

  it("clears document-related local state without touching unrelated preferences", async () => {
    const document = {
      ...createNewDocument("Runbook", "markdown"),
      content: "# Runbook",
      createdAt: 10,
      sourceSnapshots: {
        markdown: "# Runbook",
      },
      updatedAt: 10,
    };
    const knowledgeRecord = buildKnowledgeRecordFromDocument(document);

    if (!knowledgeRecord) {
      throw new Error("Expected the knowledge record to be created.");
    }

    await appendDocumentVersionSnapshot({
      contentHash: "hash-1",
      createdAt: 11,
      document,
      documentId: document.id,
      mode: document.mode,
      snapshotId: "snapshot-1",
      trigger: "autosave",
    });
    await upsertKnowledgeRecords([knowledgeRecord]);
    await replaceSourceSnapshots([{
      documentId: document.id,
      documentName: document.name,
      fileName: "Runbook.md",
      fingerprint: "fingerprint-1",
      indexedAt: 11,
      rawContentLength: document.content.length,
      scannedAt: 12,
      sourceFormat: "markdown",
    }]);
    localStorage.setItem("docsy-release-checklist-v1", JSON.stringify(["tests_and_build"]));
    localStorage.setItem("docsy-ui-language", "ko");
    localStorage.setItem("docsy-sidebar-width", "420");

    await resetLocalDocumentState();

    expect(await listDocumentVersionSnapshots(document.id)).toEqual([]);
    expect(await listKnowledgeRecords()).toEqual([]);
    expect(await listSourceSnapshots()).toEqual([]);
    expect(localStorage.getItem("docsy-release-checklist-v1")).toBeNull();
    expect(localStorage.getItem("docsy-ui-language")).toBe("ko");
    expect(localStorage.getItem("docsy-sidebar-width")).toBe("420");
  });
});
