import type { JSONContent } from "@tiptap/core";
import { useCallback, useEffect, useState } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import MarkdownEditor from "@/components/editor/MarkdownEditor";
import LatexEditor from "@/components/editor/LatexEditor";
import HtmlEditor from "@/components/editor/HtmlEditor";
import JsonYamlEditor from "@/components/editor/JsonYamlEditor";
import EditorWorkspace from "@/components/editor/EditorWorkspace";
import TemplateDialog, { type DocumentTemplate } from "@/components/editor/TemplateDialog";
import type { PlainTextFindReplaceAdapter } from "@/components/editor/findReplaceTypes";
import { useAiAssistant } from "@/hooks/useAiAssistant";
import { useDocumentManager } from "@/hooks/useDocumentManager";
import { useDocumentIO } from "@/hooks/useDocumentIO";
import { useEditorUiState } from "@/hooks/useEditorUiState";
import { useFormatConversion } from "@/hooks/useFormatConversion";
import { usePatchReview } from "@/hooks/usePatchReview";
import { useI18n } from "@/i18n/useI18n";
import { serializeTiptapToAst } from "@/lib/ast/tiptapAst";
import type { EditorMode } from "@/types/document";
import { toast } from "sonner";

const Index = () => {
  const { t } = useI18n();
  const [activeEditor, setActiveEditor] = useState<TiptapEditor | null>(null);
  const [plainTextSearchAdapter, setPlainTextSearchAdapter] = useState<PlainTextFindReplaceAdapter | null>(null);
  const {
    activeDoc,
    activeDocId,
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
    setLiveEditorHtml,
    updateActiveDoc,
  });
  const {
    assistantOpen,
    busyAction: aiBusyAction,
    compareCandidates,
    comparePreview,
    compareWithDocument,
    generateSectionPatch,
    richTextAvailable,
    setAssistantOpen,
    summarizeActiveDocument,
    summaryResult,
  } = useAiAssistant({
    activeDoc,
    activeEditor,
    currentRenderableMarkdown,
    documents,
    loadPatchSet,
  });
  const {
    fileInputRef,
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
    renderableEditorHtml: currentRenderableHtml,
    renderableLatexDocument: currentRenderableLatexDocument,
    renderableMarkdown: currentRenderableMarkdown,
  });

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
        <MarkdownEditor
          key={editorKey}
          initialContent={activeDoc.content || undefined}
          initialTiptapDoc={activeDoc.tiptapJson || undefined}
          onContentChange={handleContentChange}
          onEditorReady={setActiveEditor}
          onHtmlChange={setLiveEditorHtml}
          onTiptapChange={handleTiptapChange}
        />
      );
    }

    if (activeDoc.mode === "latex") {
      return (
        <LatexEditor
          key={editorKey}
          initialContent={activeDoc.content}
          initialTiptapDoc={activeDoc.tiptapJson || undefined}
          onContentChange={handleContentChange}
          onEditorReady={setActiveEditor}
          onHtmlChange={setLiveEditorHtml}
          onTiptapChange={handleTiptapChange}
        />
      );
    }

    if (activeDoc.mode === "json" || activeDoc.mode === "yaml") {
      return (
        <JsonYamlEditor
          key={editorKey}
          initialContent={activeDoc.content}
          mode={activeDoc.mode}
          onContentChange={handleContentChange}
          onModeChange={handleModeChange}
          onPlainTextSearchAdapterReady={setPlainTextSearchAdapter}
        />
      );
    }

    return (
      <HtmlEditor
        key={editorKey}
        initialContent={activeDoc.content}
        initialTiptapDoc={activeDoc.tiptapJson || undefined}
        onContentChange={handleContentChange}
        onEditorReady={setActiveEditor}
        onHtmlChange={setLiveEditorHtml}
        onTiptapChange={handleTiptapChange}
      />
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
        onGenerateSection: generateSectionPatch,
        onOpenChange: setAssistantOpen,
        onSummarize: summarizeActiveDocument,
        open: assistantOpen,
        richTextAvailable,
        summaryResult,
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
        fileName: activeDoc.name,
        isDark,
        isFullscreen,
        mode: activeDoc.mode,
        onOpenAiAssistant: () => setAssistantOpen(true),
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
        onDeleteDoc: deleteDocument,
        onNewDoc: handleNewDoc,
        onOpenTemplates: openTemplateDialog,
        onRenameDoc: renameDocument,
        onSelectDoc: selectDocument,
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
