import { useState } from "react";
import {
  Braces,
  Check,
  Clock,
  FileCode,
  FileJson,
  FilePlus,
  FileText,
  FileType,
  FolderOpen,
  LayoutTemplate,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import ChangeMonitoringPanel from "@/components/editor/ChangeMonitoringPanel";
import ConsistencyIssuesPanel from "@/components/editor/ConsistencyIssuesPanel";
import DocumentHealthPanel from "@/components/editor/DocumentHealthPanel";
import DocumentImpactPanel from "@/components/editor/DocumentImpactPanel";
import FormatConsistencyPanel from "@/components/editor/FormatConsistencyPanel";
import KnowledgeIndexPanel from "@/components/editor/KnowledgeIndexPanel";
import KnowledgeInsightsPanel from "@/components/editor/KnowledgeInsightsPanel";
import KnowledgeSearchPanel from "@/components/editor/KnowledgeSearchPanel";
import VersionHistoryPanel from "@/components/editor/VersionHistoryPanel";
import WorkspaceGraphPanel from "@/components/editor/WorkspaceGraphPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useI18n } from "@/i18n/useI18n";
import type { KnowledgeConsistencyIssue } from "@/lib/knowledge/consistencyAnalysis";
import type { KnowledgeDocumentRecord, KnowledgeSearchResult } from "@/lib/knowledge/knowledgeIndex";
import type { SourceChangeRecord } from "@/lib/knowledge/sourceFingerprint";
import type {
  KnowledgeDocumentImpact,
  KnowledgeHealthIssue,
  KnowledgeImpactQueueItem,
  KnowledgeWorkspaceInsights,
} from "@/lib/knowledge/workspaceInsights";
import type { DocumentData, EditorMode } from "@/types/document";
import type { DocumentVersionSnapshot } from "@/types/document";
import type { FormatConsistencyIssue } from "@/lib/analysis/formatConsistency";

interface FileSidebarProps {
  activeDocId: string;
  documents: DocumentData[];
  knowledgeActiveImpact: KnowledgeDocumentImpact | null;
  knowledgeDocumentCount: number;
  knowledgeFreshCount: number;
  knowledgeImageCount: number;
  knowledgeChangedSources: SourceChangeRecord[];
  knowledgeConsistencyIssues: KnowledgeConsistencyIssue[];
  knowledgeHealthIssues: KnowledgeHealthIssue[];
  formatConsistencyIssues: FormatConsistencyIssue[];
  knowledgeImpactQueue: KnowledgeImpactQueueItem[];
  knowledgeInsights: KnowledgeWorkspaceInsights;
  knowledgeLastIndexedAt: number | null;
  knowledgeLastRescannedAt: number | null;
  knowledgeQuery: string;
  knowledgeReady: boolean;
  knowledgeRescanning: boolean;
  knowledgeResults: KnowledgeSearchResult[];
  knowledgeStaleCount: number;
  knowledgeSyncing: boolean;
  onDeleteDoc: (id: string) => void;
  onOpenKnowledgeRecord: (record: KnowledgeDocumentRecord) => void;
  onOpenKnowledgeResult: (result: KnowledgeSearchResult) => void;
  onOpenRelatedKnowledgeDocument: (documentId: string) => void;
  onNewDoc: (mode?: EditorMode) => void;
  onOpenTemplates?: () => void;
  onRebuildKnowledgeBase: () => void;
  onReindexKnowledgeDocument: (documentId: string) => void;
  onRenameDoc: (id: string, name: string) => void;
  onRescanKnowledgeSources: () => void;
  onResetKnowledgeBase: () => void;
  onSelectDoc: (id: string) => void;
  onSuggestKnowledgeImpactUpdate: (sourceDocumentId: string, targetDocumentId: string) => void;
  onSuggestKnowledgeUpdates: (documentId: string) => void;
  onGenerateTocSuggestion?: () => void;
  recentKnowledgeRecords: KnowledgeDocumentRecord[];
  setKnowledgeQuery: (value: string) => void;
  suggestableKnowledgeDocumentIds: string[];
  versionHistoryReady: boolean;
  versionHistoryRestoring: boolean;
  versionHistorySnapshots: DocumentVersionSnapshot[];
  versionHistorySyncing: boolean;
  onRestoreVersionSnapshot: (snapshotId: string) => void;
}

const modeIcon = (mode: string) => {
  switch (mode) {
    case "latex":
      return FileCode;
    case "html":
      return FileType;
    case "json":
      return FileJson;
    case "yaml":
      return Braces;
    default:
      return FileText;
  }
};

const modeExtension = (mode: string) => {
  switch (mode) {
    case "latex":
      return ".tex";
    case "html":
      return ".html";
    case "json":
      return ".json";
    case "yaml":
      return ".yaml";
    default:
      return ".md";
  }
};

const FileSidebar = ({
  activeDocId,
  documents,
  knowledgeActiveImpact,
  knowledgeDocumentCount,
  knowledgeFreshCount,
  knowledgeImageCount,
  knowledgeChangedSources,
  knowledgeConsistencyIssues,
  knowledgeHealthIssues,
  formatConsistencyIssues,
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
  onDeleteDoc,
  onOpenKnowledgeRecord,
  onOpenKnowledgeResult,
  onOpenRelatedKnowledgeDocument,
  onNewDoc,
  onOpenTemplates,
  onRebuildKnowledgeBase,
  onReindexKnowledgeDocument,
  onRenameDoc,
  onRescanKnowledgeSources,
  onResetKnowledgeBase,
  onSelectDoc,
  onSuggestKnowledgeImpactUpdate,
  onSuggestKnowledgeUpdates,
  onGenerateTocSuggestion,
  recentKnowledgeRecords,
  setKnowledgeQuery,
  suggestableKnowledgeDocumentIds,
  versionHistoryReady,
  versionHistoryRestoring,
  versionHistorySnapshots,
  versionHistorySyncing,
  onRestoreVersionSnapshot,
}: FileSidebarProps) => {
  const { t } = useI18n();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const formatDate = (timestamp: number) => {
    const documentDate = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - timestamp;

    if (diff < 60_000) {
      return t("sidebar.justNow");
    }

    if (diff < 3_600_000) {
      return t("sidebar.minutesAgo", { count: Math.floor(diff / 60_000) });
    }

    if (diff < 86_400_000) {
      return t("sidebar.hoursAgo", { count: Math.floor(diff / 3_600_000) });
    }

    if (documentDate.toDateString() === now.toDateString()) {
      return t("sidebar.today");
    }

    return `${documentDate.getMonth() + 1}/${documentDate.getDate()}`;
  };

  const startRename = (document: DocumentData) => {
    setEditingId(document.id);
    setEditName(document.name);
  };

  const confirmRename = () => {
    if (editingId && editName.trim()) {
      onRenameDoc(editingId, editName.trim());
    }

    setEditingId(null);
  };

  const sortedDocuments = [...documents].sort((leftDocument, rightDocument) => rightDocument.updatedAt - leftDocument.updatedAt);

  return (
    <Sidebar className="border-r border-border" collapsible="icon">
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground group-data-[collapsible=icon]:hidden">
            {t("sidebar.title")}
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] group-data-[collapsible=icon]:hidden">
            {t("sidebar.documents")} ({documents.length})
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sortedDocuments.map((document) => {
                const Icon = modeIcon(document.mode);
                const isActive = document.id === activeDocId;
                const isEditing = editingId === document.id;

                return (
                  <SidebarMenuItem key={document.id}>
                    <SidebarMenuButton
                      className={`group/item w-full ${isActive ? "bg-accent text-accent-foreground" : ""}`}
                      onClick={() => !isEditing && onSelectDoc(document.id)}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                        {isEditing ? (
                          <div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
                            <Input
                              autoFocus
                              className="h-5 px-1 text-xs"
                              onChange={(event) => setEditName(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  confirmRename();
                                }

                                if (event.key === "Escape") {
                                  setEditingId(null);
                                }
                              }}
                              value={editName}
                            />
                            <Button className="h-5 w-5 p-0" onClick={confirmRename} size="sm" variant="ghost">
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button className="h-5 w-5 p-0" onClick={() => setEditingId(null)} size="sm" variant="ghost">
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="min-w-0">
                              <div className="truncate text-xs font-medium">
                                {document.name || t("common.untitled")}
                                <span className="ml-0.5 text-muted-foreground/60">{modeExtension(document.mode)}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Clock className="h-2.5 w-2.5" />
                                {formatDate(document.updatedAt)}
                              </div>
                            </div>
                            <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover/item:opacity-100">
                              <button
                                className="rounded p-0.5 hover:bg-secondary"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  startRename(document);
                                }}
                                title={t("sidebar.rename")}
                                type="button"
                              >
                                <Pencil className="h-3 w-3 text-muted-foreground" />
                              </button>
                              {documents.length > 1 && (
                                <button
                                  className="rounded p-0.5 hover:bg-destructive/10"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onDeleteDoc(document.id);
                                  }}
                                  title={t("sidebar.delete")}
                                  type="button"
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <Separator className="mb-2 group-data-[collapsible=icon]:hidden" />
          <SidebarGroupContent>
            <FormatConsistencyPanel
              issues={formatConsistencyIssues}
              onGenerateToc={onGenerateTocSuggestion}
            />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <Separator className="mb-2 group-data-[collapsible=icon]:hidden" />
          <SidebarGroupContent>
            <VersionHistoryPanel
              isReady={versionHistoryReady}
              isRestoring={versionHistoryRestoring}
              isSyncing={versionHistorySyncing}
              onRestore={onRestoreVersionSnapshot}
              snapshots={versionHistorySnapshots}
            />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <Separator className="mb-2 group-data-[collapsible=icon]:hidden" />
          <SidebarGroupContent>
            <KnowledgeIndexPanel
              freshCount={knowledgeFreshCount}
              imageCount={knowledgeImageCount}
              isSyncing={knowledgeSyncing}
              lastIndexedAt={knowledgeLastIndexedAt}
              onRebuild={onRebuildKnowledgeBase}
              onReindexActive={() => onReindexKnowledgeDocument(activeDocId)}
              onReset={onResetKnowledgeBase}
              staleCount={knowledgeStaleCount}
            />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <Separator className="mb-2 group-data-[collapsible=icon]:hidden" />
          <SidebarGroupContent>
            <DocumentImpactPanel
              impact={knowledgeActiveImpact}
              onOpenDocument={onOpenRelatedKnowledgeDocument}
              onSuggestUpdates={onSuggestKnowledgeUpdates}
              suggestableDocumentIds={suggestableKnowledgeDocumentIds}
            />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <Separator className="mb-2 group-data-[collapsible=icon]:hidden" />
          <SidebarGroupContent>
            <WorkspaceGraphPanel
              insights={knowledgeInsights}
              onOpenDocument={onOpenRelatedKnowledgeDocument}
            />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <Separator className="mb-2 group-data-[collapsible=icon]:hidden" />
          <SidebarGroupContent>
            <DocumentHealthPanel issues={knowledgeHealthIssues} />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <Separator className="mb-2 group-data-[collapsible=icon]:hidden" />
          <SidebarGroupContent>
            <ConsistencyIssuesPanel
              issues={knowledgeConsistencyIssues}
              onOpenDocument={onOpenRelatedKnowledgeDocument}
              onSuggestUpdates={onSuggestKnowledgeUpdates}
              suggestableDocumentIds={suggestableKnowledgeDocumentIds}
            />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <Separator className="mb-2 group-data-[collapsible=icon]:hidden" />
          <SidebarGroupContent>
            <ChangeMonitoringPanel
              changedSources={knowledgeChangedSources}
              impactQueue={knowledgeImpactQueue}
              isRescanning={knowledgeRescanning}
              lastRescannedAt={knowledgeLastRescannedAt}
              onOpenDocument={onOpenRelatedKnowledgeDocument}
              onRescan={onRescanKnowledgeSources}
              onSuggestUpdates={onSuggestKnowledgeImpactUpdate}
            />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <Separator className="mb-2 group-data-[collapsible=icon]:hidden" />
          <SidebarGroupContent>
            <KnowledgeInsightsPanel
              issues={knowledgeInsights.issues}
              summary={knowledgeInsights.summary}
            />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <Separator className="mb-2 group-data-[collapsible=icon]:hidden" />
          <SidebarGroupContent>
            <KnowledgeSearchPanel
              indexedDocumentCount={knowledgeDocumentCount}
              isReady={knowledgeReady}
              isSyncing={knowledgeSyncing}
              onOpenRecord={onOpenKnowledgeRecord}
              onOpenResult={onOpenKnowledgeResult}
              query={knowledgeQuery}
              recentRecords={recentKnowledgeRecords}
              results={knowledgeResults}
              setQuery={setKnowledgeQuery}
            />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 group-data-[collapsible=icon]:p-1">
        <Separator className="mb-2 group-data-[collapsible=icon]:hidden" />
        <div className="flex flex-col gap-1 group-data-[collapsible=icon]:items-center">
          {onOpenTemplates && (
            <Button
              className="mb-1 h-7 justify-start gap-1.5 text-xs group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
              onClick={onOpenTemplates}
              size="sm"
              title={t("sidebar.templates")}
              variant="outline"
            >
              <LayoutTemplate className="h-3.5 w-3.5" />
              <span className="group-data-[collapsible=icon]:hidden">{t("sidebar.templates")}</span>
            </Button>
          )}
          <Button className="h-7 justify-start gap-1.5 text-xs group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0" onClick={() => onNewDoc("markdown")} size="sm" title={t("sidebar.newMarkdown")} variant="ghost">
            <FilePlus className="h-3.5 w-3.5" />
            <span className="group-data-[collapsible=icon]:hidden">{t("sidebar.newMarkdown")}</span>
          </Button>
          <Button className="h-7 justify-start gap-1.5 text-xs group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0" onClick={() => onNewDoc("latex")} size="sm" title={t("sidebar.newLatex")} variant="ghost">
            <FileCode className="h-3.5 w-3.5" />
            <span className="group-data-[collapsible=icon]:hidden">{t("sidebar.newLatex")}</span>
          </Button>
          <Button className="h-7 justify-start gap-1.5 text-xs group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0" onClick={() => onNewDoc("html")} size="sm" title={t("sidebar.newHtml")} variant="ghost">
            <FileType className="h-3.5 w-3.5" />
            <span className="group-data-[collapsible=icon]:hidden">{t("sidebar.newHtml")}</span>
          </Button>
          <Button className="h-7 justify-start gap-1.5 text-xs group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0" onClick={() => onNewDoc("json")} size="sm" title={t("sidebar.newJson")} variant="ghost">
            <FileJson className="h-3.5 w-3.5" />
            <span className="group-data-[collapsible=icon]:hidden">{t("sidebar.newJson")}</span>
          </Button>
          <Button className="h-7 justify-start gap-1.5 text-xs group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0" onClick={() => onNewDoc("yaml")} size="sm" title={t("sidebar.newYaml")} variant="ghost">
            <Braces className="h-3.5 w-3.5" />
            <span className="group-data-[collapsible=icon]:hidden">{t("sidebar.newYaml")}</span>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default FileSidebar;
