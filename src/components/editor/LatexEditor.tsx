import type { JSONContent } from "@tiptap/core";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import EditorToolbar from "./EditorToolbar";
import { createEditorExtensions, editorPropsDefault } from "./editorConfig";
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

  const syncingFromWysiwyg = useRef(false);
  const syncingFromSource = useRef(false);
  const sourceDebounce = useRef<ReturnType<typeof setTimeout>>();
  const initialHtml = useMemo(() => initialContent ? latexToHtml(initialContent) : "", [initialContent]);

  const handleWysiwygUpdate = useCallback(
    (html: string, document: JSONContent) => {
      if (syncingFromSource.current) return;
      syncingFromWysiwyg.current = true;
      const latex = htmlToLatex(html);
      setLatexSource(latex);
      onContentChange?.(latex);
      onHtmlChange?.(html);
      onTiptapChange?.(document);
      queueMicrotask(() => { syncingFromWysiwyg.current = false; });
    },
    [onContentChange, onHtmlChange, onTiptapChange]
  );

  const editor = useEditor({
    extensions: createEditorExtensions("LaTeX 문서에서 WYSIWYG로 전환해 편집할 수 있습니다."),
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
      const html = latexToHtml(newLatex);
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
      if (e.key === "Tab") {
        e.preventDefault();
        const ta = e.currentTarget;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const newVal = latexSource.substring(0, start) + "  " + latexSource.substring(end);
        setLatexSource(newVal);
        setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 2; }, 0);
      }
    },
    [latexSource]
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
            label="LaTeX 소스"
            value={latexSource}
            onChange={handleSourceChange}
            onKeyDown={handleSourceKeyDown}
            onSwap={() => setSourceLeft(v => !v)}
            onClose={() => setShowPanel(false)}
            placeholder="// WYSIWYG에서 작성한 내용은 LaTeX 소스와 동기화됩니다.&#10;// LaTeX 소스를 직접 편집하려면 이곳에 입력하세요."
          >
            <LatexHighlightEditor
              value={latexSource}
              onChange={handleSourceChange}
              onKeyDown={handleSourceKeyDown}
              placeholder="// WYSIWYG에서 작성한 내용은 LaTeX 소스와 동기화됩니다.&#10;// LaTeX 소스를 직접 편집하려면 이곳에 입력하세요."
            />
          </SourcePanel>
        }
      />
    </div>
  );
};

export default LatexEditor;
