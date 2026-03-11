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
import type { DocumentTemplate } from "@/components/editor/TemplateDialog";
import type { PlainTextFindReplaceAdapter } from "@/components/editor/findReplaceTypes";
import type { KnowledgeSuggestionContext, KnowledgeSuggestionQueueItem } from "@/components/editor/sidebarFeatureTypes";
import { useDocumentManager } from "@/hooks/useDocumentManager";
import { MAX_IMPORT_FILE_SIZE_BYTES, resolveImportedDocumentOptions, useDocumentIO } from "@/hooks/useDocumentIO";
import { useEditorUiState } from "@/hooks/useEditorUiState";
import { useFormatConversion } from "@/hooks/useFormatConversion";
import { usePatchReview } from "@/hooks/usePatchReview";
import { useWorkspaceFiles } from "@/hooks/useWorkspaceFiles";
import { useWorkspaceAuth } from "@/hooks/useWorkspaceAuth";
import { useWorkspaceChanges } from "@/hooks/useWorkspaceChanges";
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
import { DOC_SHARE_HASH_PREFIX } from "@/lib/share/shareConstants";
import type { EditorMode } from "@/types/document";
import type { DocumentPatchSet } from "@/types/documentPatch";
import { toast } from "sonner";

const MarkdownEditor = lazy(() => import("@/components/editor/MarkdownEditor"));
const LatexEditor = lazy(() => import("@/components/editor/LatexEditor"));
const HtmlEditor = lazy(() => import("@/components/editor/HtmlEditor"));
const JsonYamlEditor = lazy(() => import("@/components/editor/JsonYamlEditor"));
const AiAssistantRuntime = lazy(() => import("@/components/editor/AiAssistantRuntime"));
const WorkspaceConnectionDialog = lazy(() => import("@/components/editor/WorkspaceConnectionDialog"));
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
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [workspaceConnectionOpen, setWorkspaceConnectionOpen] = useState(false);
  const [workspaceImportOpen, setWorkspaceImportOpen] = useState(false);
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
    bumpEditorKey,
    enabled: historyEnabled,
    updateActiveDoc,
  });
  const {
    syncDocument,
  } = useWorkspaceSync({
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
  const {
    connected: workspaceConnected,
    disconnect: disconnectWorkspace,
    error: workspaceAuthError,
    isConnecting: workspaceConnecting,
    isDisconnecting: workspaceDisconnecting,
    isLoading: workspaceAuthLoading,
    openGoogleConnect,
    refetch: refetchWorkspaceAuth,
    session: workspaceSession,
  } = useWorkspaceAuth();
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
    if (aiRuntimeState) {
      void runAiIntent(intent);
      return;
    }

    setAiRuntimeEnabled(true);
    setPendingAiIntent(intent);
  }, [aiRuntimeState, runAiIntent]);
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
  const handleRetryFailedSuggestionQueueItems = useCallback(() => {
    suggestionQueue
      .filter((entry) => entry.status === "failed")
      .forEach((entry) => {
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
          forceQueue: true,
          queueEntryId: entry.id,
          sourceDocumentId: entry.sourceDocumentId,
          targetDocumentId: entry.targetDocumentId,
        });
      });
  }, [queueKnowledgeSuggestion, suggestionQueue]);
  const handleOpenNextSuggestionQueueItem = useCallback(() => {
    const nextReadyEntry = suggestionQueue.find((entry) =>
      entry.status === "ready" && entry.hasPatchSet && entry.patchSet);

    if (!nextReadyEntry) {
      return;
    }

    handleOpenSuggestionQueueItem(nextReadyEntry.id);
  }, [handleOpenSuggestionQueueItem, suggestionQueue]);
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
  const workspaceErrorMessage = workspaceAuthError instanceof Error ? workspaceAuthError.message : null;
  const workspaceImportErrorMessage = workspaceFilesError instanceof Error ? workspaceFilesError.message : null;
  const workspaceChangesErrorMessage = workspaceChangesError instanceof Error ? workspaceChangesError.message : null;
  const handleOpenWorkspaceConnection = useCallback(() => {
    setWorkspaceConnectionOpen(true);
  }, []);
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
      const message = error instanceof Error ? error.message : "Failed to start Google Workspace auth.";
      toast.error(message);
    });
  }, [openGoogleConnect]);
  const handleDisconnectWorkspace = useCallback(() => {
    void disconnectWorkspace()
      .then(() => {
        toast.success("Google Workspace disconnected.");
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Failed to disconnect Google Workspace.";
        toast.error(message);
      });
  }, [disconnectWorkspace]);
  const handleImportWorkspaceFile = useCallback((fileId: string) => {
    void importWorkspaceFile(fileId)
      .then((result) => {
        createDocument(resolveImportedDocumentOptions({
          activeDocId,
          documents,
          importedDocument: result.document,
        }));
        setWorkspaceImportOpen(false);
        toast.success(`Imported "${result.document.name || "Google document"}".`);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Failed to import the selected Google document.";
        toast.error(message);
      });
  }, [activeDocId, createDocument, documents, importWorkspaceFile]);
  const handleRescanWorkspaceChanges = useCallback(() => {
    void rescanWorkspaceChanges()
      .then((result) => {
        if (result.changes.length === 0) {
          toast.info("No remote Google Docs changes were detected.");
          return;
        }

        toast.warning(`Detected ${result.changes.length} changed Google document${result.changes.length === 1 ? "" : "s"}.`);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Failed to rescan Google Workspace sources.";
        toast.error(message);
      });
  }, [rescanWorkspaceChanges]);
  const handleRefreshWorkspaceDocument = useCallback((documentId: string) => {
    void refreshWorkspaceDocument(documentId)
      .then(() => {
        toast.success("Refreshed the Google document.");
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Failed to refresh the Google document.";
        toast.error(message);
      });
  }, [refreshWorkspaceDocument]);

  useEffect(() => {
    if (activeDoc.mode === "json" || activeDoc.mode === "yaml") {
      setActiveEditor(null);
      return;
    }

    setPlainTextSearchAdapter(null);
  }, [activeDoc.mode]);

  useEffect(() => {
    if (!aiRuntimeState || !pendingAiIntent) {
      return;
    }

    void runAiIntent(pendingAiIntent);
    setPendingAiIntent(null);
  }, [aiRuntimeState, pendingAiIntent, runAiIntent]);

  useEffect(() => {
    const authResult = searchParams.get("workspaceAuth");
    const authError = searchParams.get("workspaceAuthError");

    if (!authResult && !authError) {
      return;
    }

    if (authResult === "connected") {
      toast.success("Google Workspace connected.");
      void refetchWorkspaceAuth();
    } else if (authError) {
      toast.error(authError);
      setWorkspaceConnectionOpen(true);
    }

    clearWorkspaceAuthParams();
  }, [clearWorkspaceAuthParams, refetchWorkspaceAuth, searchParams]);

  useEffect(() => {
    if (!workspaceConnected && workspaceImportOpen) {
      setWorkspaceImportOpen(false);
    }
  }, [workspaceConnected, workspaceImportOpen]);

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

  const handleDeleteDoc = useCallback((id: string) => {
    deleteDocument(id);
    void removeDocumentVersionSnapshots(id);
  }, [deleteDocument, removeDocumentVersionSnapshots]);

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
    if (hasRestoredDocuments) {
      toast.info(t("toasts.restoredSession"), { duration: 2000 });
    }
  }, [hasRestoredDocuments, t]);

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

  const aiAssistantDialogProps = aiRuntimeState
    ? {
      busyAction: aiRuntimeState.busyAction,
      compareCandidates: aiRuntimeState.compareCandidates,
      comparePreview: aiRuntimeState.comparePreview,
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
      busyAction: null,
      compareCandidates: [],
      comparePreview: null,
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
            currentRenderableMarkdown={currentRenderableMarkdown}
            documents={documents}
            loadPatchSet={loadPatchSet}
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
          onOpenStructuredModes: enableStructuredModes,
          onOpenWorkspaceConnection: handleOpenWorkspaceConnection,
          onOpenWorkspaceImport: handleOpenWorkspaceImport,
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
          showStructuredModeAction: false,
          textStats,
          workspaceBinding: activeDoc.workspaceBinding,
          workspaceConnected,
          workspaceConnectionPending: workspaceConnecting || workspaceDisconnecting || workspaceAuthLoading,
          workspaceImportPending: workspaceImporting || workspaceFilesLoading,
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
            knowledgeProps: {
              acceptedPatchCount,
              onDismissSuggestionQueueItem: handleDismissSuggestionQueueItem,
              onGenerateTocSuggestion: () => {
                requestAiIntent({ type: "generate-toc" });
              },
              onOpenNextSuggestionQueueItem: handleOpenNextSuggestionQueueItem,
              onOpenPatchReview: openPatchReview,
              onRefreshWorkspaceDocument: handleRefreshWorkspaceDocument,
              onRescanWorkspaceSources: handleRescanWorkspaceChanges,
              onOpenSuggestionQueueItem: handleOpenSuggestionQueueItem,
              onRetryFailedSuggestionQueueItems: handleRetryFailedSuggestionQueueItems,
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
              patchCount,
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
    </>
  );
};

export default Index;
