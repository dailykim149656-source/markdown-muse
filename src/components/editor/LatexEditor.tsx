import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import EditorToolbar from "./EditorToolbar";
import { createEditorExtensions, editorPropsDefault } from "./editorConfig";
import { htmlToLatex, latexToHtml } from "./utils/htmlToLatex";
import { SourcePanel, SplitEditorLayout } from "./SourcePanel";
import LatexHighlightEditor from "./LatexHighlightEditor";

interface LatexEditorProps {
  initialContent?: string;
  onContentChange?: (content: string) => void;
  onHtmlChange?: (html: string) => void;
  onEditorReady?: (editor: Editor | null) => void;
}

const LatexEditor = ({ initialContent, onContentChange, onHtmlChange, onEditorReady }: LatexEditorProps) => {
  const [latexSource, setLatexSource] = useState(initialContent || "");
  const [showPanel, setShowPanel] = useState(true);
  const [sourceLeft, setSourceLeft] = useState(false);

  const syncingFromWysiwyg = useRef(false);
  const syncingFromSource = useRef(false);
  const sourceDebounce = useRef<ReturnType<typeof setTimeout>>();
  const initialHtml = useMemo(() => initialContent ? latexToHtml(initialContent) : "", [initialContent]);

  useEffect(() => {
    onHtmlChange?.(initialHtml);
  }, [initialHtml, onHtmlChange]);

  const handleWysiwygUpdate = useCallback(
    (html: string) => {
      if (syncingFromSource.current) return;
      syncingFromWysiwyg.current = true;
      const latex = htmlToLatex(html);
      setLatexSource(latex);
      onContentChange?.(latex);
      onHtmlChange?.(html);
      queueMicrotask(() => { syncingFromWysiwyg.current = false; });
    },
    [onContentChange, onHtmlChange]
  );

  const editor = useEditor({
    extensions: createEditorExtensions("LaTeX 문서를 WYSIWYG으로 작성하세요..."),
    content: initialHtml,
    onUpdate: ({ editor }) => handleWysiwygUpdate(editor.getHTML()),
    editorProps: editorPropsDefault,
  });

  useEffect(() => {
    onEditorReady?.(editor);

    return () => {
      onEditorReady?.(null);
    };
  }, [editor, onEditorReady]);

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
        queueMicrotask(() => { syncingFromSource.current = false; });
      }, 600);
    },
    [editor, onContentChange, onHtmlChange]
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
            placeholder="// WYSIWYG 편집기에 내용을 입력하면&#10;// LaTeX 소스가 여기에 표시됩니다."
          >
            <LatexHighlightEditor
              value={latexSource}
              onChange={handleSourceChange}
              onKeyDown={handleSourceKeyDown}
              placeholder="// WYSIWYG 편집기에 내용을 입력하면&#10;// LaTeX 소스가 여기에 표시됩니다."
            />
          </SourcePanel>
        }
      />
    </div>
  );
};

export default LatexEditor;
