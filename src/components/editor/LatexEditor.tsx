import { useEditor, EditorContent } from "@tiptap/react";
import { useState, useCallback, useRef } from "react";
import EditorToolbar from "./EditorToolbar";
import { createEditorExtensions, editorPropsDefault } from "./editorConfig";
import { htmlToLatex, latexToHtml } from "./utils/htmlToLatex";
import { SourcePanel, SplitEditorLayout } from "./SourcePanel";
import LatexHighlightEditor from "./LatexHighlightEditor";

interface LatexEditorProps {
  initialContent?: string;
  onContentChange?: (content: string) => void;
}

const LatexEditor = ({ initialContent, onContentChange }: LatexEditorProps) => {
  const [latexSource, setLatexSource] = useState(initialContent || "");
  const [showPanel, setShowPanel] = useState(true);
  const [sourceLeft, setSourceLeft] = useState(false);

  const syncingFromWysiwyg = useRef(false);
  const syncingFromSource = useRef(false);
  const sourceDebounce = useRef<ReturnType<typeof setTimeout>>();

  const handleWysiwygUpdate = useCallback(
    (html: string) => {
      if (syncingFromSource.current) return;
      syncingFromWysiwyg.current = true;
      const latex = htmlToLatex(html);
      setLatexSource(latex);
      onContentChange?.(latex);
      queueMicrotask(() => { syncingFromWysiwyg.current = false; });
    },
    [onContentChange]
  );

  const editor = useEditor({
    extensions: createEditorExtensions("LaTeX 문서를 WYSIWYG으로 작성하세요..."),
    content: initialContent ? latexToHtml(initialContent) : "",
    onUpdate: ({ editor }) => handleWysiwygUpdate(editor.getHTML()),
    editorProps: editorPropsDefault,
  });

  const handleSourceChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newLatex = e.target.value;
      setLatexSource(newLatex);
      onContentChange?.(newLatex);
      if (sourceDebounce.current) clearTimeout(sourceDebounce.current);
      sourceDebounce.current = setTimeout(() => {
        if (!editor || syncingFromWysiwyg.current) return;
        syncingFromSource.current = true;
        const html = latexToHtml(newLatex);
        editor.commands.setContent(html, { emitUpdate: false });
        queueMicrotask(() => { syncingFromSource.current = false; });
      }, 600);
    },
    [editor, onContentChange]
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
