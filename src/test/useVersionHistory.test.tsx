import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nContext } from "@/i18n/I18nProvider";
import { useVersionHistory } from "@/hooks/useVersionHistory";
import type { DocumentData, DocumentVersionSnapshot } from "@/types/document";

const listDocumentVersionSnapshots = vi.fn();
const appendDocumentVersionSnapshot = vi.fn();
const upsertDocumentVersionSnapshot = vi.fn();
const clearDocumentVersionSnapshots = vi.fn();
const summarizeAutosaveDiff = vi.fn();
const buildAutosaveDiffSummaryRequest = vi.fn();

vi.mock("@/lib/history/versionHistoryStore", () => ({
  appendDocumentVersionSnapshot: (...args: Parameters<typeof appendDocumentVersionSnapshot>) =>
    appendDocumentVersionSnapshot(...args),
  clearDocumentVersionSnapshots: (...args: Parameters<typeof clearDocumentVersionSnapshots>) =>
    clearDocumentVersionSnapshots(...args),
  listDocumentVersionSnapshots: (...args: Parameters<typeof listDocumentVersionSnapshots>) =>
    listDocumentVersionSnapshots(...args),
  upsertDocumentVersionSnapshot: (...args: Parameters<typeof upsertDocumentVersionSnapshot>) =>
    upsertDocumentVersionSnapshot(...args),
}));

vi.mock("@/lib/ai/autosaveSummaryClient", () => ({
  summarizeAutosaveDiff: (...args: Parameters<typeof summarizeAutosaveDiff>) =>
    summarizeAutosaveDiff(...args),
}));

vi.mock("@/lib/history/autosaveDiffSummary", () => ({
  buildAutosaveDiffSummaryRequest: (...args: Parameters<typeof buildAutosaveDiffSummaryRequest>) =>
    buildAutosaveDiffSummaryRequest(...args),
}));

const createDocument = (overrides: Partial<DocumentData> = {}): DocumentData => ({
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
  ...overrides,
});

const createSnapshot = (
  snapshotId: string,
  createdAt: number,
  metadata?: DocumentVersionSnapshot["metadata"],
): DocumentVersionSnapshot => ({
  contentHash: `${snapshotId}-${createdAt}`,
  createdAt,
  document: createDocument({
    updatedAt: createdAt,
  }),
  documentId: "doc-1",
  metadata,
  mode: "markdown",
  snapshotId,
  trigger: "autosave",
});

const renderHookWithI18n = (callback: () => ReturnType<typeof useVersionHistory>) =>
  renderHook(callback, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <I18nContext.Provider value={{ locale: "en", setLocale: vi.fn(), t: (key) => key }}>
        {children}
      </I18nContext.Provider>
    ),
  });

describe("useVersionHistory", () => {
  beforeEach(() => {
    listDocumentVersionSnapshots.mockReset();
    appendDocumentVersionSnapshot.mockReset();
    upsertDocumentVersionSnapshot.mockReset();
    clearDocumentVersionSnapshots.mockReset();
    summarizeAutosaveDiff.mockReset();
    buildAutosaveDiffSummaryRequest.mockReset();
  });

  it("creates an autosave snapshot immediately and later updates it with an AI summary", async () => {
    const previousSnapshot = createSnapshot("snapshot-prev", 100, {
      summary: "Old summary",
      summaryGeneratedAt: 100,
    });
    let resolveSummary: ((value: { requestId: string; summary: string }) => void) | null = null;
    let snapshots = [previousSnapshot];

    listDocumentVersionSnapshots.mockImplementation(async () => snapshots);
    appendDocumentVersionSnapshot.mockImplementation(async (snapshot: DocumentVersionSnapshot) => {
      snapshots = [snapshot, ...snapshots];
      return snapshots;
    });
    upsertDocumentVersionSnapshot.mockImplementation(async (snapshot: DocumentVersionSnapshot) => {
      snapshots = snapshots.map((entry) => entry.snapshotId === snapshot.snapshotId ? snapshot : entry);
      return snapshots;
    });
    buildAutosaveDiffSummaryRequest.mockReturnValue({
      comparison: {
        counts: {
          added: 1,
          changed: 0,
          inconsistent: 0,
          removed: 0,
        },
        deltas: [{
          afterExcerpt: "Enable audit logging.",
          kind: "added",
          summary: "Section \"Audit\" exists only in the target document.",
          title: "Audit",
        }],
      },
      document: {
        documentId: "doc-1",
        fileName: "Runbook",
        mode: "markdown",
      },
      locale: "en",
    });
    summarizeAutosaveDiff.mockImplementation(() => new Promise((resolve) => {
      resolveSummary = resolve;
    }));

    const { result } = renderHookWithI18n(() => useVersionHistory({
      activeDoc: createDocument(),
      aiSummaryAvailable: true,
      bumpEditorKey: vi.fn(),
      enabled: true,
      updateActiveDoc: vi.fn(),
    }));

    await waitFor(() => {
      expect(result.current.versionHistoryReady).toBe(true);
      expect(result.current.versionHistorySnapshots).toHaveLength(1);
    });

    await act(async () => {
      await result.current.captureAutoSaveSnapshot(createDocument({
        sourceSnapshots: {
          markdown: "# Overview\n\nUpdated authentication overview.\n\n## Audit\n\nEnable audit logging.",
        },
        updatedAt: 200,
      }));
    });

    expect(result.current.versionHistorySnapshots[0]?.metadata?.summary).toBeUndefined();

    await act(async () => {
      resolveSummary?.({
        requestId: "req-1",
        summary: "Added an Audit section with logging guidance.",
      });
    });

    await waitFor(() => {
      expect(result.current.versionHistorySnapshots[0]?.metadata?.summary).toBe(
        "Added an Audit section with logging guidance.",
      );
    });

    expect(buildAutosaveDiffSummaryRequest).toHaveBeenCalledTimes(1);
    expect(summarizeAutosaveDiff).toHaveBeenCalledTimes(1);
    expect(upsertDocumentVersionSnapshot).toHaveBeenCalledTimes(1);
  });

  it("leaves the fallback summary path untouched when AI summary generation fails", async () => {
    const previousSnapshot = createSnapshot("snapshot-prev", 100);
    let snapshots = [previousSnapshot];

    listDocumentVersionSnapshots.mockImplementation(async () => snapshots);
    appendDocumentVersionSnapshot.mockImplementation(async (snapshot: DocumentVersionSnapshot) => {
      snapshots = [snapshot, ...snapshots];
      return snapshots;
    });
    upsertDocumentVersionSnapshot.mockImplementation(async (snapshot: DocumentVersionSnapshot) => {
      snapshots = snapshots.map((entry) => entry.snapshotId === snapshot.snapshotId ? snapshot : entry);
      return snapshots;
    });
    buildAutosaveDiffSummaryRequest.mockReturnValue({
      comparison: {
        counts: {
          added: 1,
          changed: 0,
          inconsistent: 0,
          removed: 0,
        },
        deltas: [{
          kind: "added",
          summary: "Section \"Audit\" exists only in the target document.",
          title: "Audit",
        }],
      },
      document: {
        documentId: "doc-1",
        fileName: "Runbook",
        mode: "markdown",
      },
      locale: "en",
    });
    summarizeAutosaveDiff.mockRejectedValue(new Error("AI unavailable"));

    const { result } = renderHookWithI18n(() => useVersionHistory({
      activeDoc: createDocument(),
      aiSummaryAvailable: true,
      bumpEditorKey: vi.fn(),
      enabled: true,
      updateActiveDoc: vi.fn(),
    }));

    await waitFor(() => {
      expect(result.current.versionHistoryReady).toBe(true);
    });

    await act(async () => {
      await result.current.captureAutoSaveSnapshot(createDocument({
        sourceSnapshots: {
          markdown: "# Overview\n\nUpdated authentication overview.\n\n## Audit\n\nEnable audit logging.",
        },
        updatedAt: 200,
      }));
    });

    await waitFor(() => {
      expect(result.current.versionHistorySnapshots).toHaveLength(2);
    });

    await waitFor(() => {
      expect(summarizeAutosaveDiff).toHaveBeenCalledTimes(1);
    });

    expect(result.current.versionHistorySnapshots[0]?.metadata?.summary).toBeUndefined();
    expect(upsertDocumentVersionSnapshot).not.toHaveBeenCalled();
  });

  it("still attempts diff summaries when health hints are stale or unavailable", async () => {
    const previousSnapshot = createSnapshot("snapshot-prev", 100);
    let resolveSummary: ((value: { requestId: string; summary: string }) => void) | null = null;
    let snapshots = [previousSnapshot];

    listDocumentVersionSnapshots.mockImplementation(async () => snapshots);
    appendDocumentVersionSnapshot.mockImplementation(async (snapshot: DocumentVersionSnapshot) => {
      snapshots = [snapshot, ...snapshots];
      return snapshots;
    });
    upsertDocumentVersionSnapshot.mockImplementation(async (snapshot: DocumentVersionSnapshot) => {
      snapshots = snapshots.map((entry) => entry.snapshotId === snapshot.snapshotId ? snapshot : entry);
      return snapshots;
    });
    buildAutosaveDiffSummaryRequest.mockReturnValue({
      comparison: {
        counts: {
          added: 1,
          changed: 0,
          inconsistent: 0,
          removed: 0,
        },
        deltas: [{
          afterExcerpt: "Enable audit logging.",
          kind: "added",
          summary: "Section \"Audit\" exists only in the target document.",
          title: "Audit",
        }],
      },
      document: {
        documentId: "doc-1",
        fileName: "Runbook",
        mode: "markdown",
      },
      locale: "en",
    });
    summarizeAutosaveDiff.mockImplementation(() => new Promise((resolve) => {
      resolveSummary = resolve;
    }));

    const { result } = renderHookWithI18n(() => useVersionHistory({
      activeDoc: createDocument(),
      aiSummaryAvailable: false,
      bumpEditorKey: vi.fn(),
      enabled: true,
      updateActiveDoc: vi.fn(),
    }));

    await waitFor(() => {
      expect(result.current.versionHistoryReady).toBe(true);
    });

    await act(async () => {
      await result.current.captureAutoSaveSnapshot(createDocument({
        sourceSnapshots: {
          markdown: "# Overview\n\nUpdated authentication overview.\n\n## Audit\n\nEnable audit logging.",
        },
        updatedAt: 200,
      }));
    });

    await act(async () => {
      resolveSummary?.({
        requestId: "req-2",
        summary: "Added an Audit section with logging guidance.",
      });
    });

    await waitFor(() => {
      expect(result.current.versionHistorySnapshots[0]?.metadata?.summary).toBe(
        "Added an Audit section with logging guidance.",
      );
    });

    expect(summarizeAutosaveDiff).toHaveBeenCalledTimes(1);
  });

  it("generates a summary for the first autosave snapshot when initial content is added", async () => {
    let resolveSummary: ((value: { requestId: string; summary: string }) => void) | null = null;
    let snapshots: DocumentVersionSnapshot[] = [];

    listDocumentVersionSnapshots.mockImplementation(async () => snapshots);
    appendDocumentVersionSnapshot.mockImplementation(async (snapshot: DocumentVersionSnapshot) => {
      snapshots = [snapshot, ...snapshots];
      return snapshots;
    });
    upsertDocumentVersionSnapshot.mockImplementation(async (snapshot: DocumentVersionSnapshot) => {
      snapshots = snapshots.map((entry) => entry.snapshotId === snapshot.snapshotId ? snapshot : entry);
      return snapshots;
    });
    buildAutosaveDiffSummaryRequest.mockReturnValue({
      comparison: {
        counts: {
          added: 1,
          changed: 0,
          inconsistent: 0,
          removed: 0,
        },
        deltas: [{
          afterExcerpt: "*제목:test docs",
          kind: "added",
          summary: "Initial content was added to the document.",
          title: "Runbook",
        }],
      },
      document: {
        documentId: "doc-1",
        fileName: "Runbook",
        mode: "markdown",
      },
      locale: "en",
    });
    summarizeAutosaveDiff.mockImplementation(() => new Promise((resolve) => {
      resolveSummary = resolve;
    }));

    const { result } = renderHookWithI18n(() => useVersionHistory({
      activeDoc: createDocument(),
      aiSummaryAvailable: true,
      bumpEditorKey: vi.fn(),
      enabled: true,
      updateActiveDoc: vi.fn(),
    }));

    await waitFor(() => {
      expect(result.current.versionHistoryReady).toBe(true);
      expect(result.current.versionHistorySnapshots).toHaveLength(0);
    });

    await act(async () => {
      await result.current.captureAutoSaveSnapshot(createDocument({
        content: "*제목:test docs",
        sourceSnapshots: {
          markdown: "*제목:test docs",
        },
        updatedAt: 200,
      }));
    });

    await act(async () => {
      resolveSummary?.({
        requestId: "req-3",
        summary: "첫 줄에 '*제목:test docs'가 추가되었습니다.",
      });
    });

    await waitFor(() => {
      expect(result.current.versionHistorySnapshots[0]?.metadata?.summary).toBe(
        "첫 줄에 '*제목:test docs'가 추가되었습니다.",
      );
    });

    expect(summarizeAutosaveDiff).toHaveBeenCalledTimes(1);
  });
});
