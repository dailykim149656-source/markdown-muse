import type { JSONContent } from "@tiptap/core";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { useState, useCallback, useRef, useEffect } from "react";
import EditorToolbar from "./EditorToolbar";
import { createEditorExtensions, editorPropsDefault } from "./editorConfig";
import { SourcePanel, SplitEditorLayout } from "./SourcePanel";

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

  const syncingFromWysiwyg = useRef(false);
  const syncingFromSource = useRef(false);
  const sourceDebounce = useRef<ReturnType<typeof setTimeout>>();

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
    extensions: createEditorExtensions("HTML 문서에서 WYSIWYG로 전환해 편집할 수 있습니다."),
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
            placeholder={"<!-- WYSIWYG에서 작성한 내용은 HTML 소스와 동기화됩니다.\n     HTML 소스가 필요하면 이곳에 입력하세요. -->"}
          />
        }
      />
    </div>
  );
};

export default HtmlEditor;
