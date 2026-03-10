import { afterEach, describe, expect, it, vi } from "vitest";
import { migrateLegacyAutoSaveData, saveData } from "@/components/editor/useAutoSave";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("autosave migration", () => {
  it("migrates a legacy autosave payload to v2", () => {
    const migrated = migrateLegacyAutoSaveData({
      documents: [{
        id: "doc-1",
        name: "Legacy",
        mode: "markdown",
        content: "# Legacy\n",
        createdAt: 1,
        updatedAt: 2,
      }],
      activeDocId: "doc-1",
      lastSaved: 100,
    });

    expect(migrated).not.toBeNull();
    expect(migrated?.version).toBe(2);
    expect(migrated?.documents[0]?.storageKind).toBe("legacy");
    expect(migrated?.documents[0]?.sourceSnapshots?.markdown).toBe("# Legacy\n");
  });

  it("passes through an existing v2 autosave payload", () => {
    const migrated = migrateLegacyAutoSaveData({
      version: 2,
      documents: [{
        id: "doc-2",
        name: "Current",
        mode: "json",
        content: "{}",
        createdAt: 1,
        updatedAt: 2,
        storageKind: "docsy",
        sourceSnapshots: { json: "{}" },
        metadata: {},
        tiptapJson: null,
        ast: null,
      }],
      activeDocId: "doc-2",
      lastSaved: 200,
    });

    expect(migrated?.version).toBe(2);
    expect(migrated?.documents[0]?.storageKind).toBe("docsy");
    expect(migrated?.documents[0]?.sourceSnapshots?.json).toBe("{}");
  });

  it("reports an autosave write failure when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    const result = saveData({
      activeDocId: "doc-1",
      documents: [{
        id: "doc-1",
        name: "Current",
        mode: "markdown",
        content: "# Current\n",
        createdAt: 1,
        updatedAt: 2,
        storageKind: "docsy",
        sourceSnapshots: { markdown: "# Current\n" },
        metadata: {},
        tiptapJson: null,
        ast: null,
      }],
      lastSaved: 200,
      version: 2,
    });

    expect(result.ok).toBe(false);

    if (result.ok) {
      throw new Error("Expected autosave to fail.");
    }

    expect(result.error).toContain("Autosave failed");
  });
});
