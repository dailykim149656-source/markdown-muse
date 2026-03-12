import { describe, expect, it } from "vitest";
import {
  getWorkspaceProviderLabel,
  getWorkspaceSyncBadgeClassName,
  getWorkspaceSyncLabel,
} from "@/lib/workspace/workspaceLabels";

const baseBinding = {
  documentKind: "google_docs" as const,
  fileId: "abc123",
  importedAt: Date.now(),
  mimeType: "application/vnd.google-apps.document",
  provider: "google_drive" as const,
};

describe("workspaceLabels", () => {
  it("returns the provider label for Google Drive bindings", () => {
    expect(getWorkspaceProviderLabel({
      ...baseBinding,
      syncStatus: "imported",
    })).toBe("Google Drive");
  });

  it("maps sync statuses to readable labels", () => {
    expect(getWorkspaceSyncLabel({ ...baseBinding, syncStatus: "imported" })).toBe("Imported");
    expect(getWorkspaceSyncLabel({ ...baseBinding, syncStatus: "dirty_local" })).toBe("Local changes");
    expect(getWorkspaceSyncLabel({ ...baseBinding, syncStatus: "synced" })).toBe("Synced");
    expect(getWorkspaceSyncLabel({ ...baseBinding, syncStatus: "synced", syncWarnings: ["Tables are flattened."] })).toBe("Synced with warnings");
    expect(getWorkspaceSyncLabel({ ...baseBinding, syncStatus: "conflict" })).toBe("Conflict");
  });

  it("returns distinct badge classes for synced and conflict states", () => {
    expect(getWorkspaceSyncBadgeClassName({ ...baseBinding, syncStatus: "synced" })).toContain("emerald");
    expect(getWorkspaceSyncBadgeClassName({ ...baseBinding, syncStatus: "synced", syncWarnings: ["Tables are flattened."] })).toContain("amber");
    expect(getWorkspaceSyncBadgeClassName({ ...baseBinding, syncStatus: "conflict" })).toContain("destructive");
  });
});
