import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  initializeAutosaveRuntime,
  readLastSuccessfulAutosaveMarker,
  readRestoreSelection,
  readRuntimeBootInfo,
  writeLastSuccessfulAutosaveMarker,
  writeRestoreSelection,
} from "@/lib/documents/autosaveDebug";

describe("autosaveDebug", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(window.performance, "getEntriesByType").mockImplementation((entryType: string) => (
      entryType === "navigation"
        ? [{ type: "reload" }]
        : []
    ) as never);
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("classifies reload boots and marks repeated boots in the same tab", () => {
    const firstBoot = initializeAutosaveRuntime("build-a");
    const secondBoot = initializeAutosaveRuntime("build-b");

    expect(firstBoot.navigationType).toBe("reload");
    expect(firstBoot.hasPreviousBootInTab).toBe(false);
    expect(secondBoot.navigationType).toBe("reload");
    expect(secondBoot.hasPreviousBootInTab).toBe(true);
    expect(secondBoot.previousFrontendBuildId).toBe("build-a");
    expect(readRuntimeBootInfo()?.frontendBuildId).toBe("build-b");
  });

  it("stores autosave markers and restore selections for later boot comparison", () => {
    writeLastSuccessfulAutosaveMarker({
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
      lastSaved: 123,
      version: 2,
    }, {
      reason: "autosave",
    });
    writeRestoreSelection({
      contentHash: "hash-1",
      docCount: 1,
      isMeaningful: true,
      lastSaved: 123,
      source: "unload",
    });

    expect(readLastSuccessfulAutosaveMarker()).toEqual(expect.objectContaining({
      activeDocId: "doc-1",
      docCount: 1,
      isMeaningful: true,
      lastSaved: 123,
      reason: "autosave",
    }));
    expect(readRestoreSelection()).toEqual({
      contentHash: "hash-1",
      docCount: 1,
      isMeaningful: true,
      lastSaved: 123,
      source: "unload",
    });
  });
});
