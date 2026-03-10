import { Suspense, lazy, useState } from "react";
import {
  BrainCircuit,
  Braces,
  Check,
  Clock,
  FileCode,
  FileJson,
  FilePlus,
  FileText,
  FileType,
  FolderOpen,
  History,
  LayoutTemplate,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import type {
  HistorySidebarPanelsProps,
  KnowledgeSidebarPanelsProps,
  SidebarTab,
} from "@/components/editor/sidebarFeatureTypes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { useI18n } from "@/i18n/useI18n";
import type { DocumentData, EditorMode } from "@/types/document";

const FileSidebarHistoryPanels = lazy(() => import("@/components/editor/FileSidebarHistoryPanels"));
const FileSidebarKnowledgePanels = lazy(() => import("@/components/editor/FileSidebarKnowledgePanels"));

const SidebarPanelFallback = () => (
  <div className="rounded-md border border-dashed border-border/60 px-3 py-3 text-xs text-muted-foreground">
    Loading...
  </div>
);

interface FileSidebarProps {
  activeDoc: DocumentData;
  activeDocId: string;
  createDocument: KnowledgeSidebarPanelsProps["createDocument"];
  documents: DocumentData[];
  historyEnabled: boolean;
  historyProps: HistorySidebarPanelsProps;
  knowledgeEnabled: boolean;
  knowledgeProps: Omit<KnowledgeSidebarPanelsProps, "activeDoc" | "activeDocId" | "createDocument" | "documents" | "onSelectDoc">;
  onDeleteDoc: (id: string) => void;
  onActivateHistory: () => void;
  onActivateKnowledge: () => void;
  onNewDoc: (mode?: EditorMode) => void;
  onOpenTemplates?: () => void;
  onOpenStructuredModes?: () => void;
  onRenameDoc: (id: string, name: string) => void;
  onSelectDoc: (id: string) => void;
  showStructuredCreateAction?: boolean;
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
  activeDoc,
  activeDocId,
  createDocument,
  documents,
  historyEnabled,
  historyProps,
  knowledgeEnabled,
  knowledgeProps,
  onDeleteDoc,
  onActivateHistory,
  onActivateKnowledge,
  onNewDoc,
  onOpenTemplates,
  onOpenStructuredModes,
  onRenameDoc,
  onSelectDoc,
  showStructuredCreateAction = false,
}: FileSidebarProps) => {
  const { t } = useI18n();
  const { isMobile, setOpenMobile } = useSidebar();
  const [activeTab, setActiveTab] = useState<SidebarTab>("documents");
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

  const activateTab = (tab: SidebarTab) => {
    setActiveTab(tab);

    if (tab === "knowledge" && !knowledgeEnabled) {
      onActivateKnowledge();
    }

    if (tab === "history" && !historyEnabled) {
      onActivateHistory();
    }
  };

  return (
    <Sidebar
      className="border-r border-border"
      collapsible="icon"
      mobileDescription={t("sidebar.mobileDescription")}
      mobileTitle={t("sidebar.title")}
    >
      <SidebarHeader className="p-3">
        <button
          className="flex items-center gap-2 rounded-md text-left outline-none transition-colors hover:bg-sidebar-accent/40 focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          onClick={() => {
            if (isMobile) {
              setOpenMobile(false);
            }
          }}
          type="button"
        >
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground group-data-[collapsible=icon]:hidden">
            {t("sidebar.title")}
          </span>
        </button>
        <div className="mt-3 grid grid-cols-3 gap-1 group-data-[collapsible=icon]:hidden">
          <Button
            className="h-7 justify-start gap-1.5 px-2 text-[11px]"
            onClick={() => activateTab("documents")}
            size="sm"
            type="button"
            variant={activeTab === "documents" ? "secondary" : "ghost"}
          >
            <FolderOpen className="h-3.5 w-3.5" />
            {t("sidebar.documents")}
          </Button>
          <Button
            className="h-7 justify-start gap-1.5 px-2 text-[11px]"
            onClick={() => activateTab("knowledge")}
            size="sm"
            type="button"
            variant={activeTab === "knowledge" ? "secondary" : "ghost"}
          >
            <BrainCircuit className="h-3.5 w-3.5" />
            {t("sidebar.knowledge")}
          </Button>
          <Button
            className="h-7 justify-start gap-1.5 px-2 text-[11px]"
            onClick={() => activateTab("history")}
            size="sm"
            type="button"
            variant={activeTab === "history" ? "secondary" : "ghost"}
          >
            <History className="h-3.5 w-3.5" />
            {t("sidebar.history")}
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {activeTab === "documents" && (
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
                        asChild
                        className={`group/item w-full ${isActive ? "bg-accent text-accent-foreground" : ""}`}
                      >
                        <div
                          onClick={() => !isEditing && onSelectDoc(document.id)}
                          onKeyDown={(event) => {
                            if (isEditing) {
                              return;
                            }

                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              onSelectDoc(document.id);
                            }
                          }}
                          role="button"
                          tabIndex={0}
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
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {knowledgeEnabled && (
          <SidebarGroup className={activeTab === "knowledge" ? "" : "hidden"}>
            <Separator className="mb-2 group-data-[collapsible=icon]:hidden" />
            <SidebarGroupContent>
              <Suspense fallback={<SidebarPanelFallback />}>
                <FileSidebarKnowledgePanels
                  activeDoc={activeDoc}
                  activeDocId={activeDocId}
                  acceptedPatchCount={knowledgeProps.acceptedPatchCount}
                  createDocument={createDocument}
                  documents={documents}
                  onDismissSuggestionQueueItem={knowledgeProps.onDismissSuggestionQueueItem}
                  onGenerateTocSuggestion={knowledgeProps.onGenerateTocSuggestion}
                  onOpenNextSuggestionQueueItem={knowledgeProps.onOpenNextSuggestionQueueItem}
                  onOpenPatchReview={knowledgeProps.onOpenPatchReview}
                  onOpenSuggestionQueueItem={knowledgeProps.onOpenSuggestionQueueItem}
                  onRetryFailedSuggestionQueueItems={knowledgeProps.onRetryFailedSuggestionQueueItems}
                  onRetrySuggestionQueueItem={knowledgeProps.onRetrySuggestionQueueItem}
                  onSelectDoc={onSelectDoc}
                  onSuggestKnowledgeImpactUpdate={knowledgeProps.onSuggestKnowledgeImpactUpdate}
                  onSuggestKnowledgeUpdates={knowledgeProps.onSuggestKnowledgeUpdates}
                  patchCount={knowledgeProps.patchCount}
                  suggestionQueue={knowledgeProps.suggestionQueue}
                />
              </Suspense>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {historyEnabled && (
          <SidebarGroup className={activeTab === "history" ? "" : "hidden"}>
            <Separator className="mb-2 group-data-[collapsible=icon]:hidden" />
            <SidebarGroupContent>
              <Suspense fallback={<SidebarPanelFallback />}>
                <FileSidebarHistoryPanels
                  activeDoc={historyProps.activeDoc}
                  onGenerateTocSuggestion={historyProps.onGenerateTocSuggestion}
                  onRestoreVersionSnapshot={historyProps.onRestoreVersionSnapshot}
                  versionHistoryReady={historyProps.versionHistoryReady}
                  versionHistoryRestoring={historyProps.versionHistoryRestoring}
                  versionHistorySnapshots={historyProps.versionHistorySnapshots}
                  versionHistorySyncing={historyProps.versionHistorySyncing}
                />
              </Suspense>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
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
          {showStructuredCreateAction ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-7 justify-start gap-1.5 text-xs group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0" size="sm" title={t("sidebar.structuredCreate")} variant="ghost">
                  <Braces className="h-3.5 w-3.5" />
                  <span className="group-data-[collapsible=icon]:hidden">{t("sidebar.structuredCreate")}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-36">
                <DropdownMenuItem onClick={() => { onOpenStructuredModes?.(); onNewDoc("json"); }} className="text-xs">
                  <FileJson className="mr-2 h-3.5 w-3.5" />
                  {t("sidebar.newJson")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { onOpenStructuredModes?.(); onNewDoc("yaml"); }} className="text-xs">
                  <Braces className="mr-2 h-3.5 w-3.5" />
                  {t("sidebar.newYaml")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button className="h-7 justify-start gap-1.5 text-xs group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0" onClick={() => onNewDoc("json")} size="sm" title={t("sidebar.newJson")} variant="ghost">
                <FileJson className="h-3.5 w-3.5" />
                <span className="group-data-[collapsible=icon]:hidden">{t("sidebar.newJson")}</span>
              </Button>
              <Button className="h-7 justify-start gap-1.5 text-xs group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0" onClick={() => onNewDoc("yaml")} size="sm" title={t("sidebar.newYaml")} variant="ghost">
                <Braces className="h-3.5 w-3.5" />
                <span className="group-data-[collapsible=icon]:hidden">{t("sidebar.newYaml")}</span>
              </Button>
            </>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default FileSidebar;
