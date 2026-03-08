import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import EditorToolbar from "./EditorToolbar";
import { createEditorExtensions, editorPropsDefault } from "./editorConfig";
import { SourcePanel, SplitEditorLayout } from "./SourcePanel";
import { createTurndownService, createMarkedInstance } from "./utils/markdownRoundtrip";

interface MarkdownEditorProps {
  onContentChange?: (markdown: string) => void;
  onHtmlChange?: (html: string) => void;
  onEditorReady?: (editor: Editor | null) => void;
  initialContent?: string;
}

const MarkdownEditor = ({ onContentChange, onHtmlChange, onEditorReady, initialContent }: MarkdownEditorProps) => {
  const initialMd = initialContent || "";
  const [mdSource, setMdSource] = useState(initialMd);
  const [showPanel, setShowPanel] = useState(false);
  const [sourceLeft, setSourceLeft] = useState(false);

  const syncingFromWysiwyg = useRef(false);
  const syncingFromSource = useRef(false);
  const sourceDebounce = useRef<ReturnType<typeof setTimeout>>();

  const turndownService = useMemo(() => createTurndownService(), []);
  const markedInstance = useMemo(() => createMarkedInstance(), []);
  const initialHtml = useMemo(
    () => initialMd ? markedInstance.parse(initialMd, { async: false }) as string : "",
    [initialMd, markedInstance]
  );

  useEffect(() => {
    onHtmlChange?.(initialHtml);
  }, [initialHtml, onHtmlChange]);

  const handleWysiwygUpdate = useCallback(
    (html: string) => {
      if (syncingFromSource.current) return;
      syncingFromWysiwyg.current = true;
      const md = turndownService.turndown(html);
      setMdSource(md);
      onContentChange?.(md);
      onHtmlChange?.(html);
      queueMicrotask(() => { syncingFromWysiwyg.current = false; });
    },
    [onContentChange, onHtmlChange, turndownService]
  );

  const editor = useEditor({
    extensions: createEditorExtensions("여기에 글을 작성하세요..."),
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
        queueMicrotask(() => { syncingFromSource.current = false; });
      }, 600);
    },
    [editor, onContentChange, onHtmlChange, markedInstance]
  );

  const handleSourceKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const ta = e.currentTarget;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const newVal = mdSource.substring(0, start) + "  " + mdSource.substring(end);
        setMdSource(newVal);
        setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 2; }, 0);
      }
    },
    [mdSource]
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
            label="Markdown 소스"
            value={mdSource}
            onChange={handleSourceChange}
            onKeyDown={handleSourceKeyDown}
            onSwap={() => setSourceLeft(v => !v)}
            onClose={() => setShowPanel(false)}
            placeholder="WYSIWYG 편집기에 내용을 입력하면&#10;Markdown 소스가 여기에 표시됩니다."
          />
        }
      />
    </div>
  );
};

export default MarkdownEditor;
