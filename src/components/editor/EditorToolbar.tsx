import { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Minus,
  Undo,
  Redo,
} from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";

interface EditorToolbarProps {
  editor: Editor | null;
}

const EditorToolbar = ({ editor }: EditorToolbarProps) => {
  if (!editor) return null;

  const toolbarGroups = [
    [
      { icon: Undo, action: () => editor.chain().focus().undo().run(), active: false, title: "실행 취소" },
      { icon: Redo, action: () => editor.chain().focus().redo().run(), active: false, title: "다시 실행" },
    ],
    [
      { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold"), title: "굵게" },
      { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic"), title: "기울임" },
      { icon: Underline, action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive("underline"), title: "밑줄" },
      { icon: Strikethrough, action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive("strike"), title: "취소선" },
      { icon: Code, action: () => editor.chain().focus().toggleCode().run(), active: editor.isActive("code"), title: "인라인 코드" },
    ],
    [
      { icon: Heading1, action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive("heading", { level: 1 }), title: "제목 1" },
      { icon: Heading2, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive("heading", { level: 2 }), title: "제목 2" },
      { icon: Heading3, action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive("heading", { level: 3 }), title: "제목 3" },
    ],
    [
      { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive("bulletList"), title: "글머리 기호" },
      { icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive("orderedList"), title: "번호 목록" },
      { icon: CheckSquare, action: () => editor.chain().focus().toggleTaskList().run(), active: editor.isActive("taskList"), title: "체크리스트" },
    ],
    [
      { icon: Quote, action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive("blockquote"), title: "인용" },
      { icon: Minus, action: () => editor.chain().focus().setHorizontalRule().run(), active: false, title: "구분선" },
    ],
  ];

  return (
    <div className="flex items-center gap-0.5 px-3 py-1.5 bg-toolbar border-b border-toolbar-border overflow-x-auto">
      {toolbarGroups.map((group, gi) => (
        <div key={gi} className="flex items-center gap-0.5">
          {gi > 0 && <Separator orientation="vertical" className="mx-1.5 h-5" />}
          {group.map((item, ii) => (
            <Toggle
              key={ii}
              size="sm"
              pressed={item.active}
              onPressedChange={() => item.action()}
              title={item.title}
              className="h-8 w-8 p-0 data-[state=on]:bg-toolbar-active hover:bg-toolbar-active/50 rounded-sm"
            >
              <item.icon className="h-4 w-4" />
            </Toggle>
          ))}
        </div>
      ))}
    </div>
  );
};

export default EditorToolbar;
