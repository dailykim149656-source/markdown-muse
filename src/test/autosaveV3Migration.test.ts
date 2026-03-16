import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockClearAutosavePointer,
  mockClearAutosaveV3Snapshot,
  mockReadAutosaveV3Snapshot,
  mockWriteAutosavePointer,
  mockWriteAutosaveV3Snapshot,
} = vi.hoisted(() => ({
  mockClearAutosavePointer: vi.fn(),
  mockClearAutosaveV3Snapshot: vi.fn(async () => undefined),
  mockReadAutosaveV3Snapshot: vi.fn(async () => null),
  mockWriteAutosavePointer: vi.fn(),
  mockWriteAutosaveV3Snapshot: vi.fn(async () => true),
}));

vi.mock("@/lib/documents/autosaveV3Store", () => ({
  clearAutosavePointer: mockClearAutosavePointer,
  clearAutosaveV3Snapshot: mockClearAutosaveV3Snapshot,
  readAutosaveV3Snapshot: mockReadAutosaveV3Snapshot,
  writeAutosavePointer: mockWriteAutosavePointer,
  writeAutosaveV3Snapshot: mockWriteAutosaveV3Snapshot,
}));

import {
  DOCSY_AUTOSAVE_STORAGE_KEY,
  hydrateSavedData,
  saveData,
  saveDataForUnload,
} from "@/components/editor/useAutoSave";

describe("autosave v3 migration", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockReadAutosaveV3Snapshot.mockResolvedValue(null);
    mockWriteAutosaveV3Snapshot.mockResolvedValue(true);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("hydrates a legacy v2 payload into the v3 store", async () => {
    localStorage.setItem(DOCSY_AUTOSAVE_STORAGE_KEY, JSON.stringify({
      activeDocId: "doc-1",
      documents: [{
        ast: null,
        content: "# Draft",
        createdAt: 1,
        id: "doc-1",
        metadata: {},
        mode: "markdown",
        name: "Draft",
        sourceSnapshots: { markdown: "# Draft" },
        storageKind: "docsy",
        tiptapJson: null,
        updatedAt: 2,
      }],
      lastSaved: 100,
      version: 2,
    }));

    const hydrated = await hydrateSavedData();

    expect(hydrated?.activeDocId).toBe("doc-1");
    expect(mockWriteAutosaveV3Snapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        activeDocId: "doc-1",
        version: 2,
      }),
      expect.objectContaining({
        dirtyDocumentIds: ["doc-1"],
      }),
    );
    expect(mockWriteAutosavePointer).toHaveBeenCalledWith(expect.objectContaining({
      activeDocId: "doc-1",
      documentIds: ["doc-1"],
      version: 3,
    }));
  });

  it("forwards dirty document ids when saving incrementally", () => {
    saveData({
      activeDocId: "doc-2",
      documents: [{
        ast: null,
        content: "# Updated",
        createdAt: 1,
        id: "doc-2",
        metadata: {},
        mode: "markdown",
        name: "Updated",
        sourceSnapshots: { markdown: "# Updated" },
        storageKind: "docsy",
        tiptapJson: null,
        updatedAt: 3,
      }],
      lastSaved: 200,
      version: 2,
    }, {
      dirtyDocumentIds: ["doc-2"],
    });

    expect(mockWriteAutosaveV3Snapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        activeDocId: "doc-2",
      }),
      expect.objectContaining({
        dirtyDocumentIds: ["doc-2"],
      }),
    );
  });

  it("prefers a newer local fallback when the v3 snapshot is stale", async () => {
    mockReadAutosaveV3Snapshot.mockResolvedValue({
      activeDocId: "doc-3",
      documents: [{
        ast: null,
        content: "# Older",
        createdAt: 1,
        id: "doc-3",
        metadata: {},
        mode: "markdown",
        name: "Draft",
        sourceSnapshots: { markdown: "# Older" },
        storageKind: "docsy",
        tiptapJson: null,
        updatedAt: 2,
      }],
      lastSaved: 100,
      version: 2,
    });
    localStorage.setItem(DOCSY_AUTOSAVE_STORAGE_KEY, JSON.stringify({
      activeDocId: "doc-3",
      documents: [{
        ast: null,
        content: "# Newer",
        createdAt: 1,
        id: "doc-3",
        metadata: {},
        mode: "markdown",
        name: "Draft",
        sourceSnapshots: { markdown: "# Newer" },
        storageKind: "docsy",
        tiptapJson: null,
        updatedAt: 3,
      }],
      lastSaved: 200,
      version: 2,
    }));

    const hydrated = await hydrateSavedData();

    expect(hydrated?.documents[0]?.content).toBe("# Newer");
    expect(mockWriteAutosaveV3Snapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        activeDocId: "doc-3",
        documents: expect.arrayContaining([
          expect.objectContaining({
            content: "# Newer",
            id: "doc-3",
          }),
        ]),
      }),
      expect.objectContaining({
        dirtyDocumentIds: ["doc-3"],
      }),
    );
    expect(localStorage.getItem(DOCSY_AUTOSAVE_STORAGE_KEY)).toContain("# Newer");
  });

  it("forces a reload-safe local fallback during unload saves", () => {
    const largeContent = "A".repeat(60_000);

    const result = saveDataForUnload({
      activeDocId: "doc-4",
      documents: [{
        ast: null,
        content: largeContent,
        createdAt: 1,
        id: "doc-4",
        metadata: {},
        mode: "markdown",
        name: "Large Draft",
        sourceSnapshots: { markdown: largeContent },
        storageKind: "docsy",
        tiptapJson: null,
        updatedAt: 3,
      }],
      lastSaved: 200,
      version: 2,
    }, {
      reason: "beforeunload",
    });

    expect(result.ok).toBe(true);
    expect(localStorage.getItem(DOCSY_AUTOSAVE_STORAGE_KEY)).toContain("Large Draft");
  });
});
