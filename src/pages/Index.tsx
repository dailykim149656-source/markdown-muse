import type { JSONContent } from "@tiptap/core";
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { useSearchParams } from "react-router-dom";
import type { AiAssistantRuntimeState } from "@/components/editor/AiAssistantRuntime";
import {
  htmlHasAdvancedContent,
  htmlHasDocumentContent,
  markdownHasAdvancedContent,
  markdownHasDocumentContent,
} from "@/components/editor/editorAdvancedContent";
import EditorWorkspace from "@/components/editor/EditorWorkspace";
import ResetDocumentsDialog from "@/components/editor/ResetDocumentsDialog";
import type { DocumentTemplate } from "@/components/editor/TemplateDialog";
import type { PlainTextFindReplaceAdapter } from "@/components/editor/findReplaceTypes";
import type { KnowledgeSuggestionContext, KnowledgeSuggestionQueueItem } from "@/components/editor/sidebarFeatureTypes";
import { useDocumentManager } from "@/hooks/useDocumentManager";
import { MAX_IMPORT_FILE_SIZE_BYTES, resolveImportedDocumentOptions, useDocumentIO } from "@/hooks/useDocumentIO";
import { useEditorUiState } from "@/hooks/useEditorUiState";
import { useFormatConversion } from "@/hooks/useFormatConversion";
import { usePatchReview } from "@/hooks/usePatchReview";
import { useTexAutoFix } from "@/hooks/useTexAutoFix";
import { useTexValidation } from "@/hooks/useTexValidation";
import { useWorkspaceFiles } from "@/hooks/useWorkspaceFiles";
import { useWorkspaceAuth } from "@/hooks/useWorkspaceAuth";
import { useWorkspaceChanges } from "@/hooks/useWorkspaceChanges";
import { useWorkspaceExport } from "@/hooks/useWorkspaceExport";
import { useWorkspaceSync } from "@/hooks/useWorkspaceSync";
import { useI18n } from "@/i18n/useI18n";
import { useVersionHistory } from "@/hooks/useVersionHistory";
import { serializeTiptapToAst } from "@/lib/ast/tiptapAst";
import { featureFlags, isWebProfile } from "@/lib/appProfile";
import {
  readAdvancedBlocksPreference,
  readDocumentToolsPreference,
  writeAdvancedBlocksPreference,
  writeDocumentToolsPreference,
} from "@/lib/editor/webEditorPreferences";
import {
  clearPendingEditorFocusTarget,
  getPendingEditorFocusTarget,
} from "@/lib/editor/editorFocusTarget";
import { scrollToEditorFocusTarget } from "@/lib/editor/editorFocusNavigation";
import {
  getCrossFamilyModes,
  getSameFamilyModes,
} from "@/lib/editor/modeFamilies";
import { resetLocalDocumentState } from "@/lib/documents/resetLocalDocumentState";
import { RESTORED_SESSION_TOAST_ID, showRestoredSessionToast } from "@/lib/documents/restoredSessionToast";
import { DOC_SHARE_HASH_PREFIX } from "@/lib/share/shareConstants";
import type { EditorMode } from "@/types/document";
import type { DocumentPatchSet } from "@/types/documentPatch";
import type { AgentNewDocumentDraft } from "@/types/liveAgent";
import { toast } from "sonner";

const MarkdownEditor = lazy(() => import("@/components/editor/MarkdownEditor"));
const LatexEditor = lazy(() => import("@/components/editor/LatexEditor"));
const HtmlEditor = lazy(() => import("@/components/editor/HtmlEditor"));
const JsonYamlEditor = lazy(() => import("@/components/editor/JsonYamlEditor"));
const AiAssistantRuntime = lazy(() => import("@/components/editor/AiAssistantRuntime"));
const WorkspaceConnectionDialog = lazy(() => import("@/components/editor/WorkspaceConnectionDialog"));
const WorkspaceExportDialog = lazy(() => import("@/components/editor/WorkspaceExportDialog"));
const WorkspaceImportDialog = lazy(() => import("@/components/editor/WorkspaceImportDialog"));

const EditorFallback = () => (
  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
    Loading editor...
  </div>
);

type PendingAiIntent =
  | { type: "open" }
  | { type: "generate-toc" }
  | {
      context?: KnowledgeSuggestionContext;
      openPatchReviewAfter?: boolean;
      queueEntryId?: string;
      targetDocumentId: string;
      type: "suggest-updates";
    };

interface SuggestionQueueEntry extends KnowledgeSuggestionQueueItem {
  patchSet?: DocumentPatchSet | null;
}

interface PendingImpactSuggestionEntry {
  context?: KnowledgeSuggestionContext;
  openPatchReviewAfter?: boolean;
  queueEntryId?: string;
  sourceDocumentId: string;
  targetDocumentId: string;
}

const aiIntentRequiresRichTextReadiness = (intent: PendingAiIntent) =>
  intent.type === "generate-toc" || intent.type === "suggest-updates";

const createSuggestionQueueId = () =>
  `suggestion-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const resolveSuggestionQueueContext = (
  context?: KnowledgeSuggestionContext,
): KnowledgeSuggestionQueueItem["context"] =>
  context?.queueContext || (context?.issueId ? "consistency" : "impact");

const getQueueConfidenceLabel = (
  patchSet?: DocumentPatchSet | null,
): KnowledgeSuggestionQueueItem["confidenceLabel"] => {
  if (!patchSet) {
    return undefined;
  }

  const confidenceValues = patchSet.patches
    .map((patch) => patch.confidence)
    .filter((value): value is number => typeof value === "number");

  if (confidenceValues.length === 0) {
    return undefined;
  }

  const averageConfidence = confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length;

  if (averageConfidence >= 0.85) {
    return "high";
  }

  if (averageConfidence >= 0.6) {
    return "medium";
  }

  return "low";
};

const getQueueSourceCount = (patchSet?: DocumentPatchSet | null) => {
  if (!patchSet) {
    return 0;
  }

  return new Set(
    patchSet.patches.flatMap((patch) =>
      (patch.sources || []).map((source) =>
        `${source.sourceId}:${source.chunkId || "none"}:${source.sectionId || "none"}`)),
  ).size;
};

const matchesSuggestionQueueEntry = (
  entry: SuggestionQueueEntry,
  context: KnowledgeSuggestionQueueItem["context"],
  sourceDocumentId: string,
  targetDocumentId: string,
  issueId?: string,
) =>
  entry.context === context
  && entry.sourceDocumentId === sourceDocumentId
  && entry.targetDocumentId === targetDocumentId
  && (entry.issueId || "") === (issueId || "");

const isKnowledgeIssueKind = (
  value: string | null,
): value is NonNullable<KnowledgeSuggestionContext["issueKind"]> =>
  value === "changed_section" || value === "conflicting_procedure" || value === "missing_section";

const isKnowledgeIssuePriority = (
  value: string | null,
): value is NonNullable<KnowledgeSuggestionContext["issuePriority"]> =>
  value === "high" || value === "medium" || value === "low";

const getTemplateFallbackContent = (mode: EditorMode, locale: "en" | "ko") => {
  const isKo = locale === "ko";

  switch (mode) {
    case "markdown":
      return isKo
        ? [
          "# 새 문서",
          "",
          "## 요약",
          "",
          "간단한 요약을 작성하세요.",
        ].join("\n")
        : [
          "# New Document",
          "",
          "## Summary",
          "",
          "Write a short summary.",
        ].join("\n");
    case "latex":
      return isKo
        ? [
          "\\section{요약}",
          "간단한 요약을 작성하세요.",
        ].join("\n")
        : [
          "\\section{Summary}",
          "Write a short summary.",
        ].join("\n");
    case "html":
      return isKo
        ? [
          "<h1>새 문서</h1>",
          "<h2>요약</h2>",
          "<p>간단한 요약을 작성하세요.</p>",
        ].join("\n")
        : [
          "<h1>New Document</h1>",
          "<h2>Summary</h2>",
          "<p>Write a short summary.</p>",
        ].join("\n");
    case "json":
      return JSON.stringify({ summary: isKo ? "간단한 요약을 작성하세요." : "Write a short summary." }, null, 2);
    case "yaml":
      return [
        `summary: ${isKo ? "간단한 요약을 작성하세요." : "Write a short summary."}`,
      ].join("\n");
    default:
      return "";
  }
};

const getStableTemplateFallbackContent = (mode: EditorMode, locale: "en" | "ko") => {
  const isKo = locale === "ko";

  switch (mode) {
    case "markdown":
      return isKo
        ? ["# 새 문서", "", "## 요약", "", "간단한 요약을 작성하세요."].join("\n")
        : ["# New Document", "", "## Summary", "", "Write a short summary."].join("\n");
    case "latex":
      return isKo
        ? ["\\section{요약}", "간단한 요약을 작성하세요."].join("\n")
        : ["\\section{Summary}", "Write a short summary."].join("\n");
    case "html":
      return isKo
        ? ["<h1>새 문서</h1>", "<h2>요약</h2>", "<p>간단한 요약을 작성하세요.</p>"].join("\n")
        : ["<h1>New Document</h1>", "<h2>Summary</h2>", "<p>Write a short summary.</p>"].join("\n");
    case "json":
      return JSON.stringify(
        { summary: isKo ? "간단한 요약을 작성하세요." : "Write a short summary." },
        null,
        2,
      );
    case "yaml":
      return `summary: ${isKo ? "간단한 요약을 작성하세요." : "Write a short summary."}`;
    default:
      return "";
  }
};

const templateRequiresDocumentFeatures = (mode: EditorMode, content: string) => {
  switch (mode) {
    case "markdown":
      return markdownHasDocumentContent(content);
    case "html":
      return htmlHasDocumentContent(content);
    default:
      return false;
  }
};

const templateRequiresAdvancedBlocks = (mode: EditorMode, content: string) => {
  switch (mode) {
    case "markdown":
      return markdownHasAdvancedContent(content);
    case "html":
      return htmlHasAdvancedContent(content);
    default:
      return false;
  }
};

const Index = () => {
  const { locale, t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const isE2E = searchParams.get("e2e") === "1";
  const [activeEditor, setActiveEditor] = useState<TiptapEditor | null>(null);
  const [pendingImpactSuggestions, setPendingImpactSuggestions] = useState<PendingImpactSuggestionEntry[]>([]);
  const [plainTextSearchAdapter, setPlainTextSearchAdapter] = useState<PlainTextFindReplaceAdapter | null>(null);
  const [advancedBlocksPreference, setAdvancedBlocksPreference] = useState(() =>
    featureFlags.advancedBlocksOnInitialMount || readAdvancedBlocksPreference(),
  );
  const [documentToolsPreference, setDocumentToolsPreference] = useState(() =>
    featureFlags.documentToolsOnInitialMount || readDocumentToolsPreference(),
  );
  const [aiRuntimeEnabled, setAiRuntimeEnabled] = useState(() => featureFlags.aiOnInitialMount);
  const [aiRuntimeState, setAiRuntimeState] = useState<AiAssistantRuntimeState | null>(null);
  const [pendingAiIntent, setPendingAiIntent] = useState<PendingAiIntent | null>(null);
  const [suggestionQueue, setSuggestionQueue] = useState<SuggestionQueueEntry[]>([]);
  const [historyEnabled, setHistoryEnabled] = useState(() => featureFlags.historyOnInitialMount);
  const [knowledgeEnabled, setKnowledgeEnabled] = useState(() => featureFlags.knowledgeOnInitialMount);
  const [structuredModesVisible, setStructuredModesVisible] = useState(() => featureFlags.structuredModesVisibleOnInitialMount);
  const [documentResetVersion, setDocumentResetVersion] = useState(0);
  const [resetDocumentsDialogOpen, setResetDocumentsDialogOpen] = useState(false);
  const [isResettingDocuments, setIsResettingDocuments] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [workspaceConnectionOpen, setWorkspaceConnectionOpen] = useState(false);
  const [workspaceExportOpen, setWorkspaceExportOpen] = useState(false);
  const [workspaceImportOpen, setWorkspaceImportOpen] = useState(false);
  const [pendingLatexSourceLine, setPendingLatexSourceLine] = useState<number | null>(null);
  const {
    activeDoc,
    activeDocId,
    autoSaveState,
    bumpEditorKey,
    closeDocument,
    createDocument,
    deleteDocument,
    documents,
    editorKey,
    handleContentChange,
    hasRestoredDocuments,
    renameDocument,
    resetDocuments,
    selectDocument,
    updateDocument,
    updateActiveDoc,
  } = useDocumentManager();
  const lastCapturedAutoSaveAtRef = useRef<number | null>(null);
  const {
    closeFindReplace,
    closePreview,
    countWithSpaces,
    findReplaceOpen,
    isDark,
    isFullscreen,
    openShortcuts,
    openTemplateDialog,
    previewOpen,
    setShortcutsOpen,
    setTemplateOpen,
    shortcutsOpen,
    templateOpen,
    toggleCountMode,
    toggleFullscreen,
    togglePreview,
    toggleTheme,
  } = useEditorUiState();
  const {
    currentRenderableHtml,
    currentRenderableLatex,
    currentRenderableLatexDocument,
    currentRenderableMarkdown,
    handleModeChange,
    setLiveEditorHtml,
    textStats,
  } = useFormatConversion({
    activeEditor,
    activeDoc,
    activeDocId,
    bumpEditorKey,
    countWithSpaces,
    editorKey,
    updateActiveDoc,
  });
  const workspaceAuth = useWorkspaceAuth();
  const {
    captureAutoSaveSnapshot,
    createVersionSnapshot,
    removeDocumentVersionSnapshots,
    restoreVersionSnapshot,
    versionHistoryReady,
    versionHistoryRestoring,
    versionHistorySnapshots,
    versionHistorySyncing,
  } = useVersionHistory({
    activeDoc,
    aiSummaryAvailable: workspaceAuth.aiSummaryAvailable,
    bumpEditorKey,
    enabled: historyEnabled,
    updateActiveDoc,
  });
  const {
    isSyncing: workspaceSyncing,
    syncDocument,
  } = useWorkspaceSync({
    updateActiveDoc,
  });
  const {
    error: workspaceExportError,
    exportDocument: exportWorkspaceDocument,
    isExporting: workspaceExporting,
  } = useWorkspaceExport({
    updateActiveDoc,
  });
  const {
    acceptedPatchCount,
    applyReviewedPatches,
    clearPatchSet,
    closePatchReview,
    handleAcceptPatch,
    handleEditPatch,
    handleRejectPatch,
    loadPatchSet,
    openPatchReview,
    patchCount,
    patchReviewOpen,
    patchSet,
  } = usePatchReview({
    activeDoc,
    activeEditor,
    bumpEditorKey,
    onWorkspaceSync: syncDocument,
    onVersionSnapshot: (document, metadata) => createVersionSnapshot(document, "patch_apply", metadata),
    setLiveEditorHtml,
    updateActiveDoc,
  });
  const {
    fileInputRef,
    importState,
    prepareShareLink,
    shareLinkInfo,
    handleCopyHtml,
    handleCopyJson,
    handleCopyMd,
    handleCopyShareLink,
    handleCopyYaml,
    handleFileChange,
    handleLoad,
    handlePrint,
    handleSaveAdoc,
    handleSaveDocsy,
    handleSaveHtml,
    handleSaveJson,
    handleSaveMd,
    handleSavePdf,
    handleSaveRst,
    handleSaveTex,
    handleSaveTypst,
    handleSaveYaml,
  } = useDocumentIO({
    activeDoc,
    createDocument,
    documents,
    onPatchSetLoad: loadPatchSet,
    onVersionSnapshot: (metadata) => createVersionSnapshot(activeDoc, "export", metadata),
    renderableEditorHtml: currentRenderableHtml,
    renderableLatexDocument: currentRenderableLatexDocument,
    renderableMarkdown: currentRenderableMarkdown,
  });
  const texValidation = useTexValidation({
    documentName: activeDoc.name,
    latexSource: activeDoc.mode === "latex"
      ? activeDoc.content
      : currentRenderableLatexDocument,
    mode: activeDoc.mode,
    onPdfExported: () => {
      void createVersionSnapshot(activeDoc, "export", { exportFormat: "XeLaTeX PDF" });
    },
  });
  const {
    generatePatchSet: generateTexAutoFixPatchSet,
    isFixing: isFixingTexAutoFix,
  } = useTexAutoFix({
    diagnostics: texValidation.diagnostics,
    documentId: activeDoc.id,
    documentName: activeDoc.name,
    latexSource: activeDoc.content,
    logSummary: texValidation.logSummary,
    sourceType: texValidation.sourceType,
  });
  const handleOpenTexAutoFixReview = useCallback(async () => {
    const nextPatchSet = await generateTexAutoFixPatchSet();
    loadPatchSet(nextPatchSet);
    openPatchReview();
  }, [generateTexAutoFixPatchSet, loadPatchSet, openPatchReview]);
  const canAiFixTex = texValidation.validationEnabled
    && texValidation.status === "error"
    && texValidation.sourceType === "raw-latex"
    && texValidation.diagnostics.length > 0;

  useEffect(() => {
    setPendingLatexSourceLine(null);
  }, [activeDoc.id, activeDoc.mode]);
  const {
    connected: workspaceConnected,
    connectivityDiagnostic,
    disconnect: disconnectWorkspace,
    error: workspaceAuthError,
    isConnecting: workspaceConnecting,
    isDisconnecting: workspaceDisconnecting,
    isLoading: workspaceAuthLoading,
    openGoogleConnect,
    refetch: refetchWorkspaceAuth,
    session: workspaceSession,
  } = workspaceAuth;
  const {
    error: workspaceFilesError,
    files: workspaceFiles,
    importFile: importWorkspaceFile,
    isImporting: workspaceImporting,
    isLoading: workspaceFilesLoading,
    isRefreshing: workspaceFilesRefreshing,
    query: workspaceFileQuery,
    refetch: refetchWorkspaceFiles,
    setQuery: setWorkspaceFileQuery,
  } = useWorkspaceFiles({
    enabled: workspaceImportOpen && workspaceConnected,
  });
  const {
    error: workspaceChangesError,
    isRefreshingDocument: workspaceRefreshingDocument,
    isRescanning: workspaceChangesRescanning,
    lastRescannedAt: workspaceLastRescannedAt,
    refreshDocument: refreshWorkspaceDocument,
    remoteChangedSources,
    rescan: rescanWorkspaceChanges,
  } = useWorkspaceChanges({
    documents,
    enabled: workspaceConnected,
    onImportRefresh: (importedDocument) => {
      createDocument(resolveImportedDocumentOptions({
        activeDocId,
        documents,
        importedDocument,
      }));
    },
    updateDocument,
  });
  const availableModes = useMemo(
    () => getSameFamilyModes(activeDoc.mode),
    [activeDoc.mode],
  );
  const crossFamilyModes = useMemo(
    () => getCrossFamilyModes(activeDoc.mode),
    [activeDoc.mode],
  );
  const documentFeaturesEnabled = !isWebProfile || documentToolsPreference;
  const advancedBlocksEnabled = !isWebProfile || advancedBlocksPreference;
  const canEnableDocumentFeatures = isWebProfile && activeDoc.mode !== "json" && activeDoc.mode !== "yaml";
  const canEnableAdvancedBlocks = isWebProfile && activeDoc.mode !== "json" && activeDoc.mode !== "yaml";

  const enableStructuredModes = useCallback(() => {
    setStructuredModesVisible(true);
  }, []);

  const enableAdvancedBlocks = useCallback(() => {
    setAdvancedBlocksPreference(true);
    writeAdvancedBlocksPreference(true);
  }, []);
  const enableDocumentFeatures = useCallback(() => {
    setDocumentToolsPreference(true);
    writeDocumentToolsPreference(true);
  }, []);
  const richTextAvailable = activeDoc.mode === "markdown" || activeDoc.mode === "latex" || activeDoc.mode === "html";
  const resetDocumentsDisabled = isResettingDocuments
    || importState.status === "reading"
    || workspaceImporting
    || workspaceExporting
    || workspaceSyncing
    || Boolean(aiRuntimeState?.busyAction)
    || Boolean(aiRuntimeState?.liveAgent.isSubmitting);
  const getDocumentNameById = useCallback((documentId: string) =>
    documents.find((document) => document.id === documentId)?.name || t("common.untitled"), [documents, t]);
  const updateSuggestionQueueEntry = useCallback((
    entryId: string,
    updater: (entry: SuggestionQueueEntry) => SuggestionQueueEntry,
  ) => {
    setSuggestionQueue((current) => current.map((entry) => (
      entry.id === entryId ? updater(entry) : entry
    )));
  }, []);

  const runAiIntent = useCallback(async (intent: PendingAiIntent) => {
    if (!aiRuntimeState) {
      return;
    }

    if (intent.type === "open") {
      aiRuntimeState.setAssistantOpen(true);
      return;
    }

    if (intent.type === "generate-toc") {
      await aiRuntimeState.generateTocSuggestion();
      aiRuntimeState.setAssistantOpen(true);
      return;
    }

    if (intent.queueEntryId) {
      updateSuggestionQueueEntry(intent.queueEntryId, (entry) => ({
        ...entry,
        errorMessage: undefined,
        status: "running",
        updatedAt: Date.now(),
      }));
    }

    try {
      const result = await aiRuntimeState.suggestUpdatesFromDocument(intent.targetDocumentId, intent.context);

      if (intent.queueEntryId) {
        updateSuggestionQueueEntry(intent.queueEntryId, (entry) => ({
          ...entry,
          confidenceLabel: getQueueConfidenceLabel(result?.patchSet),
          errorMessage: result && result.patchCount === 0 ? t("hooks.ai.noDiff") : undefined,
          hasPatchSet: Boolean(result?.patchSet && (result.patchCount || 0) > 0),
          patchCount: result?.patchCount,
          patchSet: result?.patchSet || null,
          patchSetTitle: result?.patchSetTitle,
          sourceCount: getQueueSourceCount(result?.patchSet),
          status: "ready",
          updatedAt: Date.now(),
        }));
      }

      if (
        (intent.openPatchReviewAfter || result?.actionProposal?.action === "open_patch_review")
        && result?.patchSet
        && (result.patchCount || 0) > 0
      ) {
        openPatchReview();
      }
    } catch (error) {
      if (intent.queueEntryId) {
        updateSuggestionQueueEntry(intent.queueEntryId, (entry) => ({
          ...entry,
          errorMessage: error instanceof Error ? error.message : t("hooks.ai.updateFailed"),
          hasPatchSet: false,
          patchSet: null,
          status: "failed",
          updatedAt: Date.now(),
        }));
      }

      throw error;
    }
  }, [aiRuntimeState, openPatchReview, t, updateSuggestionQueueEntry]);

  const requestAiIntent = useCallback((intent: PendingAiIntent) => {
    const richTextReady = !aiIntentRequiresRichTextReadiness(intent)
      || (Boolean(activeEditor) && currentRenderableMarkdown.trim().length > 0);

    if (aiRuntimeState && richTextReady) {
      void runAiIntent(intent);
      return;
    }

    setAiRuntimeEnabled(true);
    setPendingAiIntent(intent);
  }, [activeEditor, aiRuntimeState, currentRenderableMarkdown, runAiIntent]);
  const queueKnowledgeSuggestion = useCallback(({
    context,
    forceQueue = false,
    openPatchReviewAfter = false,
    queueEntryId,
    sourceDocumentId,
    targetDocumentId,
  }: {
    context?: KnowledgeSuggestionContext;
    forceQueue?: boolean;
    openPatchReviewAfter?: boolean;
    queueEntryId?: string;
    sourceDocumentId: string;
    targetDocumentId: string;
  }) => {
    const sourceDocumentName = getDocumentNameById(sourceDocumentId);
    const targetDocumentName = getDocumentNameById(targetDocumentId);
    const nextContext: KnowledgeSuggestionContext | undefined = context
      ? {
        ...context,
        sourceDocumentId,
        sourceDocumentName: context.sourceDocumentName || sourceDocumentName,
        targetDocumentName: context.targetDocumentName || targetDocumentName,
      }
      : {
        queueContext: "impact",
        sourceDocumentId,
          sourceDocumentName,
          targetDocumentName,
        };
    const queueContext = resolveSuggestionQueueContext(nextContext);
    const existingEntry = suggestionQueue.find((entry) =>
      matchesSuggestionQueueEntry(
        entry,
        queueContext,
        sourceDocumentId,
        targetDocumentId,
        nextContext?.issueId,
      ));
    const entryId = queueEntryId || existingEntry?.id || createSuggestionQueueId();
    const reasonSummary = nextContext?.issueReason
      || (queueContext === "consistency"
        ? t("knowledge.healthNextMissing")
        : queueContext === "change"
          ? t("knowledge.changeMonitoringQueueReason", {
            source: sourceDocumentName,
            target: targetDocumentName,
          })
          : t("knowledge.impactNeedsAttention", { count: 1 }));

    setSuggestionQueue((current) => [
      {
        attemptCount: (existingEntry?.attemptCount || 0) + 1,
        context: queueContext,
        errorMessage: undefined,
        hasPatchSet: false,
        id: entryId,
        issueId: nextContext.issueId,
        issueKind: nextContext.issueKind,
        issuePriority: nextContext.issuePriority,
        issueReason: nextContext.issueReason,
        patchCount: undefined,
        patchSet: null,
        patchSetTitle: undefined,
        reasonSummary,
        sourceCount: undefined,
        sourceDocumentId,
        sourceDocumentName,
        status: "queued",
        targetDocumentId,
        targetDocumentName,
        updatedAt: Date.now(),
      },
      ...current.filter((entry) => entry.id !== entryId),
    ].slice(0, 12));

    if (!forceQueue && activeDoc.id === sourceDocumentId) {
      requestAiIntent({
        context: nextContext,
        openPatchReviewAfter,
        queueEntryId: entryId,
        targetDocumentId,
        type: "suggest-updates",
      });
      return;
    }

    setPendingImpactSuggestions((current) => [
      ...current.filter((entry) => entry.queueEntryId !== entryId),
      {
        context: nextContext,
        openPatchReviewAfter,
        queueEntryId: entryId,
        sourceDocumentId,
        targetDocumentId,
      },
    ]);
  }, [activeDoc.id, getDocumentNameById, requestAiIntent, suggestionQueue, t]);
  const suggestionQueueItems = useMemo(
    () => suggestionQueue.map(({ patchSet: _patchSet, ...entry }) => entry),
    [suggestionQueue],
  );
  const handleOpenSuggestionQueueItem = useCallback((entryId: string) => {
    const entry = suggestionQueue.find((queueEntry) => queueEntry.id === entryId);

    if (!entry?.patchSet || !entry.hasPatchSet) {
      return;
    }

    loadPatchSet(entry.patchSet);
    openPatchReview();
  }, [loadPatchSet, openPatchReview, suggestionQueue]);
  const handleDismissSuggestionQueueItem = useCallback((entryId: string) => {
    setSuggestionQueue((current) => current.filter((entry) => entry.id !== entryId));
  }, []);
  const handleRetrySuggestionQueueItem = useCallback((entryId: string) => {
    const entry = suggestionQueue.find((queueEntry) => queueEntry.id === entryId);

    if (!entry) {
      return;
    }

    queueKnowledgeSuggestion({
      context: {
        issueId: entry.issueId,
        issueKind: entry.issueKind,
        issuePriority: entry.issuePriority,
        issueReason: entry.issueReason,
        queueContext: entry.context,
        sourceDocumentId: entry.sourceDocumentId,
        sourceDocumentName: entry.sourceDocumentName,
        targetDocumentName: entry.targetDocumentName,
      },
      queueEntryId: entry.id,
      sourceDocumentId: entry.sourceDocumentId,
      targetDocumentId: entry.targetDocumentId,
    });
  }, [queueKnowledgeSuggestion, suggestionQueue]);
  const clearWorkspaceAuthParams = useCallback(() => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("workspaceAuth");
      next.delete("workspaceAuthError");
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const clearKnowledgeActionParams = useCallback(() => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);

      [
        "knowledgeAction",
        "context",
        "source",
        "target",
        "issueId",
        "issueKind",
        "issuePriority",
        "issueReason",
      ].forEach((key) => next.delete(key));

      return next;
    }, { replace: true });
  }, [setSearchParams]);
  const workspaceErrorMessage = useMemo(() => {
    if (!(workspaceAuthError instanceof Error)) {
      return null;
    }

    if (workspaceAuthError.message.includes("Workspace API is not reachable")) {
      return t("hooks.workspace.apiUnreachable", {
        target: connectivityDiagnostic?.target || "/api",
      });
    }

    return workspaceAuthError.message;
  }, [connectivityDiagnostic?.target, t, workspaceAuthError]);
  const workspaceExportErrorMessage = workspaceExportError instanceof Error ? workspaceExportError.message : null;
  const workspaceImportErrorMessage = workspaceFilesError instanceof Error ? workspaceFilesError.message : null;
  const workspaceChangesErrorMessage = workspaceChangesError instanceof Error ? workspaceChangesError.message : null;
  const workspaceExportEnabled = activeDoc.mode !== "json" && activeDoc.mode !== "yaml" && !activeDoc.workspaceBinding;
  const resolveActiveWorkspaceMarkdown = useCallback(() => (
    activeDoc.mode === "json" || activeDoc.mode === "yaml"
      ? activeDoc.content
      : currentRenderableMarkdown
  ), [activeDoc.content, activeDoc.mode, currentRenderableMarkdown]);
  const handleOpenWorkspaceConnection = useCallback(() => {
    setWorkspaceConnectionOpen(true);
  }, []);
  const handleOpenWorkspaceExport = useCallback(() => {
    if (!workspaceConnected) {
      setWorkspaceConnectionOpen(true);
      return;
    }

    if (!workspaceExportEnabled) {
      toast.error(t("hooks.workspace.exportUnavailable"));
      return;
    }

    setWorkspaceExportOpen(true);
  }, [t, workspaceConnected, workspaceExportEnabled]);
  const handleOpenWorkspaceImport = useCallback(() => {
    if (!workspaceConnected) {
      setWorkspaceConnectionOpen(true);
      return;
    }

    setWorkspaceImportOpen(true);
  }, [workspaceConnected]);
  const handleConnectWorkspace = useCallback(() => {
    const returnTo = typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : "/editor";

    void openGoogleConnect(returnTo).catch((error) => {
      const message = error instanceof Error ? error.message : t("hooks.workspace.authStartFailed");
      toast.error(message);
    });
  }, [openGoogleConnect, t]);
  const handleDisconnectWorkspace = useCallback(() => {
    void disconnectWorkspace()
      .then(() => {
        toast.success(t("hooks.workspace.disconnected"));
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : t("hooks.workspace.disconnectFailed");
        toast.error(message);
      });
  }, [disconnectWorkspace, t]);
  const importWorkspaceDocumentById = useCallback(async (fileId: string) => {
    const result = await importWorkspaceFile({ fileId });

    createDocument(resolveImportedDocumentOptions({
      activeDocId,
      documents,
      importedDocument: result.document,
    }));
    setWorkspaceImportOpen(false);
    toast.success(t("hooks.workspace.importSuccess", {
      name: result.document.name || "Google document",
    }));

    return result;
  }, [activeDocId, createDocument, documents, importWorkspaceFile, t]);
  const handleImportWorkspaceFile = useCallback((fileId: string) => {
    void importWorkspaceDocumentById(fileId).catch((error) => {
      const message = error instanceof Error ? error.message : t("hooks.workspace.importFailed");
      toast.error(message);
    });
  }, [importWorkspaceDocumentById, t]);
  const handleExportWorkspaceDocument = useCallback((title: string) => {
    void exportWorkspaceDocument(activeDoc, {
      markdown: resolveActiveWorkspaceMarkdown(),
      title,
    })
      .then((result) => {
        setWorkspaceExportOpen(false);
        if (result.warnings.length > 0) {
          toast.warning(result.warnings[0]);
        } else {
          toast.success(t("hooks.workspace.exportSuccess", {
            name: title.trim() || activeDoc.name || t("common.untitled"),
          }));
        }
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : t("hooks.workspace.exportFailed");
        toast.error(message);
      });
  }, [activeDoc, exportWorkspaceDocument, resolveActiveWorkspaceMarkdown, t]);
  const handleSaveWorkspaceDocument = useCallback(() => {
    if (!activeDoc.workspaceBinding) {
      return;
    }

    void syncDocument(activeDoc, {
      markdown: resolveActiveWorkspaceMarkdown(),
    })
      .then((result) => {
        if (!result) {
          return;
        }

        if (result.warnings.length > 0) {
          toast.warning(result.warnings[0]);
          return;
        }

        toast.success(t("hooks.workspace.saveSuccess"));
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : t("hooks.workspace.saveFailed");
        toast.error(message);
      });
  }, [activeDoc, resolveActiveWorkspaceMarkdown, syncDocument, t]);
  const handleRescanWorkspaceChanges = useCallback(() => {
    void rescanWorkspaceChanges()
      .then((result) => {
        if (result.changes.length === 0) {
          toast.info(t("hooks.workspace.rescanNone"));
          return;
        }

        toast.warning(t("hooks.workspace.rescanDetected", {
          count: result.changes.length,
          suffix: result.changes.length === 1 ? "" : "s",
        }));
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : t("hooks.workspace.rescanFailed");
        toast.error(message);
      });
  }, [rescanWorkspaceChanges, t]);
  const handleRefreshWorkspaceDocument = useCallback((documentId: string) => {
    void refreshWorkspaceDocument(documentId)
      .then(() => {
        toast.success(t("hooks.workspace.refreshSuccess"));
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : t("hooks.workspace.refreshFailed");
        toast.error(message);
      });
  }, [refreshWorkspaceDocument, t]);

  useEffect(() => {
    if (activeDoc.mode === "json" || activeDoc.mode === "yaml") {
      setActiveEditor(null);
      return;
    }

    setPlainTextSearchAdapter(null);
  }, [activeDoc.mode]);

  useEffect(() => {
    const e2eWindow = window as Window & {
      __docsyE2E?: {
        hasFontSizeCommand: () => boolean;
        openPatchReview: (nextPatchSet: DocumentPatchSet) => boolean;
        selectText: (value: string) => boolean;
      };
    };

    if (!isE2E) {
      delete e2eWindow.__docsyE2E;
      return;
    }

    e2eWindow.__docsyE2E = {
      hasFontSizeCommand: () =>
        Boolean(activeEditor && typeof activeEditor.commands.setFontSize === "function"),
      openPatchReview: (nextPatchSet) => {
        if (!nextPatchSet) {
          return false;
        }

        loadPatchSet(nextPatchSet);
        openPatchReview();
        return true;
      },
      selectText: (value: string) => {
        if (!activeEditor || !value) {
          return false;
        }

        let editorDom: HTMLElement;
        try {
          editorDom = activeEditor.view.dom;
        } catch {
          return false;
        }

        const walker = document.createTreeWalker(editorDom, NodeFilter.SHOW_TEXT);
        let textNode: Node | null = null;

        while (walker.nextNode()) {
          if (walker.currentNode.textContent?.includes(value)) {
            textNode = walker.currentNode;
            break;
          }
        }

        if (!textNode) {
          return false;
        }

        const text = textNode.textContent ?? "";
        const start = text.indexOf(value);
        if (start < 0) {
          return false;
        }

        const from = activeEditor.view.posAtDOM(textNode, start);
        const to = activeEditor.view.posAtDOM(textNode, start + value.length);
        activeEditor.commands.setTextSelection({ from, to });
        return true;
      },
    };

    return () => {
      delete e2eWindow.__docsyE2E;
    };
  }, [activeEditor, isE2E, loadPatchSet, openPatchReview]);

  useEffect(() => {
    if (!aiRuntimeState || !pendingAiIntent) {
      return;
    }

    if (
      aiIntentRequiresRichTextReadiness(pendingAiIntent)
      && (!activeEditor || currentRenderableMarkdown.trim().length === 0)
    ) {
      return;
    }

    void runAiIntent(pendingAiIntent);
    setPendingAiIntent(null);
  }, [activeEditor, aiRuntimeState, currentRenderableMarkdown, pendingAiIntent, runAiIntent]);

  useEffect(() => {
    if (!workspaceErrorMessage) {
      return;
    }

    toast.error(workspaceErrorMessage, {
      id: "workspace-auth-startup-error",
    });
  }, [workspaceErrorMessage]);

  useEffect(() => {
    const authResult = searchParams.get("workspaceAuth");
    const authError = searchParams.get("workspaceAuthError");

    if (!authResult && !authError) {
      return;
    }

    if (authResult === "connected") {
      toast.success(t("hooks.workspace.connected"));
      void refetchWorkspaceAuth();
    } else if (authError) {
      toast.error(authError);
      setWorkspaceConnectionOpen(true);
    }

    clearWorkspaceAuthParams();
  }, [clearWorkspaceAuthParams, refetchWorkspaceAuth, searchParams, t]);

  useEffect(() => {
    if (!workspaceConnected && workspaceImportOpen) {
      setWorkspaceImportOpen(false);
    }
  }, [workspaceConnected, workspaceImportOpen]);

  useEffect(() => {
    if (!workspaceConnected && workspaceExportOpen) {
      setWorkspaceExportOpen(false);
    }
  }, [workspaceConnected, workspaceExportOpen]);

  useEffect(() => {
    if (!workspaceImportOpen && workspaceFileQuery) {
      setWorkspaceFileQuery("");
    }
  }, [setWorkspaceFileQuery, workspaceFileQuery, workspaceImportOpen]);

  useEffect(() => {
    if (!workspaceChangesErrorMessage) {
      return;
    }

    toast.error(workspaceChangesErrorMessage);
  }, [workspaceChangesErrorMessage]);

  useEffect(() => {
    if (searchParams.get("knowledgeAction") !== "suggest-updates") {
      return;
    }

    const sourceDocumentId = searchParams.get("source");
    const targetDocumentId = searchParams.get("target");
    const rawContext = searchParams.get("context");
    const rawIssueKind = searchParams.get("issueKind");
    const rawIssuePriority = searchParams.get("issuePriority");

    if (!sourceDocumentId || !targetDocumentId) {
      clearKnowledgeActionParams();
      return;
    }

    const nextContext: KnowledgeSuggestionContext | undefined = rawContext === "consistency"
      ? {
        issueId: searchParams.get("issueId") || undefined,
        issueKind: isKnowledgeIssueKind(rawIssueKind)
          ? rawIssueKind
          : undefined,
        issuePriority: isKnowledgeIssuePriority(rawIssuePriority)
          ? rawIssuePriority
          : undefined,
        issueReason: searchParams.get("issueReason") || undefined,
        queueContext: "consistency",
      }
      : rawContext === "change"
        ? { queueContext: "change" }
        : rawContext === "impact"
          ? { queueContext: "impact" }
      : undefined;

    queueKnowledgeSuggestion({
      context: nextContext,
      openPatchReviewAfter: true,
      sourceDocumentId,
      targetDocumentId,
    });

    clearKnowledgeActionParams();
  }, [clearKnowledgeActionParams, queueKnowledgeSuggestion, searchParams]);

  const handleFileNameChange = useCallback((name: string) => {
    updateActiveDoc({ name });
  }, [updateActiveDoc]);

  const handleTiptapChange = useCallback((tiptapJson: JSONContent | null) => {
    if (!tiptapJson) {
      return;
    }

    let ast = activeDoc.ast ?? null;

    try {
      ast = serializeTiptapToAst(tiptapJson, {
        documentNodeId: `doc-${activeDoc.id}`,
        throwOnUnsupported: false,
      });
    } catch (error) {
      void error;
    }

    updateActiveDoc({
      ast,
      storageKind: "docsy",
      tiptapJson,
    });
  }, [activeDoc.ast, activeDoc.id, updateActiveDoc]);

  const handleNewDoc = useCallback((mode: EditorMode = "markdown") => {
    if (mode === "json" || mode === "yaml") {
      enableStructuredModes();
    }

    createDocument({ mode });
  }, [createDocument, enableStructuredModes]);
  const handleCreateLiveAgentDocumentDraft = useCallback((draft: AgentNewDocumentDraft) => {
    const resolvedTitle = draft.title.trim() || t("common.untitled");
    const markdown = draft.markdown.trim();

    createDocument({
      content: markdown,
      mode: "markdown",
      name: resolvedTitle,
      sourceSnapshots: {
        markdown,
      },
      storageKind: "docsy",
      tiptapJson: null,
    });
    toast.success(`Created draft "${resolvedTitle}".`);
  }, [createDocument, t]);

  const handleDeleteDoc = useCallback((id: string) => {
    deleteDocument(id);
    void removeDocumentVersionSnapshots(id);
  }, [deleteDocument, removeDocumentVersionSnapshots]);

  const handleRequestResetDocuments = useCallback(() => {
    if (resetDocumentsDisabled) {
      toast.info(t("resetDocuments.busy"));
      return;
    }

    setResetDocumentsDialogOpen(true);
  }, [resetDocumentsDisabled, t]);

  const handleResetDocuments = useCallback(async () => {
    if (resetDocumentsDisabled) {
      toast.info(t("resetDocuments.busy"));
      return;
    }

    setIsResettingDocuments(true);

    try {
      await resetLocalDocumentState();
      resetDocuments();
      closeFindReplace();
      closePreview();
      setPendingAiIntent(null);
      setPendingImpactSuggestions([]);
      setSuggestionQueue([]);
      setPendingLatexSourceLine(null);
      setShareDialogOpen(false);
      setWorkspaceExportOpen(false);
      setWorkspaceImportOpen(false);
      setDocumentResetVersion((version) => version + 1);
      setResetDocumentsDialogOpen(false);
      toast.dismiss(RESTORED_SESSION_TOAST_ID);
      toast.success(t("resetDocuments.done"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("resetDocuments.failed"));
    } finally {
      setIsResettingDocuments(false);
    }
  }, [closeFindReplace, closePreview, resetDocuments, resetDocumentsDisabled, t]);

  const handleTemplateSelect = useCallback((template: DocumentTemplate) => {
    const fallbackContent = getStableTemplateFallbackContent(template.mode, locale);
    const selectedContent = template.content.trim().length > 0 || template.id === "blank-markdown"
      ? template.content
      : fallbackContent;

    if (templateRequiresDocumentFeatures(template.mode, selectedContent)) {
      enableDocumentFeatures();
    }

    if (templateRequiresAdvancedBlocks(template.mode, selectedContent)) {
      enableAdvancedBlocks();
    }

    createDocument({
      content: selectedContent,
      mode: template.mode,
      name: template.name,
      sourceSnapshots: {
        [template.mode]: selectedContent,
      },
      storageKind: "docsy",
      tiptapJson: null,
    });
    toast.success(t("toasts.templateApplied"));
  }, [createDocument, enableAdvancedBlocks, enableDocumentFeatures, locale, t]);

  useEffect(() => {
    if (!hasRestoredDocuments) {
      toast.dismiss(RESTORED_SESSION_TOAST_ID);
      return;
    }

    showRestoredSessionToast({
      disabled: resetDocumentsDisabled,
      onStartFresh: () => {
        setResetDocumentsDialogOpen(true);
      },
      t,
    });

    return () => {
      toast.dismiss(RESTORED_SESSION_TOAST_ID);
    };
  }, [hasRestoredDocuments, resetDocumentsDisabled, t]);

  useEffect(() => {
    const openSharedDocumentFromHash = async () => {
      if (typeof window === "undefined" || !window.location.hash.startsWith(DOC_SHARE_HASH_PREFIX)) {
        return;
      }

      try {
        const { parseSharedDocumentFromHash } = await import("@/lib/share/docShare");
        const sharedDocument = parseSharedDocumentFromHash(window.location.hash);

        if (!sharedDocument) {
          return;
        }

        createDocument(sharedDocument);
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
        toast.success(t("hooks.io.sharedDocumentLoaded"));
      } catch (error) {
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
        toast.error(error instanceof Error ? error.message : t("hooks.io.sharedDocumentFailed"));
      }
    };

    void openSharedDocumentFromHash();
    const handleHashChange = () => {
      void openSharedDocumentFromHash();
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [createDocument, t]);

  useEffect(() => {
    if (autoSaveState.status !== "saved" || !autoSaveState.lastSavedAt) {
      return;
    }

    if (lastCapturedAutoSaveAtRef.current === autoSaveState.lastSavedAt) {
      return;
    }

    lastCapturedAutoSaveAtRef.current = autoSaveState.lastSavedAt;
    void captureAutoSaveSnapshot(activeDoc);
  }, [activeDoc, autoSaveState.lastSavedAt, autoSaveState.status, captureAutoSaveSnapshot]);

  useEffect(() => {
    const nextPendingSuggestion = pendingImpactSuggestions[0];

    if (!nextPendingSuggestion) {
      return;
    }

    if (activeDoc.id !== nextPendingSuggestion.sourceDocumentId) {
      selectDocument(nextPendingSuggestion.sourceDocumentId);
      return;
    }

    if (activeDoc.mode === "json" || activeDoc.mode === "yaml") {
      toast.error("Impact suggestions currently require a rich-text source document.");
      setPendingImpactSuggestions((current) => current.slice(1));
      return;
    }

    requestAiIntent({
      context: nextPendingSuggestion.context,
      openPatchReviewAfter: nextPendingSuggestion.openPatchReviewAfter,
      queueEntryId: nextPendingSuggestion.queueEntryId,
      targetDocumentId: nextPendingSuggestion.targetDocumentId,
      type: "suggest-updates",
    });
    setPendingImpactSuggestions((current) => current.slice(1));
  }, [activeDoc.id, activeDoc.mode, pendingImpactSuggestions, requestAiIntent, selectDocument]);

  useEffect(() => {
    if (activeDoc.mode === "json" || activeDoc.mode === "yaml") {
      updateActiveDoc({
        sourceSnapshots: {
          ...(activeDoc.sourceSnapshots || {}),
          [activeDoc.mode]: activeDoc.content,
        },
        storageKind: "docsy",
      });
      return;
    }

    updateActiveDoc({
      sourceSnapshots: {
        ...(activeDoc.sourceSnapshots || {}),
        html: currentRenderableHtml,
        latex: currentRenderableLatex,
        markdown: currentRenderableMarkdown,
        [activeDoc.mode]: activeDoc.content,
      },
      storageKind: "docsy",
    });
  }, [
    activeDoc.content,
    activeDoc.mode,
    activeDoc.sourceSnapshots,
    currentRenderableHtml,
    currentRenderableLatex,
    currentRenderableMarkdown,
    updateActiveDoc,
  ]);

  useEffect(() => {
    const target = getPendingEditorFocusTarget();

    if (!target || target.documentId !== activeDoc.id) {
      return;
    }

    if (target.kind !== "section" && target.kind !== "image") {
      clearPendingEditorFocusTarget();
      return;
    }

    let attempts = 0;
    let timer: number | null = null;

    const tryScroll = () => {
      attempts += 1;

      if (scrollToEditorFocusTarget(target, activeDoc.ast) || attempts >= 12) {
        clearPendingEditorFocusTarget();
        return;
      }

      timer = window.setTimeout(tryScroll, 160);
    };

    timer = window.setTimeout(tryScroll, 80);

    return () => {
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [activeDoc.ast, activeDoc.id, activeDoc.mode, activeEditor, currentRenderableHtml, editorKey]);

  const renderEditor = useCallback(() => {
    if (activeDoc.mode === "markdown") {
      return (
        <Suspense fallback={<EditorFallback />}>
          <MarkdownEditor
            advancedBlocksEnabled={advancedBlocksEnabled}
            canEnableAdvancedBlocks={canEnableAdvancedBlocks}
            canEnableDocumentFeatures={canEnableDocumentFeatures}
            documentFeaturesEnabled={documentFeaturesEnabled}
            key={`${activeDoc.id}:${editorKey}:${documentFeaturesEnabled ? "document" : "core"}:${advancedBlocksEnabled ? "advanced" : "base"}`}
            initialContent={activeDoc.content || undefined}
            initialTiptapDoc={activeDoc.tiptapJson || undefined}
            onContentChange={handleContentChange}
            onEnableAdvancedBlocks={enableAdvancedBlocks}
            onEnableDocumentFeatures={enableDocumentFeatures}
            onEditorReady={setActiveEditor}
            onHtmlChange={setLiveEditorHtml}
            onTiptapChange={handleTiptapChange}
          />
        </Suspense>
      );
    }

    if (activeDoc.mode === "latex") {
      return (
        <Suspense fallback={<EditorFallback />}>
          <LatexEditor
            advancedBlocksEnabled={advancedBlocksEnabled}
            canEnableAdvancedBlocks={canEnableAdvancedBlocks}
            canEnableDocumentFeatures={canEnableDocumentFeatures}
            documentFeaturesEnabled={documentFeaturesEnabled}
            initialHtmlOverride={activeDoc.sourceSnapshots?.html}
            key={`${activeDoc.id}:${editorKey}:${documentFeaturesEnabled ? "document" : "core"}:${advancedBlocksEnabled ? "advanced" : "base"}`}
            initialContent={activeDoc.content}
            initialTiptapDoc={activeDoc.tiptapJson || undefined}
            onContentChange={handleContentChange}
            onEnableAdvancedBlocks={enableAdvancedBlocks}
            onEnableDocumentFeatures={enableDocumentFeatures}
            onEditorReady={setActiveEditor}
            onHtmlChange={setLiveEditorHtml}
            onSourceLineTargetApplied={() => setPendingLatexSourceLine(null)}
            onTiptapChange={handleTiptapChange}
            sourceLineTarget={pendingLatexSourceLine}
          />
        </Suspense>
      );
    }

    if (activeDoc.mode === "json" || activeDoc.mode === "yaml") {
      return (
        <Suspense fallback={<EditorFallback />}>
          <JsonYamlEditor
            key={`${activeDoc.id}:${editorKey}`}
            initialContent={activeDoc.content}
            mode={activeDoc.mode}
            onContentChange={handleContentChange}
            onModeChange={handleModeChange}
            onPlainTextSearchAdapterReady={setPlainTextSearchAdapter}
          />
        </Suspense>
      );
    }

    return (
      <Suspense fallback={<EditorFallback />}>
        <HtmlEditor
          advancedBlocksEnabled={advancedBlocksEnabled}
          canEnableAdvancedBlocks={canEnableAdvancedBlocks}
          canEnableDocumentFeatures={canEnableDocumentFeatures}
          documentFeaturesEnabled={documentFeaturesEnabled}
          key={`${activeDoc.id}:${editorKey}:${documentFeaturesEnabled ? "document" : "core"}:${advancedBlocksEnabled ? "advanced" : "base"}`}
          initialContent={activeDoc.content}
          initialTiptapDoc={activeDoc.tiptapJson || undefined}
          onContentChange={handleContentChange}
          onEnableAdvancedBlocks={enableAdvancedBlocks}
          onEnableDocumentFeatures={enableDocumentFeatures}
          onEditorReady={setActiveEditor}
          onHtmlChange={setLiveEditorHtml}
          onTiptapChange={handleTiptapChange}
        />
      </Suspense>
    );
  }, [activeDoc.content, activeDoc.id, activeDoc.mode, activeDoc.tiptapJson, advancedBlocksEnabled, canEnableAdvancedBlocks, canEnableDocumentFeatures, documentFeaturesEnabled, editorKey, enableAdvancedBlocks, enableDocumentFeatures, handleContentChange, handleModeChange, handleTiptapChange, setLiveEditorHtml]);
  const aiUnavailableMessage = useMemo(() => {
    if (workspaceAuth.apiHealth && !workspaceAuth.apiHealth.configured) {
      return "Gemini가 연결되어 있지 않습니다.";
    }

    return aiRuntimeState?.liveAgent.latestStatus?.message || null;
  }, [aiRuntimeState?.liveAgent.latestStatus?.message, workspaceAuth.apiHealth]);

  const aiAssistantDialogProps = aiRuntimeState
    ? {
      activeDocumentName: activeDoc.name,
      aiUnavailableMessage,
      busyAction: aiRuntimeState.busyAction,
      compareCandidates: aiRuntimeState.compareCandidates,
      comparePreview: aiRuntimeState.comparePreview,
      liveAgent: aiRuntimeState.liveAgent,
      onCompare: aiRuntimeState.compareWithDocument,
      onExtractProcedure: aiRuntimeState.extractProcedureFromActiveDocument,
      onGenerateSection: aiRuntimeState.generateSectionPatch,
      onGenerateToc: aiRuntimeState.generateTocSuggestion,
      onLoadTocPatch: async (maxDepthOverride?: 1 | 2 | 3) => {
        const patchSet = await aiRuntimeState.loadTocPatch(maxDepthOverride);

        if (patchSet) {
          openPatchReview();
        }

        return patchSet;
      },
      onOpenChange: aiRuntimeState.setAssistantOpen,
      onSuggestUpdates: async (targetDocumentId: string) => {
        await runAiIntent({ targetDocumentId, type: "suggest-updates" });
      },
      onSummarize: aiRuntimeState.summarizeActiveDocument,
      open: aiRuntimeState.assistantOpen,
      procedureResult: aiRuntimeState.procedureResult,
      richTextAvailable: aiRuntimeState.richTextAvailable,
      summaryResult: aiRuntimeState.summaryResult,
      tocPreview: aiRuntimeState.tocPreview,
      updateSuggestionPreview: aiRuntimeState.updateSuggestionPreview,
    }
    : {
      activeDocumentName: activeDoc.name,
      aiUnavailableMessage,
      busyAction: null,
      compareCandidates: [],
      comparePreview: null,
      liveAgent: {
        addDriveReference: () => undefined,
        availableLocalReferences: [],
        composerText: "",
        confirmPendingAction: async () => undefined,
        discardPendingAction: () => undefined,
        isSubmitting: false,
        latestDraftPreview: null,
        latestDriveCandidates: [],
        latestError: null,
        latestStatus: null,
        messages: [],
        pendingConfirmation: null,
        queueDriveImport: () => undefined,
        removeDriveReference: () => undefined,
        resetThread: () => undefined,
        selectedDriveReferences: [],
        selectedLocalReferenceIds: [],
        sendMessage: async () => undefined,
        setComposerText: () => undefined,
        threadId: "agent-disabled",
        toggleLocalReference: () => undefined,
      },
      onCompare: async () => undefined,
      onExtractProcedure: async () => undefined,
      onGenerateSection: async () => undefined,
      onGenerateToc: async () => undefined,
      onLoadTocPatch: async () => undefined,
      onOpenChange: (open: boolean) => {
        if (open) {
          requestAiIntent({ type: "open" });
        }
      },
      onSuggestUpdates: async (targetDocumentId: string) => {
        requestAiIntent({ targetDocumentId, type: "suggest-updates" });
      },
      onSummarize: async () => undefined,
      open: false,
      procedureResult: null,
      richTextAvailable,
      summaryResult: null,
      tocPreview: null,
      updateSuggestionPreview: null,
    };

  return (
    <>
      {aiRuntimeEnabled && (
        <Suspense fallback={null}>
          <AiAssistantRuntime
            activeDoc={activeDoc}
            activeEditor={activeEditor}
            createDocumentDraft={handleCreateLiveAgentDocumentDraft}
            currentRenderableMarkdown={currentRenderableMarkdown}
            documents={documents}
            importWorkspaceDocument={importWorkspaceDocumentById}
            loadPatchSet={loadPatchSet}
            openPatchReview={openPatchReview}
            openWorkspaceConnection={handleOpenWorkspaceConnection}
            onStateChange={setAiRuntimeState}
          />
        </Suspense>
      )}
      <EditorWorkspace
        activeMode={activeDoc.mode}
        aiAssistantDialogProps={aiAssistantDialogProps}
        fileInputRef={fileInputRef}
        findReplaceProps={{
          editor: activeEditor,
          onClose: closeFindReplace,
          open: findReplaceOpen,
          plainTextAdapter: plainTextSearchAdapter,
        }}
        headerProps={{
          countWithSpaces,
          autoSaveState,
          fileName: activeDoc.name,
          importState,
          isDark,
          isFullscreen,
          loadFileTitle: t("header.loadFileHint", {
            size: `${Math.round(MAX_IMPORT_FILE_SIZE_BYTES / (1024 * 1024))}MB`,
          }),
          availableModes,
          crossFamilyModes,
          mode: activeDoc.mode,
          onCreateDocument: handleNewDoc,
          onOpenAiAssistant: () => requestAiIntent({ type: "open" }),
          onRequestResetDocuments: handleRequestResetDocuments,
          onOpenStructuredModes: enableStructuredModes,
          onOpenWorkspaceConnection: handleOpenWorkspaceConnection,
          onOpenWorkspaceExport: handleOpenWorkspaceExport,
          onOpenWorkspaceImport: handleOpenWorkspaceImport,
          onSaveWorkspaceDocument: handleSaveWorkspaceDocument,
          onOpenShare: () => {
            void prepareShareLink().finally(() => setShareDialogOpen(true));
          },
          onCopyHtml: handleCopyHtml,
          onCopyJson: handleCopyJson,
          onCopyMd: handleCopyMd,
          onCopyShareLink: handleCopyShareLink,
          onCopyYaml: handleCopyYaml,
          onFileNameChange: handleFileNameChange,
          onLoad: handleLoad,
          onModeChange: handleModeChange,
          onOpenPatchReview: openPatchReview,
          onOpenShortcuts: openShortcuts,
          onPrint: handlePrint,
          patchCount,
          onSaveAdoc: handleSaveAdoc,
          onSaveDocsy: handleSaveDocsy,
          onSaveHtml: handleSaveHtml,
          onSaveJson: handleSaveJson,
          onSaveMd: handleSaveMd,
          onSavePdf: handleSavePdf,
          onSaveRst: handleSaveRst,
          onSaveTex: handleSaveTex,
          onSaveTypst: handleSaveTypst,
          onSaveYaml: handleSaveYaml,
          onToggleCountMode: toggleCountMode,
          onToggleFullscreen: toggleFullscreen,
          onTogglePreview: togglePreview,
          onToggleTheme: toggleTheme,
          previewOpen,
          resetDocumentsDisabled,
          showStructuredModeAction: false,
          textStats,
          workspaceBinding: activeDoc.workspaceBinding,
          workspaceConnected,
          workspaceConnectionPending: workspaceConnecting || workspaceDisconnecting || workspaceAuthLoading,
          workspaceExportEnabled,
          workspaceExportPending: workspaceExporting,
          workspaceImportPending: workspaceImporting || workspaceFilesLoading,
          workspaceSyncPending: workspaceSyncing,
        }}
        onFileChange={handleFileChange}
        patchReviewDialogProps={{
          acceptedPatchCount,
          onAccept: handleAcceptPatch,
          onApply: applyReviewedPatches,
          onClear: clearPatchSet,
          onEdit: handleEditPatch,
          onLoadPatchSet: handleLoad,
          onOpenChange: (open) => {
            if (!open) {
              closePatchReview();
              return;
            }

            openPatchReview();
          },
          onReject: handleRejectPatch,
          open: patchReviewOpen,
          patchSet,
          workspaceSyncWarnings: activeDoc.workspaceBinding?.syncWarnings,
        }}
        shareLinkDialogProps={{
          link: shareLinkInfo.link,
          onCopy: () => {
            void handleCopyShareLink();
          },
          onOpenChange: setShareDialogOpen,
          open: shareDialogOpen,
        }}
        previewOpen={previewOpen}
        previewProps={{
          editorHtml: currentRenderableHtml,
          editorLatex: currentRenderableLatexDocument,
          editorMarkdown: currentRenderableMarkdown,
          editorMode: activeDoc.mode,
          fileName: activeDoc.name,
          onClose: closePreview,
          rawContent: activeDoc.content,
          texValidationProps: {
            canAiFix: canAiFixTex,
            compileMs: texValidation.compileMs,
            diagnostics: texValidation.diagnostics,
            health: texValidation.health,
            isAiFixing: isFixingTexAutoFix,
            isExportingPdf: texValidation.isExportingPdf,
            lastValidatedAt: texValidation.lastValidatedAt,
            latexSource: activeDoc.mode === "latex" ? activeDoc.content : currentRenderableLatexDocument,
            logSummary: texValidation.logSummary,
            onAiFix: () => {
              void handleOpenTexAutoFixReview();
            },
            onCompilePdf: texValidation.downloadCompiledPdf,
            onJumpToLine: (line) => {
              if (activeDoc.mode === "latex") {
                setPendingLatexSourceLine(line);
              }
            },
            onRunValidation: texValidation.runValidation,
            previewUrl: texValidation.previewUrl,
            sourceType: texValidation.sourceType,
            status: texValidation.status,
            validationEnabled: texValidation.validationEnabled,
          },
        }}
        renderEditor={renderEditor}
        shortcutsModalProps={{ onOpenChange: setShortcutsOpen, open: shortcutsOpen }}
          sidebarProps={{
            activeDoc,
            activeDocId,
            createDocument,
            documents,
            historyEnabled,
            historyProps: {
              activeDoc,
              onGenerateTocSuggestion: () => {
                requestAiIntent({ type: "generate-toc" });
              },
              onRestoreVersionSnapshot: (snapshotId: string) => {
                void restoreVersionSnapshot(snapshotId);
              },
              versionHistoryReady,
              versionHistoryRestoring,
              versionHistorySnapshots,
              versionHistorySyncing,
            },
            knowledgeEnabled,
            knowledgePanelResetKey: documentResetVersion,
            knowledgeProps: {
              onDismissSuggestionQueueItem: handleDismissSuggestionQueueItem,
              onGenerateTocSuggestion: () => {
                requestAiIntent({ type: "generate-toc" });
              },
              onRefreshWorkspaceDocument: handleRefreshWorkspaceDocument,
              onRescanWorkspaceSources: handleRescanWorkspaceChanges,
              onOpenSuggestionQueueItem: handleOpenSuggestionQueueItem,
              onRetrySuggestionQueueItem: handleRetrySuggestionQueueItem,
              onSuggestKnowledgeImpactUpdate: (
                sourceDocumentId: string,
                targetDocumentId: string,
                context?: KnowledgeSuggestionContext,
              ) => {
                queueKnowledgeSuggestion({ context, sourceDocumentId, targetDocumentId });
              },
              onSuggestKnowledgeUpdates: (documentId: string, context?: KnowledgeSuggestionContext) => {
                queueKnowledgeSuggestion({
                  context,
                  sourceDocumentId: activeDoc.id,
                  targetDocumentId: documentId,
                });
              },
              suggestionQueue: suggestionQueueItems,
              workspaceChangedSources: remoteChangedSources,
              workspaceLastRescannedAt,
              workspaceRescanning: workspaceChangesRescanning || workspaceRefreshingDocument,
            },
            onDeleteDoc: handleDeleteDoc,
            onActivateHistory: () => setHistoryEnabled(true),
            onActivateKnowledge: () => setKnowledgeEnabled(true),
            onNewDoc: handleNewDoc,
            onOpenStructuredModes: enableStructuredModes,
            onOpenTemplates: openTemplateDialog,
            onRenameDoc: renameDocument,
            onSelectDoc: selectDocument,
            showStructuredCreateAction: isWebProfile && !structuredModesVisible,
          }}
        tabsProps={{
          activeDocId,
          documents,
          onCloseDoc: closeDocument,
          onNewDoc: () => handleNewDoc(),
          onSelectDoc: selectDocument,
        }}
        templateDialogProps={{
          onOpenChange: setTemplateOpen,
          onSelect: handleTemplateSelect,
          open: templateOpen,
        }}
      />
      {workspaceConnectionOpen && (
        <Suspense fallback={null}>
          <WorkspaceConnectionDialog
            errorMessage={workspaceErrorMessage}
            isConnecting={workspaceConnecting}
            isDisconnecting={workspaceDisconnecting}
            onConnect={handleConnectWorkspace}
            onDisconnect={handleDisconnectWorkspace}
            onOpenChange={setWorkspaceConnectionOpen}
            open={workspaceConnectionOpen}
            session={workspaceSession}
          />
        </Suspense>
      )}
      {workspaceImportOpen && (
        <Suspense fallback={null}>
          <WorkspaceImportDialog
            errorMessage={workspaceImportErrorMessage}
            files={workspaceFiles}
            isImporting={workspaceImporting}
            isLoading={workspaceFilesLoading}
            isRefreshing={workspaceFilesRefreshing}
            onImport={handleImportWorkspaceFile}
            onOpenChange={setWorkspaceImportOpen}
            onRefresh={() => {
              void refetchWorkspaceFiles();
            }}
            onSearchChange={setWorkspaceFileQuery}
            open={workspaceImportOpen}
            query={workspaceFileQuery}
          />
        </Suspense>
      )}
      {workspaceExportOpen && (
        <Suspense fallback={null}>
          <WorkspaceExportDialog
            defaultTitle={activeDoc.name}
            errorMessage={workspaceExportErrorMessage}
            isExporting={workspaceExporting}
            onExport={handleExportWorkspaceDocument}
            onOpenChange={setWorkspaceExportOpen}
            open={workspaceExportOpen}
          />
        </Suspense>
      )}
      <ResetDocumentsDialog
        isSubmitting={isResettingDocuments}
        onConfirm={() => {
          void handleResetDocuments();
        }}
        onOpenChange={setResetDocumentsDialogOpen}
        open={resetDocumentsDialogOpen}
      />
    </>
  );
};

export default Index;
