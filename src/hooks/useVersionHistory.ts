import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/useI18n";
import { markDocumentVersionHistoryInitialized } from "@/lib/history/versionHistoryActions";
import type {
  DocumentData,
  DocumentVersionSnapshot,
  DocumentVersionSnapshotMetadata,
  VersionSnapshotTrigger,
} from "@/types/document";

interface UseVersionHistoryOptions {
  activeDoc: DocumentData;
  aiSummaryAvailable?: boolean;
  bumpEditorKey: () => void;
  enabled?: boolean;
  updateActiveDoc: (patch: Partial<DocumentData>) => void;
}

const MAX_VERSION_SNAPSHOTS = 5;

const loadVersionHistoryStore = () => import("@/lib/history/versionHistoryStore");

const hashString = (value: string) => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
};

const createSnapshotContentHash = (document: DocumentData) =>
  hashString(JSON.stringify({
    ast: document.ast ?? null,
    content: document.content,
    metadata: document.metadata ?? {},
    mode: document.mode,
    name: document.name,
    sourceSnapshots: document.sourceSnapshots ?? {},
    tiptapJson: document.tiptapJson ?? null,
  }));

export const useVersionHistory = ({
  activeDoc,
  aiSummaryAvailable = false,
  bumpEditorKey,
  enabled = true,
  updateActiveDoc,
}: UseVersionHistoryOptions) => {
  const { locale, t } = useI18n();
  const [versionSnapshots, setVersionSnapshots] = useState<DocumentVersionSnapshot[]>([]);
  const [versionHistoryReady, setVersionHistoryReady] = useState(false);
  const [versionHistorySyncing, setVersionHistorySyncing] = useState(false);
  const [versionHistoryRestoring, setVersionHistoryRestoring] = useState(false);
  const activeDocumentIdRef = useRef(activeDoc.id);
  const initializedDocumentIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    activeDocumentIdRef.current = activeDoc.id;
  }, [activeDoc.id]);

  useEffect(() => {
    if (!enabled) {
      setVersionHistoryReady(false);
      setVersionHistorySyncing(false);
      setVersionSnapshots([]);
      return;
    }

    let cancelled = false;

    const hydrateSnapshots = async () => {
      setVersionHistoryReady(false);
      setVersionHistorySyncing(true);
      setVersionSnapshots([]);

      try {
        const { listDocumentVersionSnapshots } = await loadVersionHistoryStore();
        const snapshots = await listDocumentVersionSnapshots(activeDoc.id);

        if (!cancelled) {
          setVersionSnapshots(snapshots);
          initializedDocumentIdsRef.current.add(activeDoc.id);
          markDocumentVersionHistoryInitialized(activeDoc.id);
        }
      } finally {
        if (!cancelled) {
          setVersionHistoryReady(true);
          setVersionHistorySyncing(false);
        }
      }
    };

    void hydrateSnapshots();

    return () => {
      cancelled = true;
    };
  }, [activeDoc.id, enabled]);

  const createVersionSnapshot = useCallback(async (
    document: DocumentData,
    trigger: VersionSnapshotTrigger,
    metadata?: DocumentVersionSnapshotMetadata,
  ) => {
    const snapshot = {
      contentHash: createSnapshotContentHash(document),
      createdAt: Date.now(),
      document: structuredClone(document),
      documentId: document.id,
      metadata,
      mode: document.mode,
      snapshotId: `snapshot:${document.id}:${Date.now()}:${trigger}`,
      trigger,
    } satisfies DocumentVersionSnapshot;

    const { appendDocumentVersionSnapshot } = await loadVersionHistoryStore();
    const nextSnapshots = await appendDocumentVersionSnapshot(snapshot, MAX_VERSION_SNAPSHOTS);

    if (document.id === activeDocumentIdRef.current) {
      setVersionSnapshots(nextSnapshots);
    }

    return snapshot;
  }, []);

  const captureAutoSaveSnapshot = useCallback(async (document: DocumentData) => {
    if (!enabled) {
      return;
    }

    if (!initializedDocumentIdsRef.current.has(document.id)) {
      initializedDocumentIdsRef.current.add(document.id);
      return;
    }

    const previousAutoSaveSnapshot = versionSnapshots.find((entry) => entry.trigger === "autosave") || null;
    const snapshot = await createVersionSnapshot(document, "autosave");

    void (async () => {
      try {
        const [
          { buildAutosaveDiffSummaryRequest },
          { summarizeAutosaveDiff },
          { upsertDocumentVersionSnapshot },
        ] = await Promise.all([
          import("@/lib/history/autosaveDiffSummary"),
          import("@/lib/ai/autosaveSummaryClient"),
          loadVersionHistoryStore(),
        ]);
        const request = buildAutosaveDiffSummaryRequest({
          currentSnapshot: snapshot,
          locale,
          previousSnapshot: previousAutoSaveSnapshot,
        });

        if (!request) {
          return;
        }

        // Health is only a hint; still attempt when a real diff exists so stale
        // or cross-origin health signals do not suppress autosave summaries.
        const result = await summarizeAutosaveDiff(request);
        const summarizedSnapshot = {
          ...snapshot,
          metadata: {
            ...(snapshot.metadata || {}),
            summary: result.summary,
            summaryGeneratedAt: Date.now(),
          },
        } satisfies DocumentVersionSnapshot;
        const nextSnapshots = await upsertDocumentVersionSnapshot(summarizedSnapshot, MAX_VERSION_SNAPSHOTS);

        if (document.id === activeDocumentIdRef.current) {
          setVersionSnapshots(nextSnapshots);
        }
      } catch {
        // Leave the fallback summary in place when AI summary generation fails.
      }
    })();
  }, [aiSummaryAvailable, createVersionSnapshot, enabled, locale, versionSnapshots]);

  const restoreVersionSnapshot = useCallback(async (snapshotId: string) => {
    const snapshot = versionSnapshots.find((entry) => entry.snapshotId === snapshotId);

    if (!snapshot) {
      return;
    }

    setVersionHistoryRestoring(true);

    try {
      updateActiveDoc({
        ...snapshot.document,
        updatedAt: Date.now(),
      });
      bumpEditorKey();
      toast.success(t("versionHistory.restoreDone", {
        name: snapshot.document.name || t("common.untitled"),
      }));
    } finally {
      setVersionHistoryRestoring(false);
    }
  }, [bumpEditorKey, t, updateActiveDoc, versionSnapshots]);

  const latestVersionSnapshotAt = useMemo(
    () => versionSnapshots[0]?.createdAt ?? null,
    [versionSnapshots],
  );

  const removeDocumentVersionSnapshots = useCallback(async (documentId: string) => {
    const { clearDocumentVersionSnapshots } = await loadVersionHistoryStore();
    await clearDocumentVersionSnapshots(documentId);

    if (documentId === activeDoc.id) {
      setVersionSnapshots([]);
    }
  }, [activeDoc.id]);

  return {
    captureAutoSaveSnapshot,
    createVersionSnapshot,
    latestVersionSnapshotAt,
    removeDocumentVersionSnapshots,
    restoreVersionSnapshot,
    versionHistoryReady,
    versionHistoryRestoring,
    versionHistorySnapshots: versionSnapshots,
    versionHistorySyncing,
  };
};
