import { useState, useRef } from "react";
import { Editor } from "@tiptap/react";
import {
  Bold, Italic, Underline, Strikethrough, Code, CodeSquare,
  Heading1, Heading2, Heading3,
  List, ListOrdered, CheckSquare,
  Quote, Minus, Undo, Redo,
  Image, Link, Unlink,
  Table, Highlighter,
  Superscript, Subscript,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Palette, TableProperties, Plus, Trash2, ArrowUpDown, ArrowLeftRight,
} from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AdvancedColorPicker from "./AdvancedColorPicker";

interface EditorToolbarProps {
  editor: Editor | null;
}

const COLORS = [
  { label: "기본", value: "inherit" },
  { label: "빨강", value: "#e03131" },
  { label: "주황", value: "#e8590c" },
  { label: "노랑", value: "#f08c00" },
  { label: "초록", value: "#2f9e44" },
  { label: "파랑", value: "#1971c2" },
  { label: "보라", value: "#7048e8" },
  { label: "분홍", value: "#c2255c" },
  { label: "회색", value: "#868e96" },
];

const ImageDialog = ({ editor }: { editor: Editor }) => {
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"url" | "upload">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const insertImage = () => {
    if (url) {
      editor.chain().focus().setImage({ src: url, alt: alt || undefined }).run();
      setUrl("");
      setAlt("");
      setOpen(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      editor.chain().focus().setImage({ src: base64, alt: alt || file.name }).run();
      setAlt("");
      setOpen(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Toggle size="sm" pressed={false} className="h-8 w-8 p-0 hover:bg-toolbar-active/50 rounded-sm" title="이미지 삽입">
          <Image className="h-4 w-4" />
        </Toggle>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3">
        <p className="text-sm font-medium">이미지 삽입</p>
        <div className="flex gap-1 border-b border-border pb-2">
          <Button
            variant={tab === "upload" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setTab("upload")}
          >
            파일 업로드
          </Button>
          <Button
            variant={tab === "url" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setTab("url")}
          >
            URL 입력
          </Button>
        </div>
        {tab === "upload" ? (
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full h-9 text-sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Image className="h-4 w-4 mr-2" />
              이미지 파일 선택
            </Button>
            <div className="space-y-1">
              <Label className="text-xs">대체 텍스트 (선택)</Label>
              <Input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="이미지 설명" className="h-8 text-sm" />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="space-y-1">
              <Label className="text-xs">이미지 URL</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="h-8 text-sm" onKeyDown={(e) => e.key === "Enter" && insertImage()} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">대체 텍스트 (선택)</Label>
              <Input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="이미지 설명" className="h-8 text-sm" />
            </div>
            <Button size="sm" onClick={insertImage} className="w-full h-8 text-sm">삽입</Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};


const LinkDialog = ({ editor }: { editor: Editor }) => {
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState(false);

  const setLink = () => {
    if (url) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
      setUrl("");
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) { const prev = editor.getAttributes("link").href; setUrl(prev || ""); } }}>
      <PopoverTrigger asChild>
        <Toggle size="sm" pressed={editor.isActive("link")} className="h-8 w-8 p-0 data-[state=on]:bg-toolbar-active hover:bg-toolbar-active/50 rounded-sm" title="링크 삽입">
          <Link className="h-4 w-4" />
        </Toggle>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3">
        <p className="text-sm font-medium">링크 삽입</p>
        <div className="space-y-2">
          <Label className="text-xs">URL</Label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="h-8 text-sm" onKeyDown={(e) => e.key === "Enter" && setLink()} />
        </div>
        <Button size="sm" onClick={setLink} className="w-full h-8 text-sm">적용</Button>
      </PopoverContent>
    </Popover>
  );
};

const TableMenu = ({ editor }: { editor: Editor }) => {
  const [open, setOpen] = useState(false);

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    setOpen(false);
  };

  if (!editor.isActive("table")) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Toggle size="sm" pressed={false} className="h-8 w-8 p-0 hover:bg-toolbar-active/50 rounded-sm" title="테이블 삽입">
            <Table className="h-4 w-4" />
          </Toggle>
        </PopoverTrigger>
        <PopoverContent className="w-48 space-y-2">
          <p className="text-sm font-medium">테이블 삽입</p>
          <Button size="sm" onClick={insertTable} className="w-full h-8 text-sm">3×3 테이블 삽입</Button>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Toggle size="sm" pressed={true} className="h-8 w-8 p-0 data-[state=on]:bg-toolbar-active hover:bg-toolbar-active/50 rounded-sm" title="테이블 편집">
          <TableProperties className="h-4 w-4" />
        </Toggle>
      </PopoverTrigger>
      <PopoverContent className="w-48 space-y-1">
        <p className="text-sm font-medium mb-2">테이블 편집</p>
        <Button variant="ghost" size="sm" className="w-full justify-start h-8 text-sm" onClick={() => { editor.chain().focus().addColumnAfter().run(); }}>
          <ArrowLeftRight className="h-3.5 w-3.5 mr-2" /> 열 추가
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-start h-8 text-sm" onClick={() => { editor.chain().focus().addRowAfter().run(); }}>
          <ArrowUpDown className="h-3.5 w-3.5 mr-2" /> 행 추가
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-start h-8 text-sm" onClick={() => { editor.chain().focus().deleteColumn().run(); }}>
          <Trash2 className="h-3.5 w-3.5 mr-2" /> 열 삭제
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-start h-8 text-sm" onClick={() => { editor.chain().focus().deleteRow().run(); }}>
          <Trash2 className="h-3.5 w-3.5 mr-2" /> 행 삭제
        </Button>
        <Separator className="my-1" />
        <Button variant="ghost" size="sm" className="w-full justify-start h-8 text-sm text-destructive" onClick={() => { editor.chain().focus().deleteTable().run(); setOpen(false); }}>
          <Trash2 className="h-3.5 w-3.5 mr-2" /> 테이블 삭제
        </Button>
      </PopoverContent>
    </Popover>
  );
};

const ColorPicker = ({ editor }: { editor: Editor }) => {
  const [open, setOpen] = useState(false);
  const currentColor = editor.getAttributes("textStyle").color || "inherit";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Toggle size="sm" pressed={false} className="h-8 w-8 p-0 hover:bg-toolbar-active/50 rounded-sm relative" title="텍스트 색상">
          <Palette className="h-4 w-4" />
          <div
            className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full"
            style={{ backgroundColor: currentColor === "inherit" ? "hsl(var(--foreground))" : currentColor }}
          />
        </Toggle>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <AdvancedColorPicker
          currentColor={currentColor}
          onColorSelect={(color) => {
            editor.chain().focus().setColor(color).run();
            setOpen(false);
          }}
          onReset={() => {
            editor.chain().focus().unsetColor().run();
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
};

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
      { icon: Highlighter, action: () => editor.chain().focus().toggleHighlight().run(), active: editor.isActive("highlight"), title: "형광펜" },
      { icon: Superscript, action: () => editor.chain().focus().toggleSuperscript().run(), active: editor.isActive("superscript"), title: "윗첨자" },
      { icon: Subscript, action: () => editor.chain().focus().toggleSubscript().run(), active: editor.isActive("subscript"), title: "아랫첨자" },
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
      { icon: AlignLeft, action: () => editor.chain().focus().setTextAlign("left").run(), active: editor.isActive({ textAlign: "left" }), title: "왼쪽 정렬" },
      { icon: AlignCenter, action: () => editor.chain().focus().setTextAlign("center").run(), active: editor.isActive({ textAlign: "center" }), title: "가운데 정렬" },
      { icon: AlignRight, action: () => editor.chain().focus().setTextAlign("right").run(), active: editor.isActive({ textAlign: "right" }), title: "오른쪽 정렬" },
      { icon: AlignJustify, action: () => editor.chain().focus().setTextAlign("justify").run(), active: editor.isActive({ textAlign: "justify" }), title: "양쪽 정렬" },
    ],
    [
      { icon: Quote, action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive("blockquote"), title: "인용" },
      { icon: CodeSquare, action: () => editor.chain().focus().toggleCodeBlock().run(), active: editor.isActive("codeBlock"), title: "코드 블록" },
      { icon: Minus, action: () => editor.chain().focus().setHorizontalRule().run(), active: false, title: "구분선" },
    ],
  ];

  return (
    <div className="flex items-center gap-0.5 px-3 py-1.5 bg-toolbar border-b border-toolbar-border overflow-x-auto flex-wrap">
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
      
      {/* Special toolbar items with popovers */}
      <Separator orientation="vertical" className="mx-1.5 h-5" />
      <div className="flex items-center gap-0.5">
        <ImageDialog editor={editor} />
        <LinkDialog editor={editor} />
        {editor.isActive("link") && (
          <Toggle
            size="sm"
            pressed={false}
            onPressedChange={() => editor.chain().focus().unsetLink().run()}
            title="링크 해제"
            className="h-8 w-8 p-0 hover:bg-toolbar-active/50 rounded-sm"
          >
            <Unlink className="h-4 w-4" />
          </Toggle>
        )}
        <TableMenu editor={editor} />
        <ColorPicker editor={editor} />
      </div>
    </div>
  );
};

export default EditorToolbar;
