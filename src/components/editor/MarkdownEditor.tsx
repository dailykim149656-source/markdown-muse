import { useEditor, EditorContent } from "@tiptap/react";
import { useState, useCallback, useRef } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import EditorToolbar from "./EditorToolbar";
import { createEditorExtensions, editorPropsDefault } from "./editorConfig";
import { Code2, PanelRightClose, PanelRightOpen, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import TurndownService from "turndown";
import { marked } from "marked";

const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

const MarkdownSourcePanel = ({ source, onSourceChange, onKeyDown, setSourceLeft, setShowPanel }: {
  source: string;
  onSourceChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  setSourceLeft: (fn: (v: boolean) => boolean) => void;
  setShowPanel: (v: boolean) => void;
}) => (
  <div className="h-full flex flex-col bg-background">
    <div className="h-8 flex items-center justify-between px-3 bg-secondary/50 border-b border-border shrink-0">
      <div className="flex items-center gap-1.5">
        <Code2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Markdown 소스</span>
        <span className="text-[10px] text-muted-foreground/60 ml-1">양방향 동기화</span>
      </div>
      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSourceLeft((v) => !v)} title="패널 위치 전환">
          <ArrowLeftRight className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowPanel(false)}>
          <PanelRightClose className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
    <textarea
      value={source}
      onChange={onSourceChange}
      onKeyDown={onKeyDown}
      spellCheck={false}
      className="flex-1 w-full bg-background text-foreground font-mono text-xs p-4 resize-none outline-none leading-relaxed"
      placeholder={"WYSIWYG 편집기에 내용을 입력하면\nMarkdown 소스가 여기에 표시됩니다."}
    />
  </div>
);

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

  const panelProps = { source: mdSource, onSourceChange: handleSourceChange, onKeyDown: handleSourceKeyDown, setSourceLeft, setShowPanel };

  return (
    <div className="flex flex-col h-full">
      <EditorToolbar editor={editor} />
      {showPanel ? (
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {sourceLeft ? (
            <>
              <ResizablePanel defaultSize={40} minSize={20} maxSize={70}>
                <MarkdownSourcePanel {...panelProps} />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={60} minSize={20}>
                <div className="h-full overflow-y-auto tiptap-editor"><EditorContent editor={editor} /></div>
              </ResizablePanel>
            </>
          ) : (
            <>
              <ResizablePanel defaultSize={60} minSize={20}>
                <div className="h-full overflow-y-auto tiptap-editor"><EditorContent editor={editor} /></div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={40} minSize={20} maxSize={70}>
                <MarkdownSourcePanel {...panelProps} />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      ) : (
        <div className="flex-1 overflow-y-auto tiptap-editor relative">
          <EditorContent editor={editor} />
          <Button variant="ghost" size="sm" className="absolute right-2 top-2 h-7 gap-1 px-2 text-xs text-muted-foreground z-10" onClick={() => setShowPanel(true)}>
            <PanelRightOpen className="h-3.5 w-3.5" />
            소스
          </Button>
        </div>
      )}
    </div>
  );
};

export default MarkdownEditor;
