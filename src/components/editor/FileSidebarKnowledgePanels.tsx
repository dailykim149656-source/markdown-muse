import { useEffect, useState } from "react";
import ChangeMonitoringPanel from "@/components/editor/ChangeMonitoringPanel";
import ConsistencyIssuesPanel from "@/components/editor/ConsistencyIssuesPanel";
import DocumentHealthPanel from "@/components/editor/DocumentHealthPanel";
import DocumentImpactPanel from "@/components/editor/DocumentImpactPanel";
import KnowledgeIndexPanel from "@/components/editor/KnowledgeIndexPanel";
import KnowledgeInsightsPanel from "@/components/editor/KnowledgeInsightsPanel";
import KnowledgeOperationsPanel from "@/components/editor/KnowledgeOperationsPanel";
import KnowledgeSearchPanel from "@/components/editor/KnowledgeSearchPanel";
import ReleaseChecklistPanel, {
  CHECKLIST_ITEM_IDS,
  RELEASE_CHECKLIST_STORAGE_KEY,
  type ChecklistItemId,
} from "@/components/editor/ReleaseChecklistPanel";
import SuggestionQueuePanel from "@/components/editor/SuggestionQueuePanel";
import WorkspaceGraphPanel from "@/components/editor/WorkspaceGraphPanel";
import type { KnowledgeSidebarPanelsProps } from "@/components/editor/sidebarFeatureTypes";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { setPendingEditorFocusTarget } from "@/lib/editor/editorFocusTarget";
import type { KnowledgeGraphNavigationTarget } from "@/lib/knowledge/workspaceInsights";
import { useNavigate } from "react-router-dom";

const isRichTextDocument = (mode: KnowledgeSidebarPanelsProps["activeDoc"]["mode"]) =>
  mode === "markdown" || mode === "latex" || mode === "html";

const readStoredChecklist = (): ChecklistItemId[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(RELEASE_CHECKLIST_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((value): value is ChecklistItemId =>
      typeof value === "string" && CHECKLIST_ITEM_IDS.includes(value as ChecklistItemId));
  } catch {
    return [];
  }
};

type KnowledgeGraphNavigationRequest = {
  context: "change" | "consistency" | "impact";
  issueId?: string;
  issueKind?: "changed_section" | "conflicting_procedure" | "missing_section";
  issuePriority?: "high" | "low" | "medium";
  issueReason?: string;
  nodeDocumentId: string;
  sourceDocumentId: string;
  targetDocumentId: string;
};

const FileSidebarKnowledgePanels = ({
  activeDoc,
  activeDocId,
  acceptedPatchCount,
  createDocument,
  documents,
  onDismissSuggestionQueueItem,
  onGenerateTocSuggestion,
  onOpenNextSuggestionQueueItem,
  onOpenPatchReview,
  onRefreshWorkspaceDocument,
  onRescanWorkspaceSources,
  onOpenSuggestionQueueItem,
  onRetryFailedSuggestionQueueItems,
  onRetrySuggestionQueueItem,
  onSelectDoc,
  onSuggestKnowledgeImpactUpdate,
  onSuggestKnowledgeUpdates,
  patchCount,
  suggestionQueue,
  workspaceChangedSources = [],
  workspaceLastRescannedAt = null,
  workspaceRescanning = false,
}: KnowledgeSidebarPanelsProps) => {
  const navigate = useNavigate();
  const [releaseChecklistCheckedIds, setReleaseChecklistCheckedIds] = useState<ChecklistItemId[]>(() => readStoredChecklist());
  const {
    knowledgeActiveImpact,
    knowledgeChangedSources,
    knowledgeConsistencyIssues,
    knowledgeDocumentCount,
    knowledgeFreshCount,
    knowledgeHealthIssues,
    knowledgeImageCount,
    knowledgeImpactQueue,
    knowledgeInsights,
    knowledgeLastIndexedAt,
    knowledgeLastRescannedAt,
    knowledgeQuery,
    knowledgeReady,
    knowledgeRescanning,
    knowledgeResults,
    knowledgeSearchMode,
    knowledgeStaleCount,
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
    setKnowledgeSearchMode,
  } = useKnowledgeBase({
    activeDocumentId: activeDocId,
    createDocument,
    documents,
    externalChangedSources: workspaceChangedSources,
    selectDocument: onSelectDoc,
  });

  const suggestableKnowledgeDocumentIds = isRichTextDocument(activeDoc.mode)
    ? documents
      .filter((document) =>
        document.id !== activeDocId
        && (document.mode === "markdown" || document.mode === "latex" || document.mode === "html"))
      .map((document) => document.id)
    : [];
  const openKnowledgeGraphTarget = (target: KnowledgeGraphNavigationTarget) => {
    setPendingEditorFocusTarget(target);
    openKnowledgeDocumentById(target.documentId);
  };
  const openKnowledgeGraph = ({
    context,
    issueId,
    issueKind,
    issuePriority,
    issueReason,
    nodeDocumentId,
    sourceDocumentId,
    targetDocumentId,
  }: KnowledgeGraphNavigationRequest) => {
    const searchParams = new URLSearchParams();

    searchParams.set("context", context);
    searchParams.set("node", `doc:${nodeDocumentId}`);
    searchParams.set("source", `doc:${sourceDocumentId}`);
    searchParams.set("target", `doc:${targetDocumentId}`);

    if (issueKind) {
      searchParams.set("issue", issueKind);
    }

    if (issueId) {
      searchParams.set("issueId", issueId);
    }

    if (issuePriority) {
      searchParams.set("issuePriority", issuePriority);
    }

    if (issueReason) {
      searchParams.set("issueReason", issueReason);
    }

    navigate(`/editor/graph?${searchParams.toString()}`);
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(RELEASE_CHECKLIST_STORAGE_KEY, JSON.stringify(releaseChecklistCheckedIds));
  }, [releaseChecklistCheckedIds]);

  return (
    <div className="space-y-4">
      <KnowledgeIndexPanel
        freshCount={knowledgeFreshCount}
        imageCount={knowledgeImageCount}
        isSyncing={knowledgeSyncing}
        lastIndexedAt={knowledgeLastIndexedAt}
        onRebuild={rebuildKnowledgeBase}
        onReindexActive={() => reindexKnowledgeDocument(activeDocId)}
        onReset={resetKnowledgeBase}
        staleCount={knowledgeStaleCount}
      />
      <DocumentImpactPanel
        impact={knowledgeActiveImpact}
        onOpenDocument={openKnowledgeDocumentById}
        onOpenGraph={openKnowledgeGraph}
        onSuggestUpdates={(documentId) => onSuggestKnowledgeUpdates(documentId, {
          queueContext: "impact",
          sourceDocumentId: activeDocId,
          sourceDocumentName: activeDoc.name,
        })}
        suggestableDocumentIds={suggestableKnowledgeDocumentIds}
      />
      <WorkspaceGraphPanel
        activeDocumentId={activeDocId}
        insights={knowledgeInsights}
        onOpenDocument={openKnowledgeGraphTarget}
      />
      <DocumentHealthPanel issues={knowledgeHealthIssues} />
      <ConsistencyIssuesPanel
        activeDocumentId={activeDocId}
        activeDocumentName={activeDoc.name}
        issues={knowledgeConsistencyIssues}
        onOpenDocument={openKnowledgeDocumentById}
        onOpenGraph={openKnowledgeGraph}
        onSuggestUpdates={({ issueId, issueKind, issuePriority, issueReason, sourceDocumentId, sourceDocumentName, targetDocumentId, targetDocumentName }) => {
          const context = {
            issueId,
            issueKind,
            issuePriority,
            issueReason,
            queueContext: "consistency" as const,
            sourceDocumentId,
            sourceDocumentName,
            targetDocumentName,
          };

          if (sourceDocumentId === activeDocId) {
            onSuggestKnowledgeUpdates(targetDocumentId, context);
            return;
          }

          onSuggestKnowledgeImpactUpdate(sourceDocumentId, targetDocumentId, context);
        }}
        suggestableDocumentIds={suggestableKnowledgeDocumentIds}
      />
      <ChangeMonitoringPanel
        changedSources={knowledgeChangedSources}
        impactQueue={knowledgeImpactQueue}
        isRescanning={knowledgeRescanning || workspaceRescanning}
        lastRescannedAt={workspaceLastRescannedAt || knowledgeLastRescannedAt}
        onOpenDocument={openKnowledgeDocumentById}
        onRefreshDocument={onRefreshWorkspaceDocument}
        onOpenGraph={openKnowledgeGraph}
        onRescan={() => {
          void rescanKnowledgeSources();
          void onRescanWorkspaceSources?.();
        }}
        onSuggestUpdates={(sourceDocumentId, targetDocumentId) => {
          onSuggestKnowledgeImpactUpdate(sourceDocumentId, targetDocumentId, {
            queueContext: "change",
            sourceDocumentId,
          });
        }}
      />
      <KnowledgeOperationsPanel
        acceptedPatchCount={acceptedPatchCount}
        checklistCompletedCount={releaseChecklistCheckedIds.length}
        checklistTotalCount={CHECKLIST_ITEM_IDS.length}
        documentCount={knowledgeDocumentCount}
        edgeCount={knowledgeInsights.summary.edgeCount}
        issueCount={knowledgeHealthIssues.length}
        nodeCount={
          knowledgeInsights.summary.documentNodeCount
          + knowledgeInsights.summary.sectionNodeCount
          + knowledgeInsights.summary.imageNodeCount
        }
        onOpenNextReady={onOpenNextSuggestionQueueItem}
        onOpenPatchReview={onOpenPatchReview}
        onRetryFailed={onRetryFailedSuggestionQueueItems}
        patchCount={patchCount}
        queue={suggestionQueue}
      />
      <ReleaseChecklistPanel
        checkedItemIds={releaseChecklistCheckedIds}
        onReset={() => setReleaseChecklistCheckedIds([])}
        onToggleItem={(itemId) => {
          setReleaseChecklistCheckedIds((current) => (
            current.includes(itemId)
              ? current.filter((value) => value !== itemId)
              : [...current, itemId]
          ));
        }}
      />
      <SuggestionQueuePanel
        entries={suggestionQueue}
        onDismiss={onDismissSuggestionQueueItem}
        onOpenDocument={openKnowledgeDocumentById}
        onOpenGraph={(queueItemId) => {
          const entry = suggestionQueue.find((item) => item.id === queueItemId);

          if (!entry) {
            return;
          }

          openKnowledgeGraph({
            context: entry.context,
            issueId: entry.issueId,
            issueKind: entry.issueKind,
            issuePriority: entry.issuePriority,
            issueReason: entry.issueReason,
            nodeDocumentId: entry.targetDocumentId,
            sourceDocumentId: entry.sourceDocumentId,
            targetDocumentId: entry.targetDocumentId,
          });
        }}
        onOpenPatchReview={onOpenSuggestionQueueItem}
        onRetry={onRetrySuggestionQueueItem}
      />
      <KnowledgeInsightsPanel
        issues={knowledgeInsights.issues}
        summary={knowledgeInsights.summary}
      />
      <KnowledgeSearchPanel
        indexedDocumentCount={knowledgeDocumentCount}
        isReady={knowledgeReady}
        isSyncing={knowledgeSyncing}
        onOpenRecord={openKnowledgeRecord}
        onOpenResult={openKnowledgeResult}
        query={knowledgeQuery}
        recentRecords={recentKnowledgeRecords}
        results={knowledgeResults}
        searchMode={knowledgeSearchMode}
        setQuery={setKnowledgeQuery}
        setSearchMode={setKnowledgeSearchMode}
      />
    </div>
  );
};

export default FileSidebarKnowledgePanels;
