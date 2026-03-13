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
  seedRevision?: string;
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
  seedRevision = "default",
  sourceLineTarget = null,
}: LatexEditorProps) => {
  const [latexSource, setLatexSource] = useState(initialContent || "");
  const [isEditorComposing, setIsEditorComposing] = useState(false);
  const [showPanel, setShowPanel] = useState(true);
  const [sourceLeft, setSourceLeft] = useState(false);

  const latexSourceRef = useRef(initialContent || "");
  const isEditorComposingRef = useRef(false);
  const syncingFromSource = useRef(false);
  const syncingFromWysiwyg = useRef(false);
  const pendingWysiwygUpdateRef = useRef<{ document: JSONContent; html: string } | null>(null);
  const sourceSyncFrame = useRef<number | null>(null);
  const wysiwygSyncFrame = useRef<number | null>(null);
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
  const latestEditorSeedRef = useRef<JSONContent | string>(usableInitialTiptapDoc || initialHtml);
  const seedPayloadRef = useRef({
    initialHtml,
    initialLatex: initialContent || "",
    initialTiptapDoc: usableInitialTiptapDoc,
    revision: seedRevision,
  });
  const editorRef = useRef<Editor | null>(null);
  const { editorPropsDefault, coreExtensions, extensions, extensionsReady } = useEditorExtensions(
    null,
    documentFeaturesEnabled,
    advancedBlocksEnabled,
  );
  const shouldHoldEditor = (requiresDocumentFeatures && !documentFeaturesEnabled)
    || (requiresAdvancedBlocks && !advancedBlocksEnabled)
    || ((documentFeaturesEnabled || advancedBlocksEnabled) && !extensionsReady);

  if (seedPayloadRef.current.revision !== seedRevision) {
    seedPayloadRef.current = {
      initialHtml,
      initialLatex: initialContent || "",
      initialTiptapDoc: usableInitialTiptapDoc,
      revision: seedRevision,
    };
  }

  useEffect(() => {
    const nextLatex = seedPayloadRef.current.initialLatex;

    latexSourceRef.current = nextLatex;
    latestEditorSeedRef.current = seedPayloadRef.current.initialTiptapDoc || seedPayloadRef.current.initialHtml;
    pendingWysiwygUpdateRef.current = null;
    seedSignatureRef.current = null;
    isEditorComposingRef.current = false;
    setIsEditorComposing(false);
    setLatexSource(nextLatex);
  }, [seedRevision]);

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

  const flushPendingWysiwygUpdate = useCallback(() => {
    const pendingUpdate = pendingWysiwygUpdateRef.current;

    if (!pendingUpdate || syncingFromSource.current || isEditorComposingRef.current) {
      return;
    }

    pendingWysiwygUpdateRef.current = null;
    syncingFromWysiwyg.current = true;

    const latex = exportDocsyToLatex({
      currentLatexSource: latexSourceRef.current,
      html: pendingUpdate.html,
    });

    latexSourceRef.current = latex;
    latestEditorSeedRef.current = pendingUpdate.document;
    setLatexSource((current) => current === latex ? current : latex);
    onContentChange?.(latex);
    onHtmlChange?.(pendingUpdate.html);
    onTiptapChange?.(pendingUpdate.document);

    queueMicrotask(() => {
      syncingFromWysiwyg.current = false;
    });
  }, [onContentChange, onHtmlChange, onTiptapChange]);

  const scheduleWysiwygSync = useCallback(() => {
    if (wysiwygSyncFrame.current !== null) {
      cancelAnimationFrame(wysiwygSyncFrame.current);
    }

    if (isEditorComposingRef.current || syncingFromSource.current) {
      return;
    }

    wysiwygSyncFrame.current = requestAnimationFrame(() => {
      wysiwygSyncFrame.current = null;
      flushPendingWysiwygUpdate();
    });
  }, [flushPendingWysiwygUpdate]);

  const handleWysiwygUpdate = useCallback(
    (html: string, document: JSONContent) => {
      if (syncingFromSource.current) {
        return;
      }

      pendingWysiwygUpdateRef.current = { document, html };
      scheduleWysiwygSync();
    },
    [scheduleWysiwygSync]
  );

  const editorProps = useMemo(() => ({
    ...editorPropsDefault,
    handleDOMEvents: {
      ...editorPropsDefault.handleDOMEvents,
      compositionend: () => {
        isEditorComposingRef.current = false;
        setIsEditorComposing(false);
        scheduleWysiwygSync();
        return false;
      },
      compositionstart: () => {
        isEditorComposingRef.current = true;
        setIsEditorComposing(true);
        return false;
      },
    },
  }), [editorPropsDefault, scheduleWysiwygSync]);

  const commitSourceLatex = useCallback((nextLatex: string) => {
    const html = importLatexToDocsy(nextLatex).html || latexToHtml(nextLatex, { includeMetadata: false });

    latexSourceRef.current = nextLatex;
    latestEditorSeedRef.current = html;
    setLatexSource(nextLatex);
    onContentChange?.(nextLatex);
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
      const currentEditor = editorRef.current;

      if (!currentEditor || syncingFromWysiwyg.current) {
        return;
      }

      if (currentEditor.getHTML() === html) {
        return;
      }

      syncingFromSource.current = true;
      pendingWysiwygUpdateRef.current = null;
      currentEditor.commands.setContent(html, { emitUpdate: false });
      latestEditorSeedRef.current = currentEditor.getJSON();
      onTiptapChange?.(currentEditor.getJSON());
      queueMicrotask(() => {
        syncingFromSource.current = false;
      });
    });
  }, [
    advancedBlocksEnabled,
    documentFeaturesEnabled,
    onContentChange,
    onEnableAdvancedBlocks,
    onEnableDocumentFeatures,
    onHtmlChange,
    onTiptapChange,
  ]);

  const applySourceTabIndent = useCallback((ta: HTMLTextAreaElement, shiftKey: boolean) => {
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    const next = applyMarkdownTabIndent(ta.value, start, end, {
      tabSize: DEFAULT_MARKDOWN_TAB_SIZE,
      shiftKey,
    });

    commitSourceLatex(next.value);

    requestAnimationFrame(() => {
      if (document.activeElement !== ta) {
        ta.focus();
      }
      ta.setSelectionRange(next.selectionStart, next.selectionEnd);
    });
  }, [commitSourceLatex]);

  const editor = useEditor({
    extensions: shouldHoldEditor ? coreExtensions : extensions,
    content: shouldHoldEditor ? "" : latestEditorSeedRef.current,
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
    editorProps,
  }, [advancedBlocksEnabled, documentFeaturesEnabled, extensionsReady, shouldHoldEditor]);

  useEffect(() => {
    editorRef.current = editor;

    return () => {
      editorRef.current = null;
    };
  }, [editor]);

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
      nextContent: latestEditorSeedRef.current,
      onHtmlChange,
      onTiptapChange,
      seedSignatureRef,
    });
  }, [editor, onHtmlChange, onTiptapChange, seedRevision, shouldHoldEditor]);

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
      commitSourceLatex(e.target.value);
    },
    [commitSourceLatex]
  );

  useEffect(() => () => {
    if (sourceSyncFrame.current !== null) {
      cancelAnimationFrame(sourceSyncFrame.current);
      sourceSyncFrame.current = null;
    }
    if (wysiwygSyncFrame.current !== null) {
      cancelAnimationFrame(wysiwygSyncFrame.current);
      wysiwygSyncFrame.current = null;
    }
    pendingWysiwygUpdateRef.current = null;
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

  const showEmptyHelp = Boolean(editor?.isEmpty) && !isEditorComposing;

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
        editorContent={
          <div className="relative h-full">
            {showEmptyHelp ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-4 z-10 text-base text-muted-foreground"
              >
                LaTeX WYSIWYG with synced source pane.
              </div>
            ) : null}
            <EditorContent editor={editor} />
          </div>
        }
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
