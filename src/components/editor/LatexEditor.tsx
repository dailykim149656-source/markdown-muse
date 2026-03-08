import { useEditor, EditorContent } from "@tiptap/react";
import { useState, useCallback, useRef } from "react";
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
import { htmlToLatex, latexToHtml } from "./utils/htmlToLatex";
import { Code2, PanelRightClose, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import LatexHighlightEditor from "./LatexHighlightEditor";

interface LatexEditorProps {
  initialContent?: string;
  onContentChange?: (content: string) => void;
}

const LatexEditor = ({ initialContent, onContentChange }: LatexEditorProps) => {
  const [latexSource, setLatexSource] = useState(() =>
    initialContent || ""
  );
  const [showPanel, setShowPanel] = useState(true);

  // Guards to prevent infinite sync loops
  const syncingFromWysiwyg = useRef(false);
  const syncingFromSource = useRef(false);
  const sourceDebounce = useRef<ReturnType<typeof setTimeout>>();

  // WYSIWYG → LaTeX source
  const handleWysiwygUpdate = useCallback(
    (html: string) => {
      if (syncingFromSource.current) return;
      syncingFromWysiwyg.current = true;
      const latex = htmlToLatex(html);
      setLatexSource(latex);
      onContentChange?.(latex);
      // Reset guard after microtask
      queueMicrotask(() => {
        syncingFromWysiwyg.current = false;
      });
    },
    [onContentChange]
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: "LaTeX 문서를 WYSIWYG으로 작성하세요..." }),
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
    content: initialContent ? latexToHtml(initialContent) : "",
    onUpdate: ({ editor }) => handleWysiwygUpdate(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "prose prose-neutral dark:prose-invert max-w-none focus:outline-none",
      },
    },
  });

  // LaTeX source → WYSIWYG (debounced)
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
        queueMicrotask(() => {
          syncingFromSource.current = false;
        });
      }, 600);
    },
    [editor, onContentChange]
  );

  // Tab support in textarea
  const handleSourceKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const ta = e.currentTarget;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const newVal = latexSource.substring(0, start) + "  " + latexSource.substring(end);
        setLatexSource(newVal);
        setTimeout(() => {
          ta.selectionStart = ta.selectionEnd = start + 2;
        }, 0);
      }
    },
    [latexSource]
  );

  return (
    <div className="flex flex-col h-full">
      <EditorToolbar editor={editor} />
      <div className="flex flex-1 overflow-hidden relative">
        {/* WYSIWYG Editor */}
        <div className={`flex-1 overflow-y-auto tiptap-editor ${showPanel ? "border-r border-border" : ""}`}>
          <EditorContent editor={editor} />
        </div>

        {/* LaTeX Source Panel (editable) */}
        {showPanel && (
          <div className="w-[420px] flex flex-col bg-background">
            <div className="h-8 flex items-center justify-between px-3 bg-secondary/50 border-b border-border shrink-0">
              <div className="flex items-center gap-1.5">
                <Code2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">LaTeX 소스</span>
                <span className="text-[10px] text-muted-foreground/60 ml-1">양방향 동기화</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setShowPanel(false)}
              >
                <PanelRightClose className="h-3.5 w-3.5" />
              </Button>
            </div>
            <LatexHighlightEditor
              value={latexSource}
              onChange={handleSourceChange}
              onKeyDown={handleSourceKeyDown}
              placeholder="// WYSIWYG 편집기에 내용을 입력하면&#10;// LaTeX 소스가 여기에 표시됩니다."
            />
          </div>
        )}

        {/* Toggle button when panel is hidden */}
        {!showPanel && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2 h-7 gap-1 px-2 text-xs text-muted-foreground z-10"
            onClick={() => setShowPanel(true)}
          >
            <PanelRightOpen className="h-3.5 w-3.5" />
            소스
          </Button>
        )}
      </div>
    </div>
  );
};

export default LatexEditor;
