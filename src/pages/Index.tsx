import type { JSONContent } from "@tiptap/core";
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import EditorWorkspace from "@/components/editor/EditorWorkspace";
import type { DocumentTemplate } from "@/components/editor/TemplateDialog";
import type { PlainTextFindReplaceAdapter } from "@/components/editor/findReplaceTypes";
import { useAiAssistant } from "@/hooks/useAiAssistant";
import { useDocumentManager } from "@/hooks/useDocumentManager";
import { MAX_IMPORT_FILE_SIZE_BYTES, useDocumentIO } from "@/hooks/useDocumentIO";
import { useEditorUiState } from "@/hooks/useEditorUiState";
import { useFormatConversion } from "@/hooks/useFormatConversion";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { usePatchReview } from "@/hooks/usePatchReview";
import { useI18n } from "@/i18n/useI18n";
import { useVersionHistory } from "@/hooks/useVersionHistory";
import { serializeTiptapToAst } from "@/lib/ast/tiptapAst";
import { analyzeFormatConsistency } from "@/lib/analysis/formatConsistency";
import { DOC_SHARE_HASH_PREFIX, parseSharedDocumentFromHash } from "@/lib/share/docShare";
import type { EditorMode } from "@/types/document";
import { toast } from "sonner";

const MarkdownEditor = lazy(() => import("@/components/editor/MarkdownEditor"));
const LatexEditor = lazy(() => import("@/components/editor/LatexEditor"));
const HtmlEditor = lazy(() => import("@/components/editor/HtmlEditor"));
const JsonYamlEditor = lazy(() => import("@/components/editor/JsonYamlEditor"));

const EditorFallback = () => (
  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
    Loading editor...
  </div>
);

const Index = () => {
  const { t } = useI18n();
  const [activeEditor, setActiveEditor] = useState<TiptapEditor | null>(null);
  const [pendingImpactSuggestion, setPendingImpactSuggestion] = useState<{
    sourceDocumentId: string;
    targetDocumentId: string;
  } | null>(null);
  const [plainTextSearchAdapter, setPlainTextSearchAdapter] = useState<PlainTextFindReplaceAdapter | null>(null);
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
    assistantOpen,
    busyAction: aiBusyAction,
    compareCandidates,
    comparePreview,
    compareWithDocument,
    extractProcedureFromActiveDocument,
    generateSectionPatch,
    generateTocSuggestion,
    loadTocPatch,
    procedureResult,
    richTextAvailable,
    setAssistantOpen,
    suggestUpdatesFromDocument,
    summarizeActiveDocument,
    summaryResult,
    tocPreview,
    updateSuggestionPreview,
  } = useAiAssistant({
    activeDoc,
    activeEditor,
    currentRenderableMarkdown,
    documents,
    loadPatchSet,
  });
  const {
    fileInputRef,
    importState,
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
  const {
    deleteKnowledgeDocument,
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
    selectDocument,
  });
  const formatConsistencyIssues = analyzeFormatConsistency(activeDoc);

  useEffect(() => {
    if (activeDoc.mode === "json" || activeDoc.mode === "yaml") {
      setActiveEditor(null);
      return;
    }

    setPlainTextSearchAdapter(null);
  }, [activeDoc.mode]);

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
    createDocument({ mode });
  }, [createDocument]);

  const handleDeleteDoc = useCallback((id: string) => {
    deleteDocument(id);
    deleteKnowledgeDocument(id);
    void removeDocumentVersionSnapshots(id);
  }, [deleteDocument, deleteKnowledgeDocument, removeDocumentVersionSnapshots]);

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
    const openSharedDocumentFromHash = () => {
      if (typeof window === "undefined" || !window.location.hash.startsWith(DOC_SHARE_HASH_PREFIX)) {
        return;
      }

      try {
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

    openSharedDocumentFromHash();
    window.addEventListener("hashchange", openSharedDocumentFromHash);
    return () => window.removeEventListener("hashchange", openSharedDocumentFromHash);
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

    void suggestUpdatesFromDocument(pendingImpactSuggestion.targetDocumentId);
    setPendingImpactSuggestion(null);
  }, [activeDoc.id, activeDoc.mode, pendingImpactSuggestion, selectDocument, suggestUpdatesFromDocument]);

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
            key={editorKey}
            initialContent={activeDoc.content || undefined}
            initialTiptapDoc={activeDoc.tiptapJson || undefined}
            onContentChange={handleContentChange}
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
            key={editorKey}
            initialContent={activeDoc.content}
            initialTiptapDoc={activeDoc.tiptapJson || undefined}
            onContentChange={handleContentChange}
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
          key={editorKey}
          initialContent={activeDoc.content}
          initialTiptapDoc={activeDoc.tiptapJson || undefined}
          onContentChange={handleContentChange}
          onEditorReady={setActiveEditor}
          onHtmlChange={setLiveEditorHtml}
          onTiptapChange={handleTiptapChange}
        />
      </Suspense>
    );
  }, [activeDoc.content, activeDoc.mode, activeDoc.tiptapJson, editorKey, handleContentChange, handleModeChange, handleTiptapChange, setLiveEditorHtml]);

  return (
    <EditorWorkspace
      activeMode={activeDoc.mode}
      aiAssistantDialogProps={{
        busyAction: aiBusyAction,
        compareCandidates,
        comparePreview,
        onCompare: compareWithDocument,
        onExtractProcedure: extractProcedureFromActiveDocument,
        onGenerateSection: generateSectionPatch,
        onGenerateToc: generateTocSuggestion,
        onLoadTocPatch: loadTocPatch,
        onOpenChange: setAssistantOpen,
        onSuggestUpdates: suggestUpdatesFromDocument,
        onSummarize: summarizeActiveDocument,
        open: assistantOpen,
        procedureResult,
        richTextAvailable,
        summaryResult,
        tocPreview,
        updateSuggestionPreview,
      }}
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
        mode: activeDoc.mode,
        onOpenAiAssistant: () => setAssistantOpen(true),
        onOpenShare: () => setShareDialogOpen(true),
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
          activeDocId,
          documents,
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
          onDeleteDoc: handleDeleteDoc,
          onOpenKnowledgeRecord: openKnowledgeRecord,
          onOpenKnowledgeResult: openKnowledgeResult,
          onOpenRelatedKnowledgeDocument: openKnowledgeDocumentById,
          onNewDoc: handleNewDoc,
          onOpenTemplates: openTemplateDialog,
          onRebuildKnowledgeBase: rebuildKnowledgeBase,
          onReindexKnowledgeDocument: reindexKnowledgeDocument,
          onRenameDoc: renameDocument,
          onRescanKnowledgeSources: () => {
            void rescanKnowledgeSources();
          },
          onResetKnowledgeBase: resetKnowledgeBase,
          onSelectDoc: selectDocument,
          onSuggestKnowledgeImpactUpdate: (sourceDocumentId: string, targetDocumentId: string) => {
            if (activeDoc.id === sourceDocumentId) {
              void suggestUpdatesFromDocument(targetDocumentId);
              return;
            }

            setPendingImpactSuggestion({ sourceDocumentId, targetDocumentId });
            selectDocument(sourceDocumentId);
          },
          onSuggestKnowledgeUpdates: (documentId: string) => {
            void suggestUpdatesFromDocument(documentId);
          },
          onGenerateTocSuggestion: () => {
            void generateTocSuggestion();
            setAssistantOpen(true);
          },
          formatConsistencyIssues,
          recentKnowledgeRecords,
          setKnowledgeQuery,
          suggestableKnowledgeDocumentIds: richTextAvailable
            ? compareCandidates.map((document) => document.id)
            : [],
          versionHistoryReady,
          versionHistoryRestoring,
          versionHistorySnapshots,
          versionHistorySyncing,
          onRestoreVersionSnapshot: (snapshotId: string) => {
            void restoreVersionSnapshot(snapshotId);
          },
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
  );
};

export default Index;
