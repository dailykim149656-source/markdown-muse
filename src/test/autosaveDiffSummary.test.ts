import { describe, expect, it } from "vitest";
import { buildAutosaveDiffSummaryRequest } from "@/lib/history/autosaveDiffSummary";
import type { DocumentVersionSnapshot } from "@/types/document";

const createSnapshot = (
  overrides: Partial<DocumentVersionSnapshot> = {},
): DocumentVersionSnapshot => ({
  contentHash: "hash-1",
  createdAt: 100,
  document: {
    content: "# Overview\n\nLegacy authentication overview.",
    createdAt: 100,
    id: "doc-1",
    metadata: {},
    mode: "markdown",
    name: "Runbook",
    sourceSnapshots: {
      markdown: "# Overview\n\nLegacy authentication overview.",
    },
    storageKind: "docsy",
    tiptapJson: null,
    updatedAt: 100,
    ast: null,
  },
  documentId: "doc-1",
  mode: "markdown",
  snapshotId: "snapshot-1",
  trigger: "autosave",
  ...overrides,
});

describe("buildAutosaveDiffSummaryRequest", () => {
  it("returns null when there is no previous snapshot and the current document is empty", () => {
    const request = buildAutosaveDiffSummaryRequest({
      currentSnapshot: createSnapshot({
        document: {
          ...createSnapshot().document,
          content: "",
          sourceSnapshots: {
            markdown: "",
          },
        },
      }),
      locale: "en",
      previousSnapshot: null,
    });

    expect(request).toBeNull();
  });

  it("builds an initial added-content request when there is no previous snapshot", () => {
    const request = buildAutosaveDiffSummaryRequest({
      currentSnapshot: createSnapshot({
        document: {
          ...createSnapshot().document,
          content: "*제목:test docs",
          sourceSnapshots: {
            markdown: "*제목:test docs",
          },
        },
      }),
      locale: "ko",
      previousSnapshot: null,
    });

    expect(request).not.toBeNull();
    expect(request?.comparison.counts).toEqual({
      added: 1,
      changed: 0,
      inconsistent: 0,
      removed: 0,
    });
    expect(request?.comparison.deltas).toEqual([{
      afterExcerpt: "*제목:test docs",
      kind: "added",
      summary: "Initial content was added to the document.",
      title: "Runbook",
    }]);
  });

  it("returns null for json and yaml snapshots", () => {
    const request = buildAutosaveDiffSummaryRequest({
      currentSnapshot: createSnapshot({
        document: {
          ...createSnapshot().document,
          content: "{\"summary\":\"value\"}",
          mode: "json",
          sourceSnapshots: {},
        },
        mode: "json",
      }),
      locale: "en",
      previousSnapshot: createSnapshot(),
    });

    expect(request).toBeNull();
  });

  it("builds ordered diff payloads for heading-based markdown changes", () => {
    const previousSnapshot = createSnapshot({
      snapshotId: "snapshot-prev",
      document: {
        ...createSnapshot().document,
        sourceSnapshots: {
          markdown: [
            "# Overview",
            "",
            "Legacy authentication overview.",
            "",
            "## Recovery",
            "",
            "Reset API token and rotate credentials.",
            "",
            "## Legacy",
            "",
            "This section will be removed.",
          ].join("\n"),
        },
      },
    });
    const currentSnapshot = createSnapshot({
      snapshotId: "snapshot-next",
      createdAt: 200,
      document: {
        ...createSnapshot().document,
        sourceSnapshots: {
          markdown: [
            "# Overview",
            "",
            "Updated authentication overview with deployment notes.",
            "",
            "## Recovery",
            "",
            "Reset API token, rotate credentials, and notify security.",
            "",
            "## Audit",
            "",
            "Enable audit logging and validate retention alerts.",
          ].join("\n"),
        },
        updatedAt: 200,
      },
    });

    const request = buildAutosaveDiffSummaryRequest({
      currentSnapshot,
      locale: "en",
      previousSnapshot,
    });

    expect(request).not.toBeNull();
    expect(request?.document).toEqual({
      documentId: "doc-1",
      fileName: "Runbook",
      mode: "markdown",
    });
    expect(request?.comparison.deltas).toHaveLength(3);
    expect(request?.comparison.deltas.map((delta) => delta.kind)).toEqual([
      "removed",
      "added",
      "changed",
    ]);
    expect(request?.comparison.deltas[0]).toMatchObject({
      beforeExcerpt: "This section will be removed.",
      kind: "removed",
      title: "Legacy",
    });
    expect(request?.comparison.deltas[1]).toMatchObject({
      afterExcerpt: "Enable audit logging and validate retention alerts.",
      kind: "added",
      title: "Audit",
    });
  });

  it("builds a root-level diff for headingless markdown documents", () => {
    const previousSnapshot = createSnapshot({
      snapshotId: "snapshot-prev",
      document: {
        ...createSnapshot().document,
        content: "Restart the service and verify health checks.",
        sourceSnapshots: {},
      },
    });
    const currentSnapshot = createSnapshot({
      snapshotId: "snapshot-next",
      document: {
        ...createSnapshot().document,
        content: "Restart the service twice and verify health checks with audit logging.",
        sourceSnapshots: {},
      },
    });

    const request = buildAutosaveDiffSummaryRequest({
      currentSnapshot,
      locale: "en",
      previousSnapshot,
    });

    expect(request).not.toBeNull();
    expect(request?.comparison.deltas).toHaveLength(1);
    expect(request?.comparison.deltas[0]).toMatchObject({
      afterExcerpt: "Restart the service twice and verify health checks with audit logging.",
      beforeExcerpt: "Restart the service and verify health checks.",
      title: "Runbook",
    });
  });
});
