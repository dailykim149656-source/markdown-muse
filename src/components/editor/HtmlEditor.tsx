import type { JSONContent } from "@tiptap/core";
import { EditorContent, type Editor, useEditor } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { DEFAULT_MARKDOWN_TAB_SIZE, applyMarkdownTabIndent } from "./utils/markdownTabIndent";
import { isUsableTiptapDocument } from "@/lib/ast/tiptapUsability";

interface HtmlEditorProps {
  advancedBlocksEnabled?: boolean;
  canEnableAdvancedBlocks?: boolean;
  canEnableDocumentFeatures?: boolean;
  documentFeaturesEnabled?: boolean;
  initialContent?: string;
  initialTiptapDoc?: JSONContent;
  onContentChange?: (content: string) => void;
  onEnableAdvancedBlocks?: () => void;
  onEnableDocumentFeatures?: () => void;
  onHtmlChange?: (html: string) => void;
  onEditorReady?: (editor: Editor | null) => void;
  onTiptapChange?: (document: JSONContent | null) => void;
  seedRevision?: string;
}

const HtmlEditor = ({
  advancedBlocksEnabled = false,
  canEnableAdvancedBlocks = false,
  canEnableDocumentFeatures = false,
  documentFeaturesEnabled = false,
  initialContent,
  initialTiptapDoc,
  onContentChange,
  onEnableAdvancedBlocks,
  onEnableDocumentFeatures,
  onHtmlChange,
  onEditorReady,
  onTiptapChange,
  seedRevision = "default",
}: HtmlEditorProps) => {
  const initialHtml = initialContent || "";
  const requiresDocumentFeatures = tiptapDocumentHasDocumentContent(initialTiptapDoc) || htmlHasDocumentContent(initialHtml);
  const requiresAdvancedBlocks = tiptapDocumentHasAdvancedContent(initialTiptapDoc) || htmlHasAdvancedContent(initialHtml);
  const [htmlSource, setHtmlSource] = useState(initialHtml);
  const [showPanel, setShowPanel] = useState(true);
  const [sourceLeft, setSourceLeft] = useState(false);

  const syncingFromSource = useRef(false);
  const syncingFromWysiwyg = useRef(false);
  const sourceSyncFrame = useRef<number | null>(null);
  const seedSignatureRef = useRef<string | null>(null);
  const sourcePanelRef = useRef<HTMLDivElement | null>(null);
  const sourceTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const usableInitialTiptapDoc = isUsableTiptapDocument(initialTiptapDoc) ? initialTiptapDoc : undefined;
  const latestEditorSeedRef = useRef<JSONContent | string>(usableInitialTiptapDoc || initialHtml);
  const seedPayloadRef = useRef({
    initialHtml,
    initialTiptapDoc: usableInitialTiptapDoc,
    revision: seedRevision,
  });
  const { editorPropsDefault, coreExtensions, extensions, extensionsReady } = useEditorExtensions(
    "HTML WYSIWYG editor with synced source.",
    documentFeaturesEnabled,
    advancedBlocksEnabled,
  );
  const shouldHoldEditor = (requiresDocumentFeatures && !documentFeaturesEnabled)
    || (requiresAdvancedBlocks && !advancedBlocksEnabled)
    || ((documentFeaturesEnabled || advancedBlocksEnabled) && !extensionsReady);

  if (seedPayloadRef.current.revision !== seedRevision) {
    seedPayloadRef.current = {
      initialHtml,
      initialTiptapDoc: usableInitialTiptapDoc,
      revision: seedRevision,
    };
  }

  useEffect(() => {
    latestEditorSeedRef.current = seedPayloadRef.current.initialTiptapDoc || seedPayloadRef.current.initialHtml;
    seedSignatureRef.current = null;
    setHtmlSource(seedPayloadRef.current.initialHtml);
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

  const handleWysiwygUpdate = useCallback(
    (html: string, document: JSONContent) => {
      if (syncingFromSource.current) return;
      syncingFromWysiwyg.current = true;
      latestEditorSeedRef.current = document;
      setHtmlSource(html);
      onContentChange?.(html);
      onHtmlChange?.(html);
      onTiptapChange?.(document);
      queueMicrotask(() => { syncingFromWysiwyg.current = false; });
    },
    [onContentChange, onHtmlChange, onTiptapChange]
  );

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
    editorProps: editorPropsDefault,
  }, [advancedBlocksEnabled, documentFeaturesEnabled, extensionsReady, shouldHoldEditor]);

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

  const applySourceTabIndent = useCallback((ta: HTMLTextAreaElement, shiftKey: boolean) => {
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    const next = applyMarkdownTabIndent(ta.value, start, end, {
      tabSize: DEFAULT_MARKDOWN_TAB_SIZE,
      shiftKey,
    });

    setHtmlSource(next.value);

    requestAnimationFrame(() => {
      if (document.activeElement !== ta) {
        ta.focus();
      }
      ta.setSelectionRange(next.selectionStart, next.selectionEnd);
    });
  }, []);

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
      const newHtml = e.target.value;
      latestEditorSeedRef.current = newHtml;
      setHtmlSource(newHtml);
      onContentChange?.(newHtml);
      onHtmlChange?.(newHtml);
      if (!documentFeaturesEnabled && htmlHasDocumentContent(newHtml)) {
        onEnableDocumentFeatures?.();
        return;
      }
      if (!advancedBlocksEnabled && htmlHasAdvancedContent(newHtml)) {
        onEnableAdvancedBlocks?.();
        return;
      }

      if (sourceSyncFrame.current !== null) {
        cancelAnimationFrame(sourceSyncFrame.current);
      }

      sourceSyncFrame.current = requestAnimationFrame(() => {
        sourceSyncFrame.current = null;
        if (!editor || syncingFromWysiwyg.current) return;
        if (editor.getHTML() === newHtml) return;
        syncingFromSource.current = true;
        editor.commands.setContent(newHtml, { emitUpdate: false });
        latestEditorSeedRef.current = editor.getJSON();
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
            rootRef={sourcePanelRef}
            label="HTML Source"
            textareaRef={sourceTextareaRef}
            value={htmlSource}
            onChange={handleSourceChange}
            onKeyDown={handleSourceKeyDown}
            onKeyDownCapture={handleSourceKeyDown}
            onPanelKeyDownCapture={handleSourcePanelKeyDownCapture}
            onSwap={() => setSourceLeft(v => !v)}
            onClose={() => setShowPanel(false)}
            placeholder="Edit raw HTML source. Use tab for indentation and Shift+Tab to outdent."
          />
        }
      />
    </div>
  );
};

export default HtmlEditor;
