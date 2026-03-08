import { useEditor, EditorContent } from "@tiptap/react";
import { useState, useCallback, useRef } from "react";
import EditorToolbar from "./EditorToolbar";
import { createEditorExtensions, editorPropsDefault } from "./editorConfig";
import { SourcePanel, SplitEditorLayout } from "./SourcePanel";
import TurndownService from "turndown";
import { marked } from "marked";

const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

interface MarkdownEditorProps {
  onContentChange?: (markdown: string) => void;
  initialContent?: string;
}

const MarkdownEditor = ({ onContentChange, initialContent }: MarkdownEditorProps) => {
  const initialMd = initialContent || "";
  const [mdSource, setMdSource] = useState(initialMd);
  const [showPanel, setShowPanel] = useState(false);
  const [sourceLeft, setSourceLeft] = useState(false);

  const syncingFromWysiwyg = useRef(false);
  const syncingFromSource = useRef(false);
  const sourceDebounce = useRef<ReturnType<typeof setTimeout>>();

  const handleWysiwygUpdate = useCallback(
    (html: string) => {
      if (syncingFromSource.current) return;
      syncingFromWysiwyg.current = true;
      const md = turndownService.turndown(html);
      setMdSource(md);
      onContentChange?.(md);
      queueMicrotask(() => { syncingFromWysiwyg.current = false; });
    },
    [onContentChange]
  );

  const editor = useEditor({
    extensions: createEditorExtensions("여기에 글을 작성하세요..."),
    content: initialMd ? marked.parse(initialMd, { async: false }) as string : "",
    onUpdate: ({ editor }) => handleWysiwygUpdate(editor.getHTML()),
    editorProps: editorPropsDefault,
  });

  const handleSourceChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newMd = e.target.value;
      setMdSource(newMd);
      onContentChange?.(newMd);
      if (sourceDebounce.current) clearTimeout(sourceDebounce.current);
      sourceDebounce.current = setTimeout(() => {
        if (!editor || syncingFromWysiwyg.current) return;
        syncingFromSource.current = true;
        const html = marked.parse(newMd, { async: false }) as string;
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
