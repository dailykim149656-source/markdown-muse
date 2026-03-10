import type { JSONContent } from "@tiptap/core";
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import type { AiAssistantRuntimeState } from "@/components/editor/AiAssistantRuntime";
import EditorWorkspace from "@/components/editor/EditorWorkspace";
import type { DocumentTemplate } from "@/components/editor/TemplateDialog";
import type { PlainTextFindReplaceAdapter } from "@/components/editor/findReplaceTypes";
import { useDocumentManager } from "@/hooks/useDocumentManager";
import { MAX_IMPORT_FILE_SIZE_BYTES, useDocumentIO } from "@/hooks/useDocumentIO";
import { useEditorUiState } from "@/hooks/useEditorUiState";
import { useFormatConversion } from "@/hooks/useFormatConversion";
import { usePatchReview } from "@/hooks/usePatchReview";
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
import { DOC_SHARE_HASH_PREFIX } from "@/lib/share/shareConstants";
import type { EditorMode } from "@/types/document";
import { toast } from "sonner";

const MarkdownEditor = lazy(() => import("@/components/editor/MarkdownEditor"));
const LatexEditor = lazy(() => import("@/components/editor/LatexEditor"));
const HtmlEditor = lazy(() => import("@/components/editor/HtmlEditor"));
const JsonYamlEditor = lazy(() => import("@/components/editor/JsonYamlEditor"));
const AiAssistantRuntime = lazy(() => import("@/components/editor/AiAssistantRuntime"));

const EditorFallback = () => (
  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
    Loading editor...
  </div>
);

type PendingAiIntent =
  | { type: "open" }
  | { type: "generate-toc" }
  | { targetDocumentId: string; type: "suggest-updates" };

const Index = () => {
  const { t } = useI18n();
  const [activeEditor, setActiveEditor] = useState<TiptapEditor | null>(null);
  const [pendingImpactSuggestion, setPendingImpactSuggestion] = useState<{
    sourceDocumentId: string;
    targetDocumentId: string;
  } | null>(null);
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
  const [historyEnabled, setHistoryEnabled] = useState(() => featureFlags.historyOnInitialMount);
  const [knowledgeEnabled, setKnowledgeEnabled] = useState(() => featureFlags.knowledgeOnInitialMount);
  const [structuredModesVisible, setStructuredModesVisible] = useState(() => featureFlags.structuredModesVisibleOnInitialMount);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
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
    onPatchSetLoad: loadPatchSet,
    onVersionSnapshot: (metadata) => createVersionSnapshot(activeDoc, "export", metadata),
    renderableEditorHtml: currentRenderableHtml,
    renderableLatexDocument: currentRenderableLatexDocument,
    renderableMarkdown: currentRenderableMarkdown,
  });
  const showStructuredModes = !isWebProfile
    || structuredModesVisible
    || activeDoc.mode === "json"
    || activeDoc.mode === "yaml";
  const availableModes = showStructuredModes
    ? ["markdown", "latex", "html", "json", "yaml"] as EditorMode[]
    : ["markdown", "latex", "html"] as EditorMode[];
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

    await aiRuntimeState.suggestUpdatesFromDocument(intent.targetDocumentId);
  }, [aiRuntimeState]);

  const requestAiIntent = useCallback((intent: PendingAiIntent) => {
    if (aiRuntimeState) {
      void runAiIntent(intent);
      return;
    }

    setAiRuntimeEnabled(true);
    setPendingAiIntent(intent);
  }, [aiRuntimeState, runAiIntent]);

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
    createDocument({
      content: template.content,
      mode: template.mode,
      name: template.name,
    });
    toast.success(t("toasts.templateApplied"));
  }, [createDocument, t]);

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
    if (!pendingImpactSuggestion) {
      return;
    }

    if (activeDoc.id !== pendingImpactSuggestion.sourceDocumentId) {
      selectDocument(pendingImpactSuggestion.sourceDocumentId);
      return;
    }

    if (activeDoc.mode === "json" || activeDoc.mode === "yaml") {
      toast.error("Impact suggestions currently require a rich-text source document.");
      setPendingImpactSuggestion(null);
      return;
    }

    requestAiIntent({
      targetDocumentId: pendingImpactSuggestion.targetDocumentId,
      type: "suggest-updates",
    });
    setPendingImpactSuggestion(null);
  }, [activeDoc.id, activeDoc.mode, pendingImpactSuggestion, requestAiIntent, selectDocument]);

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

  const renderEditor = useCallback(() => {
    if (activeDoc.mode === "markdown") {
      return (
        <Suspense fallback={<EditorFallback />}>
          <MarkdownEditor
            advancedBlocksEnabled={advancedBlocksEnabled}
            canEnableAdvancedBlocks={canEnableAdvancedBlocks}
            canEnableDocumentFeatures={canEnableDocumentFeatures}
            documentFeaturesEnabled={documentFeaturesEnabled}
            key={`${editorKey}:${documentFeaturesEnabled ? "document" : "core"}:${advancedBlocksEnabled ? "advanced" : "base"}`}
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
            key={`${editorKey}:${documentFeaturesEnabled ? "document" : "core"}:${advancedBlocksEnabled ? "advanced" : "base"}`}
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
            key={editorKey}
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
          key={`${editorKey}:${documentFeaturesEnabled ? "document" : "core"}:${advancedBlocksEnabled ? "advanced" : "base"}`}
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
  }, [activeDoc.content, activeDoc.mode, activeDoc.tiptapJson, advancedBlocksEnabled, canEnableAdvancedBlocks, canEnableDocumentFeatures, documentFeaturesEnabled, editorKey, enableAdvancedBlocks, enableDocumentFeatures, handleContentChange, handleModeChange, handleTiptapChange, setLiveEditorHtml]);

  const aiAssistantDialogProps = aiRuntimeState
    ? {
      busyAction: aiRuntimeState.busyAction,
      compareCandidates: aiRuntimeState.compareCandidates,
      comparePreview: aiRuntimeState.comparePreview,
      onCompare: aiRuntimeState.compareWithDocument,
      onExtractProcedure: aiRuntimeState.extractProcedureFromActiveDocument,
      onGenerateSection: aiRuntimeState.generateSectionPatch,
      onGenerateToc: aiRuntimeState.generateTocSuggestion,
      onLoadTocPatch: aiRuntimeState.loadTocPatch,
      onOpenChange: aiRuntimeState.setAssistantOpen,
      onSuggestUpdates: aiRuntimeState.suggestUpdatesFromDocument,
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
          mode: activeDoc.mode,
          onOpenAiAssistant: () => requestAiIntent({ type: "open" }),
          onOpenStructuredModes: enableStructuredModes,
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
          showStructuredModeAction: isWebProfile && !showStructuredModes,
          textStats,
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
              onGenerateTocSuggestion: () => {
                requestAiIntent({ type: "generate-toc" });
              },
              onSuggestKnowledgeImpactUpdate: (sourceDocumentId: string, targetDocumentId: string) => {
                if (activeDoc.id === sourceDocumentId) {
                  requestAiIntent({
                    targetDocumentId,
                    type: "suggest-updates",
                  });
                  return;
                }

                setPendingImpactSuggestion({ sourceDocumentId, targetDocumentId });
                selectDocument(sourceDocumentId);
              },
              onSuggestKnowledgeUpdates: (documentId: string) => {
                requestAiIntent({
                  targetDocumentId: documentId,
                  type: "suggest-updates",
                });
              },
            },
            onDeleteDoc: handleDeleteDoc,
            onActivateHistory: () => setHistoryEnabled(true),
            onActivateKnowledge: () => setKnowledgeEnabled(true),
            onNewDoc: handleNewDoc,
            onOpenStructuredModes: enableStructuredModes,
            onOpenTemplates: openTemplateDialog,
            onRenameDoc: renameDocument,
            onSelectDoc: selectDocument,
            showStructuredCreateAction: isWebProfile && !showStructuredModes,
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
    </>
  );
};

export default Index;
