import { Suspense, lazy, useEffect, useState } from "react";
import {
  BrainCircuit,
  Braces,
  Check,
  ChevronDown,
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
  DropdownMenuSeparator,
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
import type { EditorUiCapabilities } from "@/lib/editor/userProfiles";
import { getWorkspaceProviderLabel, getWorkspaceSyncLabel } from "@/lib/workspace/workspaceLabels";
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
  capabilities: Pick<EditorUiCapabilities, "canAccessHistory" | "canAccessKnowledge" | "canAccessStructuredModes">;
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
  knowledgePanelResetKey?: number;
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
  capabilities,
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
  knowledgePanelResetKey = 0,
  showStructuredCreateAction = false,
}: FileSidebarProps) => {
  const { t } = useI18n();
  const { isMobile, setOpenMobile } = useSidebar();
  const [activeTab, setActiveTab] = useState<SidebarTab>("documents");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const showKnowledgeTab = capabilities.canAccessKnowledge;
  const showHistoryTab = capabilities.canAccessHistory;

  useEffect(() => {
    if ((activeTab === "knowledge" && !showKnowledgeTab) || (activeTab === "history" && !showHistoryTab)) {
      setActiveTab("documents");
    }
  }, [activeTab, showHistoryTab, showKnowledgeTab]);

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
  const createDocumentOptions: Array<{
    icon: typeof FilePlus;
    key: string;
    mode: EditorMode;
    onSelect?: () => void;
  }> = [
    {
      icon: FilePlus,
      key: "sidebar.newMarkdown",
      mode: "markdown",
    },
    {
      icon: FileCode,
      key: "sidebar.newLatex",
      mode: "latex",
    },
    {
      icon: FileType,
      key: "sidebar.newHtml",
      mode: "html",
    },
    {
      icon: FileJson,
      key: "sidebar.newJson",
      mode: "json",
      onSelect: showStructuredCreateAction ? onOpenStructuredModes : undefined,
    },
    {
      icon: Braces,
      key: "sidebar.newYaml",
      mode: "yaml",
      onSelect: showStructuredCreateAction ? onOpenStructuredModes : undefined,
    },
  ];
  const visibleCreateDocumentOptions = createDocumentOptions.filter((option) =>
    capabilities.canAccessStructuredModes || (option.mode !== "json" && option.mode !== "yaml"));

  const structuredOptionsVisible = visibleCreateDocumentOptions.some((option) =>
    option.mode === "json" || option.mode === "yaml");

  const needsStructuredSeparator = visibleCreateDocumentOptions.some((option) =>
    option.mode === "markdown" || option.mode === "latex" || option.mode === "html")
    && structuredOptionsVisible;

  const activateTab = (tab: SidebarTab) => {
    setActiveTab(tab);

    if (tab === "knowledge" && showKnowledgeTab && !knowledgeEnabled) {
      onActivateKnowledge();
    }

    if (tab === "history" && showHistoryTab && !historyEnabled) {
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
          {showKnowledgeTab ? (
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
          ) : null}
          {showHistoryTab ? (
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
          ) : null}
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
                  const workspaceProviderLabel = getWorkspaceProviderLabel(document.workspaceBinding);
                  const workspaceSyncLabel = getWorkspaceSyncLabel(document.workspaceBinding);

                  return (
                    <SidebarMenuItem key={document.id}>
                      <SidebarMenuButton
                        asChild
                        className={`group/item w-full !h-auto !min-h-[4.75rem] !overflow-visible items-start py-2 ${isActive ? "bg-accent text-accent-foreground" : ""}`}
                      >
                        <div
                          className="flex min-h-0 w-full items-start gap-2"
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
                          <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                          <div className="min-w-0 flex-1 overflow-hidden group-data-[collapsible=icon]:hidden">
                            {isEditing ? (
                              <div className="flex min-w-0 items-center gap-1" onClick={(event) => event.stopPropagation()}>
                                <Input
                                  autoFocus
                                  className="h-5 w-full min-w-0 px-1 text-xs"
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
                              <div className="flex min-h-0 min-w-0 flex-col gap-1">
                                <div className="grid min-w-0 grid-cols-[1fr_auto] items-start gap-2">
                                  <div className="truncate text-xs font-medium leading-normal">
                                    {document.name || t("common.untitled")}
                                    <span className="ml-0.5 text-muted-foreground/60">{modeExtension(document.mode)}</span>
                                  </div>
                                  <div className="flex flex-shrink-0 items-center gap-0.5 self-start opacity-0 transition-opacity group-hover/item:opacity-100">
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
                                  </div>
                                </div>
                                <div className="flex min-w-0 items-center gap-1 text-[10px] leading-snug text-muted-foreground">
                                  <Clock className="h-2.5 w-2.5 shrink-0" />
                                  <span>{formatDate(document.updatedAt)}</span>
                                </div>
                                {workspaceProviderLabel && workspaceSyncLabel ? (
                                  <div className="break-words text-[10px] leading-snug text-muted-foreground">
                                    {workspaceProviderLabel} ??{workspaceSyncLabel}
                                  </div>
                                ) : null}
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

        {showKnowledgeTab && knowledgeEnabled && (
          <SidebarGroup className={activeTab === "knowledge" ? "" : "hidden"}>
            <Separator className="mb-2 group-data-[collapsible=icon]:hidden" />
            <SidebarGroupContent>
              <Suspense fallback={<SidebarPanelFallback />}>
                <FileSidebarKnowledgePanels
                  key={`knowledge-panels-${knowledgePanelResetKey}`}
                  activeDoc={activeDoc}
                  activeDocId={activeDocId}
                  createDocument={createDocument}
                  documents={documents}
                  onDismissSuggestionQueueItem={knowledgeProps.onDismissSuggestionQueueItem}
                  onGenerateTocSuggestion={knowledgeProps.onGenerateTocSuggestion}
                  onOpenSuggestionQueueItem={knowledgeProps.onOpenSuggestionQueueItem}
                  onRetrySuggestionQueueItem={knowledgeProps.onRetrySuggestionQueueItem}
                  onSelectDoc={onSelectDoc}
                  onSuggestKnowledgeImpactUpdate={knowledgeProps.onSuggestKnowledgeImpactUpdate}
                  onSuggestKnowledgeUpdates={knowledgeProps.onSuggestKnowledgeUpdates}
                  suggestionQueue={knowledgeProps.suggestionQueue}
                />
              </Suspense>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {showHistoryTab && historyEnabled && (
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="h-7 justify-between gap-1.5 text-xs group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
                size="sm"
                title={t("newDocument")}
                variant="ghost"
              >
                <span className="flex items-center gap-1.5">
                  <FilePlus className="h-3.5 w-3.5" />
                  <span className="group-data-[collapsible=icon]:hidden">{t("newDocument")}</span>
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-data-[collapsible=icon]:hidden" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              {visibleCreateDocumentOptions.map((option, index) => {
                const Icon = option.icon;
                const isStructured = option.mode === "json" || option.mode === "yaml";
                const showSeparator = needsStructuredSeparator && index > 0 && isStructured
                  && visibleCreateDocumentOptions[index - 1]
                  && visibleCreateDocumentOptions[index - 1].mode !== "json"
                  && visibleCreateDocumentOptions[index - 1].mode !== "yaml";

                return (
                  <div key={option.mode}>
                    {showSeparator ? <DropdownMenuSeparator /> : null}
                    <DropdownMenuItem
                      className="text-xs"
                      onClick={() => {
                        option.onSelect?.();
                        onNewDoc(option.mode);
                      }}
                    >
                      <Icon className="mr-2 h-3.5 w-3.5" />
                      {t(option.key)}
                      {isStructured && showStructuredCreateAction ? (
                        <span className="ml-auto text-[10px] text-muted-foreground">JSON/YAML</span>
                      ) : null}
                    </DropdownMenuItem>
                  </div>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default FileSidebar;

