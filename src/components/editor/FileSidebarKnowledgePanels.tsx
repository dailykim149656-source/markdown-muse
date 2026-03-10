import ChangeMonitoringPanel from "@/components/editor/ChangeMonitoringPanel";
import ConsistencyIssuesPanel from "@/components/editor/ConsistencyIssuesPanel";
import DocumentHealthPanel from "@/components/editor/DocumentHealthPanel";
import DocumentImpactPanel from "@/components/editor/DocumentImpactPanel";
import KnowledgeIndexPanel from "@/components/editor/KnowledgeIndexPanel";
import KnowledgeInsightsPanel from "@/components/editor/KnowledgeInsightsPanel";
import KnowledgeSearchPanel from "@/components/editor/KnowledgeSearchPanel";
import WorkspaceGraphPanel from "@/components/editor/WorkspaceGraphPanel";
import type { KnowledgeSidebarPanelsProps } from "@/components/editor/sidebarFeatureTypes";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";

const isRichTextDocument = (mode: KnowledgeSidebarPanelsProps["activeDoc"]["mode"]) =>
  mode === "markdown" || mode === "latex" || mode === "html";

const FileSidebarKnowledgePanels = ({
  activeDoc,
  activeDocId,
  createDocument,
  documents,
  onGenerateTocSuggestion,
  onSelectDoc,
  onSuggestKnowledgeImpactUpdate,
  onSuggestKnowledgeUpdates,
}: KnowledgeSidebarPanelsProps) => {
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
  } = useKnowledgeBase({
    activeDocumentId: activeDocId,
    createDocument,
    documents,
    selectDocument: onSelectDoc,
  });

  const suggestableKnowledgeDocumentIds = isRichTextDocument(activeDoc.mode)
    ? documents
      .filter((document) =>
        document.id !== activeDocId
        && (document.mode === "markdown" || document.mode === "latex" || document.mode === "html"))
      .map((document) => document.id)
    : [];

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
        onSuggestUpdates={onSuggestKnowledgeUpdates}
        suggestableDocumentIds={suggestableKnowledgeDocumentIds}
      />
      <WorkspaceGraphPanel
        insights={knowledgeInsights}
        onOpenDocument={openKnowledgeDocumentById}
      />
      <DocumentHealthPanel issues={knowledgeHealthIssues} />
      <ConsistencyIssuesPanel
        issues={knowledgeConsistencyIssues}
        onOpenDocument={openKnowledgeDocumentById}
        onSuggestUpdates={onSuggestKnowledgeUpdates}
        suggestableDocumentIds={suggestableKnowledgeDocumentIds}
      />
      <ChangeMonitoringPanel
        changedSources={knowledgeChangedSources}
        impactQueue={knowledgeImpactQueue}
        isRescanning={knowledgeRescanning}
        lastRescannedAt={knowledgeLastRescannedAt}
        onOpenDocument={openKnowledgeDocumentById}
        onRescan={() => {
          void rescanKnowledgeSources();
        }}
        onSuggestUpdates={onSuggestKnowledgeImpactUpdate}
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
        setQuery={setKnowledgeQuery}
      />
    </div>
  );
};

export default FileSidebarKnowledgePanels;
