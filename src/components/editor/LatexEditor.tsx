import type { JSONContent } from "@tiptap/core";
import { EditorContent, type Editor, useEditor } from "@tiptap/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EditorToolbar from "./EditorToolbar";
import { createEditorExtensions, editorPropsDefault } from "./editorConfig";
import { DEFAULT_MARKDOWN_TAB_SIZE, applyMarkdownTabIndent } from "./utils/markdownTabIndent";
import { htmlToLatex, latexToHtml } from "./utils/htmlToLatex";
import { SourcePanel, SplitEditorLayout } from "./SourcePanel";
import LatexHighlightEditor from "./LatexHighlightEditor";

interface LatexEditorProps {
  initialContent?: string;
  initialTiptapDoc?: JSONContent;
  onContentChange?: (content: string) => void;
  onHtmlChange?: (html: string) => void;
  onEditorReady?: (editor: Editor | null) => void;
  onTiptapChange?: (document: JSONContent | null) => void;
}

const LatexEditor = ({
  initialContent,
  initialTiptapDoc,
  onContentChange,
  onHtmlChange,
  onEditorReady,
  onTiptapChange,
}: LatexEditorProps) => {
  const [latexSource, setLatexSource] = useState(initialContent || "");
  const [showPanel, setShowPanel] = useState(true);
  const [sourceLeft, setSourceLeft] = useState(false);

  const syncingFromSource = useRef(false);
  const syncingFromWysiwyg = useRef(false);
  const sourceDebounce = useRef<ReturnType<typeof setTimeout>>();
  const initialHtml = useMemo(() => initialContent ? latexToHtml(initialContent, { includeMetadata: false }) : "", [initialContent]);
  const sourcePanelRef = useRef<HTMLDivElement | null>(null);
  const sourceTextareaRef = useRef<HTMLTextAreaElement | null>(null);

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
      const latex = htmlToLatex(html, true, { includeMetadata: false });
      setLatexSource(latex);
      onContentChange?.(latex);
      onHtmlChange?.(html);
      onTiptapChange?.(document);
      queueMicrotask(() => { syncingFromWysiwyg.current = false; });
    },
    [onContentChange, onHtmlChange, onTiptapChange]
  );

  const editor = useEditor({
    extensions: createEditorExtensions("LaTeX WYSIWYG with synced source pane."),
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

  const handleSourceChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newLatex = e.target.value;
      const html = latexToHtml(newLatex, { includeMetadata: false });
      setLatexSource(newLatex);
      onContentChange?.(newLatex);
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
            label="LaTeX Source"
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
