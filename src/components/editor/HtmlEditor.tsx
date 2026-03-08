import { useEditor, EditorContent } from "@tiptap/react";
import { useState, useCallback, useRef } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import UnderlineExt from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import ResizableImage from "./extensions/ResizableImage";
import LinkExt from "@tiptap/extension-link";
import { Table as TableExt } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Highlight from "@tiptap/extension-highlight";
import SubscriptExt from "@tiptap/extension-subscript";
import SuperscriptExt from "@tiptap/extension-superscript";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import FontSize from "./extensions/FontSize";
import { MathExtension, MathBlockExtension } from "./extensions/MathExtension";
import EditorToolbar from "./EditorToolbar";
import { Code2, PanelRightClose, PanelRightOpen, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HtmlEditorProps {
  initialContent?: string;
  onContentChange?: (content: string) => void;
}

interface HtmlSourcePanelProps {
  htmlSource: string;
  onSourceChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  setSourceLeft: (fn: (v: boolean) => boolean) => void;
  setShowPanel: (v: boolean) => void;
}

const HtmlSourcePanel = ({ htmlSource, onSourceChange, onKeyDown, setSourceLeft, setShowPanel }: HtmlSourcePanelProps) => (
  <div className="h-full flex flex-col bg-background">
    <div className="h-8 flex items-center justify-between px-3 bg-secondary/50 border-b border-border shrink-0">
      <div className="flex items-center gap-1.5">
        <Code2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">HTML 소스</span>
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
      value={htmlSource}
      onChange={onSourceChange}
      onKeyDown={onKeyDown}
      spellCheck={false}
      className="flex-1 w-full bg-background text-foreground font-mono text-xs p-4 resize-none outline-none leading-relaxed"
      placeholder={"<!-- WYSIWYG 편집기에 내용을 입력하면\n     HTML 소스가 여기에 표시됩니다. -->"}
    />
  </div>
);

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
      queueMicrotask(() => {
        syncingFromWysiwyg.current = false;
      });
    },
    [onContentChange]
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: "HTML 문서를 WYSIWYG으로 작성하세요..." }),
      UnderlineExt,
      TaskList,
      TaskItem.configure({ nested: true }),
      ResizableImage,
      LinkExt.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline cursor-pointer" },
      }),
      TableExt.configure({ resizable: true }),
      TableRow, TableCell, TableHeader,
      Highlight.configure({ multicolor: false }),
      SubscriptExt, SuperscriptExt,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle, Color, FontFamily, FontSize,
      MathExtension, MathBlockExtension,
    ],
    content: initialContent || "",
    onUpdate: ({ editor }) => handleWysiwygUpdate(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "prose prose-neutral dark:prose-invert max-w-none focus:outline-none",
      },
    },
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
        queueMicrotask(() => {
          syncingFromSource.current = false;
        });
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
        setTimeout(() => {
          ta.selectionStart = ta.selectionEnd = start + 2;
        }, 0);
      }
    },
    [htmlSource]
  );

  const panelProps = {
    htmlSource,
    onSourceChange: handleSourceChange,
    onKeyDown: handleSourceKeyDown,
    setSourceLeft,
    setShowPanel,
  };

  return (
    <div className="flex flex-col h-full">
      <EditorToolbar editor={editor} />
      {showPanel ? (
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {sourceLeft ? (
            <>
              <ResizablePanel defaultSize={40} minSize={20} maxSize={70}>
                <HtmlSourcePanel {...panelProps} />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={60} minSize={20}>
                <div className="h-full overflow-y-auto tiptap-editor">
                  <EditorContent editor={editor} />
                </div>
              </ResizablePanel>
            </>
          ) : (
            <>
              <ResizablePanel defaultSize={60} minSize={20}>
                <div className="h-full overflow-y-auto tiptap-editor">
                  <EditorContent editor={editor} />
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={40} minSize={20} maxSize={70}>
                <HtmlSourcePanel {...panelProps} />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      ) : (
        <div className="flex-1 overflow-y-auto tiptap-editor relative">
          <EditorContent editor={editor} />
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2 h-7 gap-1 px-2 text-xs text-muted-foreground z-10"
            onClick={() => setShowPanel(true)}
          >
            <PanelRightOpen className="h-3.5 w-3.5" />
            소스
          </Button>
        </div>
      )}
    </div>
  );
};

export default HtmlEditor;
