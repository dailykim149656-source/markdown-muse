import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { useState, useCallback, useRef, useEffect } from "react";
import EditorToolbar from "./EditorToolbar";
import { createEditorExtensions, editorPropsDefault } from "./editorConfig";
import { SourcePanel, SplitEditorLayout } from "./SourcePanel";

interface HtmlEditorProps {
  initialContent?: string;
  onContentChange?: (content: string) => void;
  onHtmlChange?: (html: string) => void;
  onEditorReady?: (editor: Editor | null) => void;
}

const HtmlEditor = ({ initialContent, onContentChange, onHtmlChange, onEditorReady }: HtmlEditorProps) => {
  const initialHtml = initialContent || "";
  const [htmlSource, setHtmlSource] = useState(initialHtml);
  const [showPanel, setShowPanel] = useState(true);
  const [sourceLeft, setSourceLeft] = useState(false);

  const syncingFromWysiwyg = useRef(false);
  const syncingFromSource = useRef(false);
  const sourceDebounce = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    onHtmlChange?.(initialHtml);
  }, [initialHtml, onHtmlChange]);

  const handleWysiwygUpdate = useCallback(
    (html: string) => {
      if (syncingFromSource.current) return;
      syncingFromWysiwyg.current = true;
      setHtmlSource(html);
      onContentChange?.(html);
      onHtmlChange?.(html);
      queueMicrotask(() => { syncingFromWysiwyg.current = false; });
    },
    [onContentChange, onHtmlChange]
  );

  const editor = useEditor({
    extensions: createEditorExtensions("HTML 문서를 WYSIWYG으로 작성하세요..."),
    content: initialContent || "",
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
      const newHtml = e.target.value;
      setHtmlSource(newHtml);
      onContentChange?.(newHtml);
      onHtmlChange?.(newHtml);
      if (sourceDebounce.current) clearTimeout(sourceDebounce.current);
      sourceDebounce.current = setTimeout(() => {
        if (!editor || syncingFromWysiwyg.current) return;
        syncingFromSource.current = true;
        editor.commands.setContent(newHtml, { emitUpdate: false });
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
