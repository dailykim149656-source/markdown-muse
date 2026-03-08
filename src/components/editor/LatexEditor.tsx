import { useEditor, EditorContent } from "@tiptap/react";
import { useState, useCallback } from "react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import UnderlineExt from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import ImageExt from "@tiptap/extension-image";
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

interface LatexEditorProps {
  initialContent?: string;
  onContentChange?: (content: string) => void;
}

const LatexEditor = ({ initialContent, onContentChange }: LatexEditorProps) => {
  const [latexPreview, setLatexPreview] = useState("");
  const [showPanel, setShowPanel] = useState(true);

  const handleUpdate = useCallback(
    (html: string) => {
      const latex = htmlToLatex(html);
      setLatexPreview(latex);
      onContentChange?.(latex);
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
      ImageExt.configure({ inline: false, allowBase64: true }),
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
    onUpdate: ({ editor }) => handleUpdate(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "prose prose-neutral dark:prose-invert max-w-none focus:outline-none",
      },
    },
  });

  return (
    <div className="flex flex-col h-full">
      <EditorToolbar editor={editor} />
      <div className="flex flex-1 overflow-hidden">
        {/* WYSIWYG Editor */}
        <div className={`flex-1 overflow-y-auto tiptap-editor ${showPanel ? "border-r border-border" : ""}`}>
          <EditorContent editor={editor} />
        </div>

        {/* LaTeX Source Preview Panel */}
        {showPanel && (
          <div className="w-[400px] flex flex-col bg-background">
            <div className="h-8 flex items-center justify-between px-3 bg-secondary/50 border-b border-border shrink-0">
              <div className="flex items-center gap-1.5">
                <Code2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">LaTeX 소스</span>
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
            <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-foreground leading-relaxed whitespace-pre-wrap select-all">
              {latexPreview || "// WYSIWYG 편집기에 내용을 입력하면\n// LaTeX 소스가 여기에 표시됩니다."}
            </pre>
          </div>
        )}

        {/* Toggle button when panel is hidden */}
        {!showPanel && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-[calc(theme(spacing.12)+theme(spacing.8)+0.5rem)] h-7 gap-1 px-2 text-xs text-muted-foreground z-10"
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
