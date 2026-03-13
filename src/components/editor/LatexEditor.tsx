import type { JSONContent } from "@tiptap/core";
import { EditorContent, type Editor, useEditor } from "@tiptap/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EditorToolbar from "./EditorToolbar";
import {
  htmlHasAdvancedContent,
  htmlHasDocumentContent,
  tiptapDocumentHasAdvancedContent,
  tiptapDocumentHasDocumentContent,
} from "./editorAdvancedContent";
import { useEditorExtensions } from "./editorConfig";
import { rememberEditorSelection } from "./editorSelectionMemory";
import { applyEditorSeed } from "./editorSeedSync";
import { DEFAULT_MARKDOWN_TAB_SIZE, applyMarkdownTabIndent } from "./utils/markdownTabIndent";
import { latexToHtml } from "./utils/htmlToLatex";
import { SourcePanel, SplitEditorLayout } from "./SourcePanel";
import LatexHighlightEditor from "./LatexHighlightEditor";
import { exportDocsyToLatex } from "@/lib/latex/exportDocsyToLatex";
import { importLatexToDocsy } from "@/lib/latex/importLatexToDocsy";
import { isUsableTiptapDocument } from "@/lib/ast/tiptapUsability";

interface LatexEditorProps {
  advancedBlocksEnabled?: boolean;
  canEnableAdvancedBlocks?: boolean;
  canEnableDocumentFeatures?: boolean;
  documentFeaturesEnabled?: boolean;
  initialHtmlOverride?: string;
  initialContent?: string;
  initialTiptapDoc?: JSONContent;
  onContentChange?: (content: string) => void;
  onEnableAdvancedBlocks?: () => void;
  onEnableDocumentFeatures?: () => void;
  onHtmlChange?: (html: string) => void;
  onEditorReady?: (editor: Editor | null) => void;
  onSourceLineTargetApplied?: () => void;
  onTiptapChange?: (document: JSONContent | null) => void;
  sourceLineTarget?: number | null;
}

const LatexEditor = ({
  advancedBlocksEnabled = false,
  canEnableAdvancedBlocks = false,
  canEnableDocumentFeatures = false,
  documentFeaturesEnabled = false,
  initialHtmlOverride,
  initialContent,
  initialTiptapDoc,
  onContentChange,
  onEnableAdvancedBlocks,
  onEnableDocumentFeatures,
  onHtmlChange,
  onEditorReady,
  onSourceLineTargetApplied,
  onTiptapChange,
  sourceLineTarget = null,
}: LatexEditorProps) => {
  const [latexSource, setLatexSource] = useState(initialContent || "");
  const [showPanel, setShowPanel] = useState(true);
  const [sourceLeft, setSourceLeft] = useState(false);

  const syncingFromSource = useRef(false);
  const syncingFromWysiwyg = useRef(false);
  const sourceSyncFrame = useRef<number | null>(null);
  const seedSignatureRef = useRef<string | null>(null);
  const initialHtml = useMemo(() => {
    if (typeof initialHtmlOverride === "string") {
      return initialHtmlOverride;
    }

    return initialContent ? importLatexToDocsy(initialContent).html || latexToHtml(initialContent, { includeMetadata: false }) : "";
  }, [initialContent, initialHtmlOverride]);
  const requiresDocumentFeatures = tiptapDocumentHasDocumentContent(initialTiptapDoc) || htmlHasDocumentContent(initialHtml);
  const requiresAdvancedBlocks = tiptapDocumentHasAdvancedContent(initialTiptapDoc) || htmlHasAdvancedContent(initialHtml);
  const sourcePanelRef = useRef<HTMLDivElement | null>(null);
  const sourceTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const usableInitialTiptapDoc = isUsableTiptapDocument(initialTiptapDoc) ? initialTiptapDoc : undefined;
  const { editorPropsDefault, coreExtensions, extensions, extensionsReady } = useEditorExtensions(
    "LaTeX WYSIWYG with synced source pane.",
    documentFeaturesEnabled,
    advancedBlocksEnabled,
  );
  const shouldHoldEditor = (requiresDocumentFeatures && !documentFeaturesEnabled)
    || (requiresAdvancedBlocks && !advancedBlocksEnabled)
    || ((documentFeaturesEnabled || advancedBlocksEnabled) && !extensionsReady);

  useEffect(() => {
    if (requiresDocumentFeatures && !documentFeaturesEnabled) {
      onEnableDocumentFeatures?.();
    }
  }, [documentFeaturesEnabled, onEnableDocumentFeatures, requiresDocumentFeatures]);

  useEffect(() => {
    if (requiresAdvancedBlocks && !advancedBlocksEnabled) {
      onEnableAdvancedBlocks?.();
    }
  }, [advancedBlocksEnabled, onEnableAdvancedBlocks, requiresAdvancedBlocks]);

  const applySourceTabIndent = useCallback((ta: HTMLTextAreaElement, shiftKey: boolean) => {
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    const next = applyMarkdownTabIndent(ta.value, start, end, {
      tabSize: DEFAULT_MARKDOWN_TAB_SIZE,
      shiftKey,
    });

    setLatexSource(next.value);

    requestAnimationFrame(() => {
      if (document.activeElement !== ta) {
        ta.focus();
      }
      ta.setSelectionRange(next.selectionStart, next.selectionEnd);
    });
  }, []);

  const handleWysiwygUpdate = useCallback(
    (html: string, document: JSONContent) => {
      if (syncingFromSource.current) return;
      syncingFromWysiwyg.current = true;
      const latex = exportDocsyToLatex({
        currentLatexSource: latexSource,
        html,
      });
      setLatexSource(latex);
      onContentChange?.(latex);
      onHtmlChange?.(html);
      onTiptapChange?.(document);
      queueMicrotask(() => { syncingFromWysiwyg.current = false; });
    },
    [latexSource, onContentChange, onHtmlChange, onTiptapChange]
  );

  const editor = useEditor({
    extensions: shouldHoldEditor ? coreExtensions : extensions,
    content: shouldHoldEditor ? "" : (usableInitialTiptapDoc || initialHtml),
    onCreate: ({ editor }) => {
      rememberEditorSelection(editor);
    },
    onFocus: ({ editor }) => {
      rememberEditorSelection(editor);
    },
    onSelectionUpdate: ({ editor }) => {
      rememberEditorSelection(editor);
    },
    onUpdate: ({ editor }) => {
      rememberEditorSelection(editor);
      handleWysiwygUpdate(editor.getHTML(), editor.getJSON());
    },
    editorProps: editorPropsDefault,
  }, [advancedBlocksEnabled, documentFeaturesEnabled, extensionsReady, shouldHoldEditor]);

  useEffect(() => {
    const nextLatex = initialContent || "";

    setLatexSource((current) => current === nextLatex ? current : nextLatex);
  }, [initialContent]);

  useEffect(() => {
    if (!sourceLineTarget) {
      return;
    }

    setShowPanel(true);
  }, [sourceLineTarget]);

  useEffect(() => {
    if (!editor || shouldHoldEditor) {
      return;
    }

    applyEditorSeed({
      editor,
      nextContent: usableInitialTiptapDoc || initialHtml,
      onHtmlChange,
      onTiptapChange,
      seedSignatureRef,
    });
  }, [editor, initialHtml, onHtmlChange, onTiptapChange, shouldHoldEditor, usableInitialTiptapDoc]);

  useEffect(() => {
    onEditorReady?.(editor);

    if (editor) {
      onHtmlChange?.(editor.getHTML());
      onTiptapChange?.(editor.getJSON());
    }

    return () => {
      onEditorReady?.(null);
    };
  }, [editor, onEditorReady, onHtmlChange, onTiptapChange]);

  const handleSourceChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newLatex = e.target.value;
      const html = importLatexToDocsy(newLatex).html || latexToHtml(newLatex, { includeMetadata: false });
      setLatexSource(newLatex);
      onContentChange?.(newLatex);
      onHtmlChange?.(html);
      if (!documentFeaturesEnabled && htmlHasDocumentContent(html)) {
        onEnableDocumentFeatures?.();
        return;
      }
      if (!advancedBlocksEnabled && htmlHasAdvancedContent(html)) {
        onEnableAdvancedBlocks?.();
        return;
      }

      if (sourceSyncFrame.current !== null) {
        cancelAnimationFrame(sourceSyncFrame.current);
      }

      sourceSyncFrame.current = requestAnimationFrame(() => {
        sourceSyncFrame.current = null;
        if (!editor || syncingFromWysiwyg.current) return;
        if (editor.getHTML() === html) return;
        syncingFromSource.current = true;
        editor.commands.setContent(html, { emitUpdate: false });
        onTiptapChange?.(editor.getJSON());
        queueMicrotask(() => { syncingFromSource.current = false; });
      });
    },
    [advancedBlocksEnabled, documentFeaturesEnabled, editor, onContentChange, onEnableAdvancedBlocks, onEnableDocumentFeatures, onHtmlChange, onTiptapChange]
  );

  useEffect(() => () => {
    if (sourceSyncFrame.current !== null) {
      cancelAnimationFrame(sourceSyncFrame.current);
      sourceSyncFrame.current = null;
    }
  }, []);

  const handleSourceKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== "Tab" || e.defaultPrevented) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();

      const ta = e.currentTarget;
      applySourceTabIndent(ta, e.shiftKey);
    },
    [applySourceTabIndent]
  );

  const handleSourcePanelKeyDownCapture = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== "Tab" || e.defaultPrevented) {
        return;
      }

      const textarea = sourceTextareaRef.current;
      if (!textarea) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();

      if (document.activeElement !== textarea) {
        textarea.focus();
      }

      applySourceTabIndent(textarea, e.shiftKey);
    },
    [applySourceTabIndent]
  );

  if (shouldHoldEditor) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading editor...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <EditorToolbar
        advancedBlocksEnabled={advancedBlocksEnabled}
        canEnableAdvancedBlocks={canEnableAdvancedBlocks}
        canEnableDocumentFeatures={canEnableDocumentFeatures}
        documentFeaturesEnabled={documentFeaturesEnabled}
        editor={editor}
        onEnableAdvancedBlocks={onEnableAdvancedBlocks}
        onEnableDocumentFeatures={onEnableDocumentFeatures}
      />
      <SplitEditorLayout
        showPanel={showPanel}
        sourceLeft={sourceLeft}
        onShowPanel={setShowPanel}
        editorContent={<EditorContent editor={editor} />}
        sourcePanel={
          <SourcePanel
            focusLineNumber={sourceLineTarget}
            rootRef={sourcePanelRef}
            label="LaTeX Source"
            onFocusLineHandled={onSourceLineTargetApplied}
            textareaRef={sourceTextareaRef}
            value={latexSource}
            onChange={handleSourceChange}
            onKeyDown={handleSourceKeyDown}
            onKeyDownCapture={handleSourceKeyDown}
            onPanelKeyDownCapture={handleSourcePanelKeyDownCapture}
            onSwap={() => setSourceLeft(v => !v)}
            onClose={() => setShowPanel(false)}
            placeholder="% Edit raw LaTeX source here.\n% Use indentation with Tab and Shift+Tab.\n"
          >
            <LatexHighlightEditor
              value={latexSource}
              onChange={handleSourceChange}
              onKeyDown={handleSourceKeyDown}
              textareaRef={sourceTextareaRef}
              placeholder="% Edit raw LaTeX source here.\n% Use indentation with Tab and Shift+Tab.\n"
            />
          </SourcePanel>
        }
      />
    </div>
  );
};

export default LatexEditor;
