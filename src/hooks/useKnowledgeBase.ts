import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/useI18n";
import {
  buildConsistencyHealthIssues,
  buildKnowledgeConsistencyIssues,
  type KnowledgeConsistencyIssue,
} from "@/lib/knowledge/consistencyAnalysis";
import {
  buildDocumentOptionsFromKnowledgeRecord,
  buildKnowledgeRecordFromDocument,
  buildKnowledgeRecentRecords,
  getKnowledgeRecordLabel,
  mergeKnowledgeRecords,
  reconcileKnowledgeRecords,
  searchKnowledgeRecords,
  summarizeKnowledgeRecords,
  type KnowledgeDocumentRecord,
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
import type { CreateDocumentOptions, DocumentData } from "@/types/document";

interface UseKnowledgeBaseOptions {
  activeDocumentId: string;
  createDocument: (options?: CreateDocumentOptions) => DocumentData;
  documents: DocumentData[];
  selectDocument: (id: string) => void;
}

export const useKnowledgeBase = ({
  activeDocumentId,
  createDocument,
  documents,
  selectDocument,
}: UseKnowledgeBaseOptions) => {
  const { t } = useI18n();
  const [knowledgeQuery, setKnowledgeQuery] = useState("");
  const [knowledgeChangedSources, setKnowledgeChangedSources] = useState<SourceChangeRecord[]>([]);
  const [knowledgeLastRescannedAt, setKnowledgeLastRescannedAt] = useState<number | null>(null);
  const [knowledgeRecords, setKnowledgeRecords] = useState<KnowledgeDocumentRecord[]>([]);
  const [knowledgeReady, setKnowledgeReady] = useState(false);
  const [knowledgeRescanning, setKnowledgeRescanning] = useState(false);
  const [knowledgeSyncing, setKnowledgeSyncing] = useState(false);
  const [sourceSnapshotRecords, setSourceSnapshotRecords] = useState(() => [] as ReturnType<typeof buildSourceSnapshotRecordFromKnowledgeRecord>[]);

  const liveKnowledgeRecords = useMemo(
    () => documents
      .map((document) => buildKnowledgeRecordFromDocument(document))
      .filter((record): record is KnowledgeDocumentRecord => Boolean(record)),
    [documents],
  );
  const initialLiveKnowledgeRecords = useRef(liveKnowledgeRecords);

  useEffect(() => {
    let cancelled = false;

    const hydrateKnowledgeBase = async () => {
      try {
        const [storedRecords, storedSnapshots] = await Promise.all([
          listKnowledgeRecords(),
          listSourceSnapshots(),
        ]);

        if (!cancelled) {
          setKnowledgeRecords(reconcileKnowledgeRecords(storedRecords, initialLiveKnowledgeRecords.current));
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
    setKnowledgeRecords((previousRecords) => reconcileKnowledgeRecords(previousRecords, liveKnowledgeRecords));
  }, [liveKnowledgeRecords]);

  useEffect(() => {
    const liveDocumentIds = new Set(liveKnowledgeRecords.map((record) => record.documentId));
    setKnowledgeChangedSources((previousSources) =>
      previousSources.filter((source) => liveDocumentIds.has(source.documentId)));
  }, [liveKnowledgeRecords]);

  useEffect(() => {
    if (liveKnowledgeRecords.length === 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setKnowledgeSyncing(true);

      void upsertKnowledgeRecords(liveKnowledgeRecords)
        .then(() => {
          setKnowledgeRecords((previousRecords) =>
            reconcileKnowledgeRecords(
              mergeKnowledgeRecords(previousRecords, liveKnowledgeRecords),
              liveKnowledgeRecords,
            ));
        })
        .finally(() => {
          setKnowledgeSyncing(false);
        });
    }, 600);

    return () => {
      window.clearTimeout(timer);
    };
  }, [liveKnowledgeRecords]);

  const knowledgeSummary = useMemo(
    () => summarizeKnowledgeRecords(knowledgeRecords),
    [knowledgeRecords],
  );
  const knowledgeInsights = useMemo(
    () => buildKnowledgeWorkspaceInsights(knowledgeRecords),
    [knowledgeRecords],
  );
  const knowledgeActiveImpact = useMemo(
    () => buildKnowledgeDocumentImpact(knowledgeRecords, knowledgeInsights, activeDocumentId),
    [activeDocumentId, knowledgeInsights, knowledgeRecords],
  );
  const activeKnowledgeRecord = useMemo(
    () => knowledgeRecords.find((record) => record.documentId === activeDocumentId) || null,
    [activeDocumentId, knowledgeRecords],
  );
  const knowledgeImpactQueue = useMemo(
    () => buildKnowledgeImpactQueue(
      knowledgeRecords,
      knowledgeInsights,
      knowledgeChangedSources.map((source) => source.documentId),
    ),
    [knowledgeChangedSources, knowledgeInsights, knowledgeRecords],
  );
  const knowledgeConsistencyIssues = useMemo<KnowledgeConsistencyIssue[]>(() => {
    if (!activeKnowledgeRecord || !knowledgeActiveImpact) {
      return [];
    }

    const relatedDocumentIds = new Set(knowledgeActiveImpact.relatedDocuments.map((document) => document.documentId));
    const candidateRecords = knowledgeRecords.filter((record) => relatedDocumentIds.has(record.documentId));
    return buildKnowledgeConsistencyIssues(activeKnowledgeRecord, candidateRecords);
  }, [activeKnowledgeRecord, knowledgeActiveImpact, knowledgeRecords]);
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
    () => searchKnowledgeRecords(knowledgeRecords, knowledgeQuery, 12),
    [knowledgeRecords, knowledgeQuery],
  );

  const recentKnowledgeRecords = useMemo(
    () => buildKnowledgeRecentRecords(knowledgeRecords, 6),
    [knowledgeRecords],
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
      const nextSnapshots = liveKnowledgeRecords.map((record) =>
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
  }, [liveKnowledgeRecords, sourceSnapshotRecords]);

  const resetKnowledgeBase = useCallback(async () => {
    setKnowledgeSyncing(true);

    try {
      await Promise.all([clearKnowledgeRecords(), clearSourceSnapshots()]);
      setKnowledgeQuery("");
      setKnowledgeChangedSources([]);
      setKnowledgeLastRescannedAt(null);
      setKnowledgeRecords([]);
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
          mergeKnowledgeRecords(liveKnowledgeRecords, [nextRecord]),
        ));
      toast.success(t("knowledge.reindexDone", { name: getKnowledgeRecordLabel(nextRecord) }));
    } finally {
      setKnowledgeSyncing(false);
    }
  }, [documents, liveKnowledgeRecords, t]);

  return {
    deleteKnowledgeDocument,
    knowledgeDocumentCount: knowledgeSummary.documentCount,
    knowledgeFreshCount: knowledgeSummary.freshCount,
    knowledgeImageCount: knowledgeSummary.imageCount,
    knowledgeActiveImpact,
    knowledgeChangedSources,
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
    knowledgeStaleCount: knowledgeSummary.staleCount,
    knowledgeSyncing,
    openKnowledgeDocumentById,
    openKnowledgeRecord,
    openKnowledgeResult,
    recentKnowledgeRecords,
    rebuildKnowledgeBase,
    rescanKnowledgeSources,
    reindexKnowledgeDocument,
    resetKnowledgeBase,
    setKnowledgeQuery,
  };
};
