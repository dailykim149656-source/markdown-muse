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
import { SourcePanel, SplitEditorLayout } from "./SourcePanel";
import { createMarkedInstance, createTurndownService } from "./utils/markdownRoundtrip";
import { DEFAULT_MARKDOWN_TAB_SIZE, applyMarkdownTabIndent } from "./utils/markdownTabIndent";
import { isUsableTiptapDocument } from "@/lib/ast/tiptapUsability";

interface MarkdownEditorProps {
  advancedBlocksEnabled?: boolean;
  canEnableAdvancedBlocks?: boolean;
  canEnableDocumentFeatures?: boolean;
  documentFeaturesEnabled?: boolean;
  onContentChange?: (markdown: string) => void;
  onEnableAdvancedBlocks?: () => void;
  onEnableDocumentFeatures?: () => void;
  onHtmlChange?: (html: string) => void;
  onEditorReady?: (editor: Editor | null) => void;
  initialContent?: string;
  initialTiptapDoc?: JSONContent;
  onTiptapChange?: (document: JSONContent | null) => void;
}

const MarkdownEditor = ({
  advancedBlocksEnabled = false,
  canEnableAdvancedBlocks = false,
  canEnableDocumentFeatures = false,
  documentFeaturesEnabled = false,
  onContentChange,
  onEnableAdvancedBlocks,
  onEnableDocumentFeatures,
  onHtmlChange,
  onEditorReady,
  initialContent,
  initialTiptapDoc,
  onTiptapChange,
}: MarkdownEditorProps) => {
  const initialMd = initialContent || "";
  const [mdSource, setMdSource] = useState(initialMd);
  const [showPanel, setShowPanel] = useState(false);
  const [sourceLeft, setSourceLeft] = useState(false);
  const sourceTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const sourcePanelRef = useRef<HTMLDivElement | null>(null);
  const pendingSourceSyncHtmlRef = useRef<string | null>(null);

  const syncingFromWysiwyg = useRef(false);
  const syncingFromSource = useRef(false);
  const sourceSyncFrame = useRef<number | null>(null);
  const seedSignatureRef = useRef<string | null>(null);
  const [sourceSyncRevision, setSourceSyncRevision] = useState(0);

  const turndownService = useMemo(() => createTurndownService(), []);
  const markedInstance = useMemo(() => createMarkedInstance(), []);
  const initialHtml = useMemo(
    () => initialMd ? markedInstance.parse(initialMd, { async: false }) as string : "",
    [initialMd, markedInstance]
  );
  const usableInitialTiptapDoc = useMemo(
    () => isUsableTiptapDocument(initialTiptapDoc) ? initialTiptapDoc : undefined,
    [initialTiptapDoc],
  );
  const requiresDocumentFeatures = useMemo(
    () => tiptapDocumentHasDocumentContent(initialTiptapDoc) || htmlHasDocumentContent(initialHtml),
    [initialHtml, initialTiptapDoc],
  );
  const requiresAdvancedBlocks = useMemo(
    () => tiptapDocumentHasAdvancedContent(initialTiptapDoc) || htmlHasAdvancedContent(initialHtml),
    [initialHtml, initialTiptapDoc],
  );
  const { editorPropsDefault, coreExtensions, extensions, extensionsReady } = useEditorExtensions(
    "Markdown WYSIWYG with synced source mode.",
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

  const handleWysiwygUpdate = useCallback(
    (html: string, document: JSONContent) => {
      if (shouldHoldEditor || syncingFromSource.current) return;
      syncingFromWysiwyg.current = true;
      const md = turndownService.turndown(html);
      setMdSource(md);
      onContentChange?.(md);
      onHtmlChange?.(html);
      onTiptapChange?.(document);
      queueMicrotask(() => { syncingFromWysiwyg.current = false; });
    },
    [onContentChange, onHtmlChange, onTiptapChange, shouldHoldEditor, turndownService]
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
    const nextMarkdown = initialContent || "";

    setMdSource((current) => current === nextMarkdown ? current : nextMarkdown);
  }, [initialContent]);

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

    if (editor && !shouldHoldEditor) {
      onHtmlChange?.(editor.getHTML());
      onTiptapChange?.(editor.getJSON());
    }

    return () => {
      onEditorReady?.(null);
    };
  }, [editor, onEditorReady, onHtmlChange, onTiptapChange, shouldHoldEditor]);

  const focusSourceTextarea = useCallback(() => {
    const textarea = sourceTextareaRef.current;
    if (!textarea) {
      return;
    }

    requestAnimationFrame(() => {
      textarea.focus();
    });
  }, []);

  const commitSourceMarkdown = useCallback((nextMarkdown: string) => {
    const html = markedInstance.parse(nextMarkdown, { async: false }) as string;

    setMdSource(nextMarkdown);
    onContentChange?.(nextMarkdown);
    onHtmlChange?.(html);

    pendingSourceSyncHtmlRef.current = html;
    setSourceSyncRevision((current) => current + 1);

    if (!documentFeaturesEnabled && htmlHasDocumentContent(html)) {
      onEnableDocumentFeatures?.();
      return;
    }

    if (!advancedBlocksEnabled && htmlHasAdvancedContent(html)) {
      onEnableAdvancedBlocks?.();
    }
  }, [
    advancedBlocksEnabled,
    documentFeaturesEnabled,
    markedInstance,
    onContentChange,
    onEnableAdvancedBlocks,
    onEnableDocumentFeatures,
    onHtmlChange,
  ]);

  const applySourceTabIndent = useCallback((ta: HTMLTextAreaElement, shiftKey: boolean) => {
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    const next = applyMarkdownTabIndent(ta.value, start, end, {
      tabSize: DEFAULT_MARKDOWN_TAB_SIZE,
      shiftKey,
    });

    commitSourceMarkdown(next.value);

    requestAnimationFrame(() => {
      if (document.activeElement !== ta) {
        ta.focus();
      }
      ta.setSelectionRange(next.selectionStart, next.selectionEnd);
    });
  }, [commitSourceMarkdown]);

  useEffect(() => {
    if (!showPanel) return;
    focusSourceTextarea();
  }, [focusSourceTextarea, showPanel]);

  const handleSourceChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      commitSourceMarkdown(e.target.value);
    },
    [commitSourceMarkdown]
  );

  useEffect(() => {
    if (sourceSyncFrame.current !== null) {
      cancelAnimationFrame(sourceSyncFrame.current);
    }

    if (!editor || shouldHoldEditor || syncingFromWysiwyg.current || !pendingSourceSyncHtmlRef.current) {
      return;
    }

    sourceSyncFrame.current = requestAnimationFrame(() => {
      sourceSyncFrame.current = null;
      const nextHtml = pendingSourceSyncHtmlRef.current;

      if (!editor || syncingFromWysiwyg.current || !nextHtml) {
        return;
      }

      if (editor.getHTML() === nextHtml) {
        pendingSourceSyncHtmlRef.current = null;
        return;
      }

      syncingFromSource.current = true;
      pendingSourceSyncHtmlRef.current = null;
      editor.commands.setContent(nextHtml, { emitUpdate: false });
      onTiptapChange?.(editor.getJSON());
      queueMicrotask(() => {
        syncingFromSource.current = false;
      });
    });

    return () => {
      if (sourceSyncFrame.current !== null) {
        cancelAnimationFrame(sourceSyncFrame.current);
        sourceSyncFrame.current = null;
      }
    };
  }, [editor, onTiptapChange, shouldHoldEditor, sourceSyncRevision]);

  useEffect(() => () => {
    if (sourceSyncFrame.current !== null) {
      cancelAnimationFrame(sourceSyncFrame.current);
      sourceSyncFrame.current = null;
    }
    pendingSourceSyncHtmlRef.current = null;
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

  useEffect(() => {
    if (!showPanel) {
      return;
    }

    focusSourceTextarea();
  }, [focusSourceTextarea, showPanel]);

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
            label="Markdown Source"
            rootRef={sourcePanelRef}
            value={mdSource}
            onChange={handleSourceChange}
            onKeyDown={handleSourceKeyDown}
            onKeyDownCapture={handleSourceKeyDown}
            onPanelKeyDownCapture={handleSourcePanelKeyDownCapture}
            onSwap={() => setSourceLeft(v => !v)}
            onClose={() => setShowPanel(false)}
            textareaRef={sourceTextareaRef}
            placeholder="Write raw Markdown source here.\nChanges are synchronized with WYSIWYG and preview."
          />
        }
      />
    </div>
  );
};

export default MarkdownEditor;
