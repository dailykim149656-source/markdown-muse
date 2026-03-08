import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import UnderlineExt from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import EditorToolbar from "./EditorToolbar";
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
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: "여기에 글을 작성하세요...",
      }),
      UnderlineExt,
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: initialContent ? marked.parse(initialContent, { async: false }) as string : "",
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const markdown = turndownService.turndown(html);
      onContentChange?.(markdown);
    },
    editorProps: {
      attributes: {
        class: "prose prose-neutral dark:prose-invert max-w-none focus:outline-none",
      },
    },
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
