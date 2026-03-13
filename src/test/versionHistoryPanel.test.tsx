import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import VersionHistoryPanel from "@/components/editor/VersionHistoryPanel";
import { I18nContext } from "@/i18n/I18nProvider";
import type { DocumentVersionSnapshot } from "@/types/document";

const createSnapshot = (
  trigger: DocumentVersionSnapshot["trigger"],
  overrides: Partial<DocumentVersionSnapshot> = {},
): DocumentVersionSnapshot => ({
  contentHash: `hash-${trigger}`,
  createdAt: 100,
  document: {
    content: "# Test",
    createdAt: 100,
    id: "doc-1",
    metadata: {},
    mode: "markdown",
    name: "Test Doc",
    sourceSnapshots: { markdown: "# Test" },
    storageKind: "docsy",
    tiptapJson: null,
    updatedAt: 100,
    ast: null,
  },
  documentId: "doc-1",
  mode: "markdown",
  snapshotId: `snapshot-${trigger}`,
  trigger,
  ...overrides,
});

const renderPanel = (snapshots: DocumentVersionSnapshot[]) =>
  render(
    <I18nContext.Provider
      value={{
        locale: "en",
        setLocale: vi.fn(),
        t: (key, variables) => variables ? `${key}:${JSON.stringify(variables)}` : key,
      }}
    >
      <VersionHistoryPanel
        isReady
        isRestoring={false}
        isSyncing={false}
        onRestore={vi.fn()}
        snapshots={snapshots}
      />
    </I18nContext.Provider>,
  );

describe("VersionHistoryPanel", () => {
  it("prefers stored autosave summaries over the fallback autosave copy", () => {
    renderPanel([
      createSnapshot("autosave", {
        metadata: {
          summary: "Changed recovery guidance and added audit logging.",
          summaryGeneratedAt: 200,
        },
      }),
    ]);

    expect(screen.getByText("Changed recovery guidance and added audit logging.")).toBeInTheDocument();
    expect(screen.queryByText("versionHistory.summaryAutosave")).not.toBeInTheDocument();
  });

  it("keeps export and patch-apply summaries on the fixed fallback text", () => {
    renderPanel([
      createSnapshot("export", {
        metadata: {
          exportFormat: "PDF",
          summary: "Should not override export fallback.",
        },
      }),
      createSnapshot("patch_apply", {
        metadata: {
          patchCount: 2,
          summary: "Should not override patch fallback.",
        },
        snapshotId: "snapshot-patch",
      }),
    ]);

    expect(screen.getByText('versionHistory.summaryExport:{"format":"PDF"}')).toBeInTheDocument();
    expect(screen.getByText('versionHistory.summaryPatchApply:{"count":2}')).toBeInTheDocument();
    expect(screen.queryByText("Should not override export fallback.")).not.toBeInTheDocument();
    expect(screen.queryByText("Should not override patch fallback.")).not.toBeInTheDocument();
  });
});
