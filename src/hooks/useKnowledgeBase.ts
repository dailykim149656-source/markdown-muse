import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/useI18n";
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
import { buildKnowledgeDocumentImpact, buildKnowledgeWorkspaceInsights } from "@/lib/knowledge/workspaceInsights";
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
  const [knowledgeRecords, setKnowledgeRecords] = useState<KnowledgeDocumentRecord[]>([]);
  const [knowledgeReady, setKnowledgeReady] = useState(false);
  const [knowledgeSyncing, setKnowledgeSyncing] = useState(false);

  const liveKnowledgeRecords = useMemo(
    () => documents
      .map((document) => buildKnowledgeRecordFromDocument(document))
      .filter((record): record is KnowledgeDocumentRecord => Boolean(record)),
    [documents],
  );

  useEffect(() => {
    let cancelled = false;

    const hydrateKnowledgeBase = async () => {
      try {
        const storedRecords = await listKnowledgeRecords();

        if (!cancelled) {
          setKnowledgeRecords(reconcileKnowledgeRecords(storedRecords, liveKnowledgeRecords));
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

  const resetKnowledgeBase = useCallback(async () => {
    setKnowledgeSyncing(true);

    try {
      await clearKnowledgeRecords();
      setKnowledgeQuery("");
      setKnowledgeRecords([]);
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
    knowledgeInsights,
    knowledgeLastIndexedAt: knowledgeSummary.lastIndexedAt,
    knowledgeQuery,
    knowledgeReady,
    knowledgeRecords,
    knowledgeResults,
    knowledgeStaleCount: knowledgeSummary.staleCount,
    knowledgeSyncing,
    openKnowledgeDocumentById,
    openKnowledgeRecord,
    openKnowledgeResult,
    recentKnowledgeRecords,
    rebuildKnowledgeBase,
    reindexKnowledgeDocument,
    resetKnowledgeBase,
    setKnowledgeQuery,
  };
};
