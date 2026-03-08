import { useEditor, EditorContent } from "@tiptap/react";
import { useState, useCallback, useRef } from "react";
import EditorToolbar from "./EditorToolbar";
import { createEditorExtensions, editorPropsDefault } from "./editorConfig";
import { SourcePanel, SplitEditorLayout } from "./SourcePanel";

interface HtmlEditorProps {
  initialContent?: string;
  onContentChange?: (content: string) => void;
}

const HtmlEditor = ({ initialContent, onContentChange }: HtmlEditorProps) => {
  const [htmlSource, setHtmlSource] = useState(initialContent || "");
  const [showPanel, setShowPanel] = useState(true);
  const [sourceLeft, setSourceLeft] = useState(false);

  const syncingFromWysiwyg = useRef(false);
  const syncingFromSource = useRef(false);
  const sourceDebounce = useRef<ReturnType<typeof setTimeout>>();

  const handleWysiwygUpdate = useCallback(
    (html: string) => {
      if (syncingFromSource.current) return;
      syncingFromWysiwyg.current = true;
      setHtmlSource(html);
      onContentChange?.(html);
      queueMicrotask(() => { syncingFromWysiwyg.current = false; });
    },
    [onContentChange]
  );

  const editor = useEditor({
    extensions: createEditorExtensions("HTML 문서를 WYSIWYG으로 작성하세요..."),
    content: initialContent || "",
    onUpdate: ({ editor }) => handleWysiwygUpdate(editor.getHTML()),
    editorProps: editorPropsDefault,
  });

  const handleSourceChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newHtml = e.target.value;
      setHtmlSource(newHtml);
      onContentChange?.(newHtml);
      if (sourceDebounce.current) clearTimeout(sourceDebounce.current);
      sourceDebounce.current = setTimeout(() => {
        if (!editor || syncingFromWysiwyg.current) return;
        syncingFromSource.current = true;
        editor.commands.setContent(newHtml, { emitUpdate: false });
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
        const newVal = htmlSource.substring(0, start) + "  " + htmlSource.substring(end);
        setHtmlSource(newVal);
        setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 2; }, 0);
      }
    },
    [htmlSource]
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
            label="HTML 소스"
            value={htmlSource}
            onChange={handleSourceChange}
            onKeyDown={handleSourceKeyDown}
            onSwap={() => setSourceLeft(v => !v)}
            onClose={() => setShowPanel(false)}
            placeholder={"<!-- WYSIWYG 편집기에 내용을 입력하면\n     HTML 소스가 여기에 표시됩니다. -->"}
          />
        }
      />
    </div>
  );
};

export default HtmlEditor;
