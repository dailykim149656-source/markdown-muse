import { useEditor, EditorContent } from "@tiptap/react";
import EditorToolbar from "./EditorToolbar";
import { createEditorExtensions, editorPropsDefault } from "./editorConfig";
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
  const editor = useEditor({
    extensions: createEditorExtensions("여기에 글을 작성하세요..."),
    content: initialContent ? marked.parse(initialContent, { async: false }) as string : "",
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const markdown = turndownService.turndown(html);
      onContentChange?.(markdown);
    },
    editorProps: editorPropsDefault,
  });

  return (
    <div className="flex flex-col h-full">
      <EditorToolbar editor={editor} />
      <div className="flex-1 overflow-y-auto tiptap-editor">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default MarkdownEditor;
