import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/useI18n";
import {
  buildConsistencyHealthIssues,
  buildKnowledgeConsistencyIssues,
  type KnowledgeConsistencyIssue,
} from "@/lib/knowledge/consistencyAnalysis";
import {
  buildDocumentOptionsFromKnowledgeRecord,
  buildKnowledgeDocumentFingerprint,
  buildKnowledgeRecordFromDocument,
  buildKnowledgeRecentRecords,
  getKnowledgeRecordLabel,
  mergeKnowledgeRecords,
  reconcileKnowledgeRecords,
  searchKnowledgeRecords,
  summarizeKnowledgeRecords,
  type KnowledgeDocumentRecord,
  type KnowledgeSearchMode,
  type KnowledgeSearchResult,
} from "@/lib/knowledge/knowledgeIndex";
import {
  clearKnowledgeRecords,
  listKnowledgeRecords,
  removeKnowledgeRecord,
  upsertKnowledgeRecords,
} from "@/lib/knowledge/knowledgeStore";
import {
  buildSourceSnapshotRecordFromKnowledgeRecord,
  compareSourceSnapshots,
  type SourceChangeRecord,
} from "@/lib/knowledge/sourceFingerprint";
import {
  clearSourceSnapshots,
  listSourceSnapshots,
  replaceSourceSnapshots,
} from "@/lib/knowledge/sourceSnapshotStore";
import {
  buildKnowledgeDocumentImpact,
  buildKnowledgeImpactQueue,
  buildKnowledgeWorkspaceInsights,
} from "@/lib/knowledge/workspaceInsights";
import { buildDocumentPerformanceProfile } from "@/lib/documents/documentPerformanceProfile";
import type { CreateDocumentOptions, DirtyKnowledgeDocument, DocumentData } from "@/types/document";

const scheduleIdleSync = (callback: () => void, timeout = 1200) => {
  const browserWindow = typeof window !== "undefined" ? window : undefined;

  if (browserWindow && "requestIdleCallback" in browserWindow) {
    const idleCallbackId = browserWindow.requestIdleCallback(callback, { timeout });

    return () => {
      browserWindow.cancelIdleCallback(idleCallbackId);
    };
  }

  const timeoutId = globalThis.setTimeout(callback, Math.min(timeout, 900));

  return () => {
    globalThis.clearTimeout(timeoutId);
  };
};

const getKnowledgeQueueDelay = (candidate: DirtyKnowledgeDocument) => {
  if (candidate.stage === "summary") {
    return 250;
  }

  switch (candidate.profile.kind) {
    case "heavy":
      return 1_400;
    case "large":
      return 500;
    default:
      return 120;
  }
};

const enqueueDirtyKnowledgeDocument = (
  queue: DirtyKnowledgeDocument[],
  candidate: DirtyKnowledgeDocument,
) => {
  const existingIndex = queue.findIndex((entry) => entry.documentId === candidate.documentId && entry.stage === candidate.stage);
  const nextQueue = [...queue];

  if (existingIndex >= 0) {
    nextQueue[existingIndex] = candidate;
    return nextQueue;
  }

  return [...nextQueue, candidate];
};

interface UseKnowledgeBaseOptions {
  activeDocumentId: string;
  createDocument: (options?: CreateDocumentOptions) => DocumentData;
  documents: DocumentData[];
  externalChangedSources?: SourceChangeRecord[];
  selectDocument: (id: string) => void;
}

export const useKnowledgeBase = ({
  activeDocumentId,
  createDocument,
  documents,
  externalChangedSources = [],
  selectDocument,
}: UseKnowledgeBaseOptions) => {
  const { t } = useI18n();
  const [knowledgeQuery, setKnowledgeQuery] = useState("");
  const [knowledgeSearchMode, setKnowledgeSearchMode] = useState<KnowledgeSearchMode>("semantic");
  const [knowledgeChangedSources, setKnowledgeChangedSources] = useState<SourceChangeRecord[]>([]);
  const [knowledgeLastRescannedAt, setKnowledgeLastRescannedAt] = useState<number | null>(null);
  const [knowledgeRecords, setKnowledgeRecords] = useState<KnowledgeDocumentRecord[]>([]);
  const [knowledgeReady, setKnowledgeReady] = useState(false);
  const [knowledgeRescanning, setKnowledgeRescanning] = useState(false);
  const [knowledgeSyncing, setKnowledgeSyncing] = useState(false);
  const [dirtyKnowledgeDocuments, setDirtyKnowledgeDocuments] = useState<DirtyKnowledgeDocument[]>([]);
  const [sourceSnapshotRecords, setSourceSnapshotRecords] = useState(() => [] as ReturnType<typeof buildSourceSnapshotRecordFromKnowledgeRecord>[]);
  const deferredDocuments = useDeferredValue(documents);
  const deferredKnowledgeQuery = useDeferredValue(knowledgeQuery);
  const deferredKnowledgeRecords = useDeferredValue(knowledgeRecords);
  const latestDocumentsRef = useRef<Map<string, DocumentData>>(new Map());
  const latestFingerprintsRef = useRef<Map<string, string>>(new Map());

  const deferredDocumentMap = useMemo(
    () => new Map(deferredDocuments.map((document) => [document.id, document])),
    [deferredDocuments],
  );
  const deferredFingerprintMap = useMemo(
    () => new Map(
      deferredDocuments.map((document) => [document.id, buildKnowledgeDocumentFingerprint(document)]),
    ),
    [deferredDocuments],
  );

  useEffect(() => {
    let cancelled = false;

    const hydrateKnowledgeBase = async () => {
      try {
        const [storedRecords, storedSnapshots] = await Promise.all([
          listKnowledgeRecords(),
          listSourceSnapshots(),
        ]);

        if (!cancelled) {
          startTransition(() => {
            setKnowledgeRecords(reconcileKnowledgeRecords(storedRecords, storedRecords));
          });
          setSourceSnapshotRecords(storedSnapshots);
          setKnowledgeLastRescannedAt(
            storedSnapshots.reduce<number | null>(
              (latest, snapshot) => (latest === null || snapshot.scannedAt > latest ? snapshot.scannedAt : latest),
              null,
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setKnowledgeReady(true);
        }
      }
    };

    void hydrateKnowledgeBase();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    latestDocumentsRef.current = deferredDocumentMap;
    const previousFingerprints = latestFingerprintsRef.current;
    const nextFingerprints = new Map(deferredFingerprintMap);
    const removedDocumentIds = [...previousFingerprints.keys()].filter((documentId) => !nextFingerprints.has(documentId));
    const nextDirtyQueue: DirtyKnowledgeDocument[] = [];
    const heavySummaryRecords: KnowledgeDocumentRecord[] = [];

    for (const removedDocumentId of removedDocumentIds) {
      void removeKnowledgeRecord(removedDocumentId);
    }

    for (const [documentId, fingerprint] of nextFingerprints) {
      const document = deferredDocumentMap.get(documentId);

      if (!document) {
        continue;
      }

      const previousFingerprint = previousFingerprints.get(documentId);

      if (previousFingerprint === fingerprint) {
        continue;
      }

      const profile = buildDocumentPerformanceProfile(document);

      if (profile.kind === "heavy") {
        const summaryRecord = buildKnowledgeRecordFromDocument(document, {
          indexedAt: Date.now(),
          stage: "summary",
        });

        if (summaryRecord) {
          heavySummaryRecords.push(summaryRecord);
        }

        nextDirtyQueue.push({
          documentId,
          fingerprint,
          profile,
          stage: "full",
        });
        continue;
      }

      nextDirtyQueue.push({
        documentId,
        fingerprint,
        profile,
        stage: "full",
      });
    }

    latestFingerprintsRef.current = nextFingerprints;

    if (removedDocumentIds.length > 0) {
      startTransition(() => {
        setKnowledgeRecords((previousRecords) =>
          previousRecords.filter((record) => !removedDocumentIds.includes(record.documentId)));
        setKnowledgeChangedSources((previousSources) =>
          previousSources.filter((source) => !removedDocumentIds.includes(source.documentId)));
      });
    }

    if (heavySummaryRecords.length > 0) {
      startTransition(() => {
        setKnowledgeRecords((previousRecords) =>
          reconcileKnowledgeRecords(
            mergeKnowledgeRecords(
              previousRecords.filter((record) =>
                !heavySummaryRecords.some((summaryRecord) => summaryRecord.documentId === record.documentId)),
              heavySummaryRecords,
            ),
            heavySummaryRecords,
          ));
      });
    }

    if (nextDirtyQueue.length > 0) {
      setDirtyKnowledgeDocuments((previousQueue) => {
        let queue = previousQueue.filter((entry) => !removedDocumentIds.includes(entry.documentId));

        for (const candidate of nextDirtyQueue) {
          queue = enqueueDirtyKnowledgeDocument(queue, candidate);
        }

        return queue;
      });
    }
  }, [deferredDocumentMap, deferredFingerprintMap]);

  useEffect(() => {
    if (dirtyKnowledgeDocuments.length === 0) {
      return;
    }

    const nextCandidate = dirtyKnowledgeDocuments[0];

    return scheduleIdleSync(() => {
      const document = latestDocumentsRef.current.get(nextCandidate.documentId);
      const latestFingerprint = latestFingerprintsRef.current.get(nextCandidate.documentId);

      if (!document || latestFingerprint !== nextCandidate.fingerprint) {
        setDirtyKnowledgeDocuments((previousQueue) => previousQueue.slice(1));
        return;
      }

      setKnowledgeSyncing(true);

      const nextRecord = buildKnowledgeRecordFromDocument(document, {
        indexedAt: Date.now(),
        stage: nextCandidate.stage,
      });

      void (async () => {
        try {
          if (!nextRecord) {
            await removeKnowledgeRecord(nextCandidate.documentId);
            startTransition(() => {
              setKnowledgeRecords((previousRecords) =>
                previousRecords.filter((record) => record.documentId !== nextCandidate.documentId));
            });
          } else {
            await upsertKnowledgeRecords([nextRecord]);
            startTransition(() => {
              setKnowledgeRecords((previousRecords) =>
                reconcileKnowledgeRecords(
                  mergeKnowledgeRecords(
                    previousRecords.filter((record) => record.documentId !== nextRecord.documentId),
                    [nextRecord],
                  ),
                  [nextRecord],
                ));
            });
          }
        } finally {
          setKnowledgeSyncing(false);
          setDirtyKnowledgeDocuments((previousQueue) => {
            let queue = previousQueue.slice(1);

            if (nextCandidate.profile.kind === "heavy" && nextCandidate.stage === "full") {
              return queue;
            }

            return queue;
          });
        }
      })();
    }, getKnowledgeQueueDelay(nextCandidate));
  }, [dirtyKnowledgeDocuments]);

  useEffect(() => {
    const liveDocumentIds = new Set(deferredDocuments.map((document) => document.id));
    startTransition(() => {
      setKnowledgeChangedSources((previousSources) =>
        previousSources.filter((source) => liveDocumentIds.has(source.documentId)));
    });
  }, [deferredDocuments]);

  const knowledgeSummary = useMemo(
    () => summarizeKnowledgeRecords(deferredKnowledgeRecords),
    [deferredKnowledgeRecords],
  );
  const knowledgeInsights = useMemo(
    () => buildKnowledgeWorkspaceInsights(deferredKnowledgeRecords),
    [deferredKnowledgeRecords],
  );
  const knowledgeActiveImpact = useMemo(
    () => buildKnowledgeDocumentImpact(deferredKnowledgeRecords, knowledgeInsights, activeDocumentId),
    [activeDocumentId, deferredKnowledgeRecords, knowledgeInsights],
  );
  const activeKnowledgeRecord = useMemo(
    () => deferredKnowledgeRecords.find((record) => record.documentId === activeDocumentId) || null,
    [activeDocumentId, deferredKnowledgeRecords],
  );
  const combinedChangedSources = useMemo(() => {
    const merged = new Map<string, SourceChangeRecord>();

    for (const source of [...knowledgeChangedSources, ...externalChangedSources]) {
      const key = `${source.documentId}:${source.sourceLabel || "local"}`;
      const previous = merged.get(key);

      if (!previous || previous.scannedAt <= source.scannedAt) {
        merged.set(key, source);
      }
    }

    return Array.from(merged.values()).sort((left, right) =>
      Number(left.changeType === "changed") - Number(right.changeType === "changed")
      || left.documentName.localeCompare(right.documentName));
  }, [externalChangedSources, knowledgeChangedSources]);
  const knowledgeImpactQueue = useMemo(
    () => buildKnowledgeImpactQueue(
      deferredKnowledgeRecords,
      knowledgeInsights,
      combinedChangedSources.map((source) => source.documentId),
    ),
    [combinedChangedSources, deferredKnowledgeRecords, knowledgeInsights],
  );
  const knowledgeConsistencyIssues = useMemo<KnowledgeConsistencyIssue[]>(() => {
    if (!activeKnowledgeRecord || !knowledgeActiveImpact) {
      return [];
    }

    const relatedDocumentIds = new Set(knowledgeActiveImpact.relatedDocuments.map((document) => document.documentId));
    const candidateRecords = deferredKnowledgeRecords.filter((record) => relatedDocumentIds.has(record.documentId));
    return buildKnowledgeConsistencyIssues(activeKnowledgeRecord, candidateRecords);
  }, [activeKnowledgeRecord, knowledgeActiveImpact, deferredKnowledgeRecords]);
  const knowledgeHealthIssues = useMemo(() => {
    const impactIssues = knowledgeActiveImpact?.issues || [];
    const consistencyHealthIssues = buildConsistencyHealthIssues(knowledgeConsistencyIssues);
    const outdatedIssues = knowledgeImpactQueue
      .filter((item) => item.impactedDocumentId === activeDocumentId)
      .map((item) => ({
        documentId: activeDocumentId,
        id: `issue:outdated_source:${item.changedDocumentId}:${item.impactedDocumentId}`,
        kind: "outdated_source" as const,
        message: `${item.impactedDocumentName} may need updates because ${item.changedDocumentName} changed during the last rescan.`,
        relatedDocumentIds: [item.changedDocumentId, item.impactedDocumentId],
        severity: "warning" as const,
      }));

    return Array.from(new Map(
      [...impactIssues, ...consistencyHealthIssues, ...outdatedIssues].map((issue) => [issue.id, issue]),
    ).values()).sort((left, right) =>
      Number(right.severity === "warning") - Number(left.severity === "warning")
      || left.message.localeCompare(right.message));
  }, [activeDocumentId, knowledgeActiveImpact, knowledgeConsistencyIssues, knowledgeImpactQueue]);

  const knowledgeResults = useMemo(
    () => searchKnowledgeRecords(deferredKnowledgeRecords, deferredKnowledgeQuery, 12, { mode: knowledgeSearchMode }),
    [deferredKnowledgeQuery, deferredKnowledgeRecords, knowledgeSearchMode],
  );

  const recentKnowledgeRecords = useMemo(
    () => buildKnowledgeRecentRecords(deferredKnowledgeRecords, 6),
    [deferredKnowledgeRecords],
  );

  const openKnowledgeRecord = useCallback((record: KnowledgeDocumentRecord, result?: KnowledgeSearchResult) => {
    const existingDocument = documents.find((document) => document.id === record.documentId);

    if (existingDocument) {
      selectDocument(existingDocument.id);
    } else {
      createDocument(buildDocumentOptionsFromKnowledgeRecord(record));
    }

    const sectionTitle = result?.kind === "chunk"
      ? result.match?.chunk.metadata?.sectionTitle
      : result?.image?.metadata?.sectionTitle;
    toast.success(
      sectionTitle
        ? t("knowledge.openedSection", {
          name: getKnowledgeRecordLabel(record),
          section: sectionTitle,
        })
        : t("knowledge.opened", { name: getKnowledgeRecordLabel(record) }),
    );
  }, [createDocument, documents, selectDocument, t]);

  const openKnowledgeResult = useCallback((result: KnowledgeSearchResult) => {
    openKnowledgeRecord(result.record, result);
  }, [openKnowledgeRecord]);

  const openKnowledgeDocumentById = useCallback((documentId: string) => {
    const existingDocument = documents.find((document) => document.id === documentId);

    if (existingDocument) {
      selectDocument(existingDocument.id);
      return;
    }

    const record = knowledgeRecords.find((candidate) => candidate.documentId === documentId);

    if (record) {
      openKnowledgeRecord(record);
    }
  }, [documents, knowledgeRecords, openKnowledgeRecord, selectDocument]);

  const deleteKnowledgeDocument = useCallback((documentId: string) => {
    setKnowledgeRecords((previousRecords) => previousRecords.filter((record) => record.documentId !== documentId));
    void removeKnowledgeRecord(documentId);
  }, []);

  const rescanKnowledgeSources = useCallback(async () => {
    setKnowledgeRescanning(true);

    try {
      const scannedAt = Date.now();
      const nextSnapshots = knowledgeRecords.map((record) =>
        buildSourceSnapshotRecordFromKnowledgeRecord(record, scannedAt));
      const changes = compareSourceSnapshots(sourceSnapshotRecords, nextSnapshots);

      await replaceSourceSnapshots(nextSnapshots);

      setSourceSnapshotRecords(nextSnapshots);
      setKnowledgeChangedSources(changes);
      setKnowledgeLastRescannedAt(scannedAt);

      if (changes.length === 0) {
        toast.info("Knowledge rescan finished with no detected source changes.");
        return;
      }

      toast.success(`Knowledge rescan detected ${changes.length} changed source${changes.length === 1 ? "" : "s"}.`);
    } finally {
      setKnowledgeRescanning(false);
    }
  }, [knowledgeRecords, sourceSnapshotRecords]);

  const resetKnowledgeBase = useCallback(async () => {
    setKnowledgeSyncing(true);

    try {
      await Promise.all([clearKnowledgeRecords(), clearSourceSnapshots()]);
      setKnowledgeQuery("");
      setKnowledgeChangedSources([]);
      setKnowledgeLastRescannedAt(null);
      setKnowledgeRecords([]);
      setDirtyKnowledgeDocuments([]);
      setSourceSnapshotRecords([]);
      toast.success(t("knowledge.resetDone"));
    } finally {
      setKnowledgeSyncing(false);
    }
  }, [t]);

  const rebuildKnowledgeBase = useCallback(async () => {
    setKnowledgeSyncing(true);

    try {
      const indexedAt = Date.now();
      const nextRecords = documents
        .map((document) => buildKnowledgeRecordFromDocument(document, { indexedAt }))
        .filter((record): record is KnowledgeDocumentRecord => Boolean(record));

      await clearKnowledgeRecords();

      if (nextRecords.length > 0) {
        await upsertKnowledgeRecords(nextRecords);
      }

      setKnowledgeRecords(reconcileKnowledgeRecords(nextRecords, nextRecords));
      setDirtyKnowledgeDocuments([]);
      toast.success(t("knowledge.rebuildDone", { count: nextRecords.length }));
    } finally {
      setKnowledgeSyncing(false);
    }
  }, [documents, t]);

  const reindexKnowledgeDocument = useCallback(async (documentId: string) => {
    const document = documents.find((candidate) => candidate.id === documentId);

    if (!document) {
      return;
    }

    const nextRecord = buildKnowledgeRecordFromDocument(document, { indexedAt: Date.now() });

    setKnowledgeSyncing(true);

    try {
      if (!nextRecord) {
        await removeKnowledgeRecord(documentId);
        setKnowledgeRecords((previousRecords) => previousRecords.filter((record) => record.documentId !== documentId));
        toast.success(t("knowledge.reindexRemoved", { name: document.name || t("common.untitled") }));
        return;
      }

      await upsertKnowledgeRecords([nextRecord]);
      setKnowledgeRecords((previousRecords) =>
        reconcileKnowledgeRecords(
          mergeKnowledgeRecords(previousRecords, [nextRecord]),
          [nextRecord],
        ));
      toast.success(t("knowledge.reindexDone", { name: getKnowledgeRecordLabel(nextRecord) }));
    } finally {
      setKnowledgeSyncing(false);
    }
  }, [documents, t]);

  return {
    deleteKnowledgeDocument,
    knowledgeDocumentCount: knowledgeSummary.documentCount,
    knowledgeFreshCount: knowledgeSummary.freshCount,
    knowledgeImageCount: knowledgeSummary.imageCount,
    knowledgeActiveImpact,
    knowledgeChangedSources: combinedChangedSources,
    knowledgeConsistencyIssues,
    knowledgeHealthIssues,
    knowledgeImpactQueue,
    knowledgeInsights,
    knowledgeLastIndexedAt: knowledgeSummary.lastIndexedAt,
    knowledgeLastRescannedAt,
    knowledgeQuery,
    knowledgeReady,
    knowledgeRecords,
    knowledgeRescanning,
    knowledgeResults,
    knowledgeSearchMode,
    knowledgeStaleCount: knowledgeSummary.staleCount,
    knowledgeSyncing,
    openKnowledgeDocumentById,
    openKnowledgeRecord,
    openKnowledgeResult,
    recentKnowledgeRecords,
    rebuildKnowledgeBase,
    reindexKnowledgeDocument,
    rescanKnowledgeSources,
    resetKnowledgeBase,
    setKnowledgeQuery,
    setKnowledgeSearchMode,
  };
};
