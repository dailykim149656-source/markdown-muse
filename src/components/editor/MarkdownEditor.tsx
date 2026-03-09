import type { JSONContent } from "@tiptap/core";
import { EditorContent, type Editor, useEditor } from "@tiptap/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EditorToolbar from "./EditorToolbar";
import { createEditorExtensions, editorPropsDefault } from "./editorConfig";
import { SourcePanel, SplitEditorLayout } from "./SourcePanel";
import { createMarkedInstance, createTurndownService } from "./utils/markdownRoundtrip";
import { DEFAULT_MARKDOWN_TAB_SIZE, applyMarkdownTabIndent } from "./utils/markdownTabIndent";

interface MarkdownEditorProps {
  onContentChange?: (markdown: string) => void;
  onHtmlChange?: (html: string) => void;
  onEditorReady?: (editor: Editor | null) => void;
  initialContent?: string;
  initialTiptapDoc?: JSONContent;
  onTiptapChange?: (document: JSONContent | null) => void;
}

const MarkdownEditor = ({
  onContentChange,
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

  const syncingFromWysiwyg = useRef(false);
  const syncingFromSource = useRef(false);
  const sourceDebounce = useRef<ReturnType<typeof setTimeout>>();

  const turndownService = useMemo(() => createTurndownService(), []);
  const markedInstance = useMemo(() => createMarkedInstance(), []);
  const initialHtml = useMemo(
    () => initialMd ? markedInstance.parse(initialMd, { async: false }) as string : "",
    [initialMd, markedInstance]
  );

  const handleWysiwygUpdate = useCallback(
    (html: string, document: JSONContent) => {
      if (syncingFromSource.current) return;
      syncingFromWysiwyg.current = true;
      const md = turndownService.turndown(html);
      setMdSource(md);
      onContentChange?.(md);
      onHtmlChange?.(html);
      onTiptapChange?.(document);
      queueMicrotask(() => { syncingFromWysiwyg.current = false; });
    },
    [onContentChange, onHtmlChange, onTiptapChange, turndownService]
  );

  const editor = useEditor({
    extensions: createEditorExtensions("Markdown WYSIWYG with synced source mode."),
    content: initialTiptapDoc || initialHtml,
    onUpdate: ({ editor }) => handleWysiwygUpdate(editor.getHTML(), editor.getJSON()),
    editorProps: editorPropsDefault,
  });

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

  const focusSourceTextarea = useCallback(() => {
    const textarea = sourceTextareaRef.current;
    if (!textarea) {
      return;
    }

    requestAnimationFrame(() => {
      textarea.focus();
    });
  }, []);

  const applySourceTabIndent = useCallback((ta: HTMLTextAreaElement, shiftKey: boolean) => {
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    const next = applyMarkdownTabIndent(ta.value, start, end, {
      tabSize: DEFAULT_MARKDOWN_TAB_SIZE,
      shiftKey,
    });

    setMdSource(next.value);

    requestAnimationFrame(() => {
      if (document.activeElement !== ta) {
        ta.focus();
      }
      ta.setSelectionRange(next.selectionStart, next.selectionEnd);
    });
  }, []);

  useEffect(() => {
    if (!showPanel) return;
    focusSourceTextarea();
  }, [focusSourceTextarea, showPanel]);

  const handleSourceChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newMd = e.target.value;
      const html = markedInstance.parse(newMd, { async: false }) as string;
      setMdSource(newMd);
      onContentChange?.(newMd);
      onHtmlChange?.(html);
      if (sourceDebounce.current) clearTimeout(sourceDebounce.current);
      sourceDebounce.current = setTimeout(() => {
        if (!editor || syncingFromWysiwyg.current) return;
        syncingFromSource.current = true;
        editor.commands.setContent(html, { emitUpdate: false });
        onTiptapChange?.(editor.getJSON());
        queueMicrotask(() => { syncingFromSource.current = false; });
      }, 600);
    },
    [editor, onContentChange, onHtmlChange, onTiptapChange, markedInstance]
  );

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

  return (
    <div className="flex flex-col h-full">
      <EditorToolbar editor={editor} />
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
