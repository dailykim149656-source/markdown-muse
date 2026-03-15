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

import { DOCSY_AUTOSAVE_STORAGE_KEY, hydrateSavedData, saveData } from "@/components/editor/useAutoSave";

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
});
