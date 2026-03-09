import type { JSONContent } from "@tiptap/core";
import { EditorContent, type Editor, useEditor } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import EditorToolbar from "./EditorToolbar";
import { createEditorExtensions, editorPropsDefault } from "./editorConfig";
import { SourcePanel, SplitEditorLayout } from "./SourcePanel";
import { DEFAULT_MARKDOWN_TAB_SIZE, applyMarkdownTabIndent } from "./utils/markdownTabIndent";

interface HtmlEditorProps {
  initialContent?: string;
  initialTiptapDoc?: JSONContent;
  onContentChange?: (content: string) => void;
  onHtmlChange?: (html: string) => void;
  onEditorReady?: (editor: Editor | null) => void;
  onTiptapChange?: (document: JSONContent | null) => void;
}

const HtmlEditor = ({
  initialContent,
  initialTiptapDoc,
  onContentChange,
  onHtmlChange,
  onEditorReady,
  onTiptapChange,
}: HtmlEditorProps) => {
  const initialHtml = initialContent || "";
  const [htmlSource, setHtmlSource] = useState(initialHtml);
  const [showPanel, setShowPanel] = useState(true);
  const [sourceLeft, setSourceLeft] = useState(false);

  const syncingFromSource = useRef(false);
  const syncingFromWysiwyg = useRef(false);
  const sourceDebounce = useRef<ReturnType<typeof setTimeout>>();
  const sourcePanelRef = useRef<HTMLDivElement | null>(null);
  const sourceTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleWysiwygUpdate = useCallback(
    (html: string, document: JSONContent) => {
      if (syncingFromSource.current) return;
      syncingFromWysiwyg.current = true;
      setHtmlSource(html);
      onContentChange?.(html);
      onHtmlChange?.(html);
      onTiptapChange?.(document);
      queueMicrotask(() => { syncingFromWysiwyg.current = false; });
    },
    [onContentChange, onHtmlChange, onTiptapChange]
  );

  const editor = useEditor({
    extensions: createEditorExtensions("HTML WYSIWYG editor with synced source."),
    content: initialTiptapDoc || initialHtml,
    onUpdate: ({ editor }) => handleWysiwygUpdate(editor.getHTML(), editor.getJSON()),
    editorProps: editorPropsDefault,
  });

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
      setHtmlSource(newHtml);
      onContentChange?.(newHtml);
      onHtmlChange?.(newHtml);
      if (sourceDebounce.current) clearTimeout(sourceDebounce.current);
      sourceDebounce.current = setTimeout(() => {
        if (!editor || syncingFromWysiwyg.current) return;
        syncingFromSource.current = true;
        editor.commands.setContent(newHtml, { emitUpdate: false });
        onTiptapChange?.(editor.getJSON());
        queueMicrotask(() => { syncingFromSource.current = false; });
      }, 600);
    },
    [editor, onContentChange, onHtmlChange, onTiptapChange]
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
