import { useCallback, useEffect, useState } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import MarkdownEditor from "@/components/editor/MarkdownEditor";
import LatexEditor from "@/components/editor/LatexEditor";
import HtmlEditor from "@/components/editor/HtmlEditor";
import JsonYamlEditor from "@/components/editor/JsonYamlEditor";
import TemplateDialog, { type DocumentTemplate } from "@/components/editor/TemplateDialog";
import EditorHeader, { type EditorMode } from "@/components/editor/EditorHeader";
import FindReplaceBar from "@/components/editor/FindReplaceBar";
import KeyboardShortcutsModal from "@/components/editor/KeyboardShortcutsModal";
import DocumentTabs from "@/components/editor/DocumentTabs";
import FileSidebar from "@/components/editor/FileSidebar";
import ExportPreviewPanel from "@/components/editor/ExportPreviewPanel";
import type { PlainTextFindReplaceAdapter } from "@/components/editor/findReplaceTypes";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useDocumentManager } from "@/hooks/useDocumentManager";
import { useDocumentIO } from "@/hooks/useDocumentIO";
import { useEditorUiState } from "@/hooks/useEditorUiState";
import { useFormatConversion } from "@/hooks/useFormatConversion";
import { toast } from "sonner";

const Index = () => {
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
    currentEditorHtml,
    handleModeChange,
    setLiveEditorHtml,
    textStats,
  } = useFormatConversion({
    activeDoc,
    activeDocId,
    bumpEditorKey,
    countWithSpaces,
    editorKey,
    updateActiveDoc,
  });
  const {
    fileInputRef,
    handleFileChange,
    handleLoad,
    handlePrint,
    handleSaveAdoc,
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
    currentEditorHtml,
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

  const handleNewDoc = useCallback((mode: EditorMode = "markdown") => {
    createDocument({ mode });
  }, [createDocument]);

  const handleTemplateSelect = useCallback((template: DocumentTemplate) => {
    createDocument({
      content: template.content,
      mode: template.mode,
      name: template.name,
    });
    toast.success("Template applied.");
  }, [createDocument]);

  useEffect(() => {
    if (hasRestoredDocuments) {
      toast.info("Restored previous session.", { duration: 2000 });
    }
  }, [hasRestoredDocuments]);

  const renderEditor = useCallback(() => {
    if (activeDoc.mode === "markdown") {
      return (
        <MarkdownEditor
          key={editorKey}
          initialContent={activeDoc.content || undefined}
          onContentChange={handleContentChange}
          onEditorReady={setActiveEditor}
          onHtmlChange={setLiveEditorHtml}
        />
      );
    }

    if (activeDoc.mode === "latex") {
      return (
        <LatexEditor
          key={editorKey}
          initialContent={activeDoc.content}
          onContentChange={handleContentChange}
          onEditorReady={setActiveEditor}
          onHtmlChange={setLiveEditorHtml}
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
        onContentChange={handleContentChange}
        onEditorReady={setActiveEditor}
        onHtmlChange={setLiveEditorHtml}
      />
    );
  }, [activeDoc.content, activeDoc.mode, editorKey, handleContentChange, handleModeChange, setLiveEditorHtml]);

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="h-screen flex w-full">
        <FileSidebar
          activeDocId={activeDocId}
          documents={documents}
          onDeleteDoc={deleteDocument}
          onNewDoc={handleNewDoc}
          onOpenTemplates={openTemplateDialog}
          onRenameDoc={renameDocument}
          onSelectDoc={selectDocument}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <EditorHeader
            countWithSpaces={countWithSpaces}
            fileName={activeDoc.name}
            isDark={isDark}
            isFullscreen={isFullscreen}
            mode={activeDoc.mode}
            onFileNameChange={handleFileNameChange}
            onLoad={handleLoad}
            onModeChange={handleModeChange}
            onOpenShortcuts={openShortcuts}
            onPrint={handlePrint}
            onSaveAdoc={handleSaveAdoc}
            onSaveHtml={handleSaveHtml}
            onSaveJson={handleSaveJson}
            onSaveMd={handleSaveMd}
            onSavePdf={handleSavePdf}
            onSaveRst={handleSaveRst}
            onSaveTex={handleSaveTex}
            onSaveTypst={handleSaveTypst}
            onSaveYaml={handleSaveYaml}
            onToggleCountMode={toggleCountMode}
            onToggleFullscreen={toggleFullscreen}
            onTogglePreview={togglePreview}
            onToggleTheme={toggleTheme}
            previewOpen={previewOpen}
            textStats={textStats}
          />
          <DocumentTabs
            activeDocId={activeDocId}
            documents={documents}
            onCloseDoc={closeDocument}
            onNewDoc={() => handleNewDoc()}
            onSelectDoc={selectDocument}
          />
          <FindReplaceBar
            editor={activeEditor}
            plainTextAdapter={plainTextSearchAdapter}
            onClose={closeFindReplace}
            open={findReplaceOpen}
          />
          <div className="flex-1 overflow-hidden">
            {previewOpen && activeDoc.mode !== "json" && activeDoc.mode !== "yaml" ? (
              <ResizablePanelGroup direction="horizontal" className="h-full">
                <ResizablePanel defaultSize={60} minSize={30}>
                  <div className="h-full overflow-y-auto">
                    {renderEditor()}
                  </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={40} minSize={20} maxSize={60}>
                  <ExportPreviewPanel
                    editorHtml={currentEditorHtml}
                    editorMode={activeDoc.mode}
                    fileName={activeDoc.name}
                    onClose={closePreview}
                    rawContent={activeDoc.content}
                  />
                </ResizablePanel>
              </ResizablePanelGroup>
            ) : (
              renderEditor()
            )}
          </div>
          <input
            ref={fileInputRef}
            accept=".md,.markdown,.txt,.tex,.html,.htm,.json,.yaml,.yml,.adoc,.asciidoc,.rst"
            className="hidden"
            onChange={handleFileChange}
            type="file"
          />
          <KeyboardShortcutsModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
          <TemplateDialog open={templateOpen} onOpenChange={setTemplateOpen} onSelect={handleTemplateSelect} />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
