import { useState, useRef } from "react";
import katexLib from "katex";
import "katex/dist/katex.min.css";
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
  Palette, TableProperties, Plus, Trash2, ArrowUpDown, ArrowLeftRight, Sigma, GitBranch,
  MessageSquareWarning, FootprintsIcon,
  ListTree, TextCursorInput, Tag,
} from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AdvancedColorPicker from "./AdvancedColorPicker";
import { FONT_FAMILIES, FONT_SIZES } from "./fonts";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EditorToolbarProps {
  editor: Editor | null;
}


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

  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [hoverRow, setHoverRow] = useState(0);
  const [hoverCol, setHoverCol] = useState(0);

  const maxRows = 8;
  const maxCols = 8;

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
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
        <PopoverContent className="w-auto p-3 space-y-3" align="start">
          <p className="text-sm font-medium">테이블 삽입</p>
          {/* Grid selector */}
          <div>
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${maxCols}, 1fr)` }}>
              {Array.from({ length: maxRows * maxCols }).map((_, i) => {
                const r = Math.floor(i / maxCols) + 1;
                const c = (i % maxCols) + 1;
                const isActive = r <= hoverRow && c <= hoverCol;
                return (
                  <div
                    key={i}
                    className={`w-5 h-5 rounded-sm border cursor-pointer transition-colors ${
                      isActive ? "bg-primary/30 border-primary/50" : "border-border hover:border-muted-foreground/50"
                    }`}
                    onMouseEnter={() => { setHoverRow(r); setHoverCol(c); }}
                    onClick={() => { setRows(r); setCols(c);
                      editor.chain().focus().insertTable({ rows: r, cols: c, withHeaderRow: true }).run();
                      setOpen(false);
                    }}
                  />
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              {hoverRow > 0 ? `${hoverRow} × ${hoverCol}` : "크기를 선택하세요"}
            </p>
          </div>
          {/* Manual input */}
          <div className="flex items-center gap-2">
            <div className="flex-1 space-y-0.5">
              <Label className="text-[10px] text-muted-foreground">행</Label>
              <Input type="number" min={1} max={20} value={rows} onChange={(e) => setRows(parseInt(e.target.value) || 1)} className="h-7 text-xs text-center" />
            </div>
            <span className="text-xs text-muted-foreground mt-4">×</span>
            <div className="flex-1 space-y-0.5">
              <Label className="text-[10px] text-muted-foreground">열</Label>
              <Input type="number" min={1} max={20} value={cols} onChange={(e) => setCols(parseInt(e.target.value) || 1)} className="h-7 text-xs text-center" />
            </div>
          </div>
          <Button size="sm" onClick={insertTable} className="w-full h-8 text-sm">{rows} × {cols} 테이블 삽입</Button>
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

const FontFamilySelect = ({ editor }: { editor: Editor }) => {
  const currentFont = editor.getAttributes("textStyle").fontFamily || "__default__";
  const categories = [...new Set(FONT_FAMILIES.map((f) => f.category))];

  return (
    <Select
      value={currentFont}
      onValueChange={(val) => {
        if (val === "__default__") {
          editor.chain().focus().unsetFontFamily().run();
        } else {
          editor.chain().focus().setFontFamily(val).run();
        }
      }}
    >
      <SelectTrigger className="h-8 w-32 text-xs border-none bg-transparent hover:bg-toolbar-active/50 px-2 gap-1">
        <SelectValue placeholder="폰트" />
      </SelectTrigger>
      <SelectContent>
        <ScrollArea className="h-72">
          {categories.map((cat) => (
            <SelectGroup key={cat}>
              <SelectLabel className="text-[10px] text-muted-foreground">{cat}</SelectLabel>
              {FONT_FAMILIES.filter((f) => f.category === cat).map((font) => (
                <SelectItem key={font.label} value={font.value || "__default__"} className="text-sm">
                  <span style={{ fontFamily: font.value || "inherit" }}>{font.label}</span>
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </ScrollArea>
      </SelectContent>
    </Select>
  );
};

const FontSizeSelect = ({ editor }: { editor: Editor }) => {
  const currentSize = editor.getAttributes("textStyle").fontSize || "";
  const [customSize, setCustomSize] = useState("");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="h-8 min-w-[52px] text-xs px-2 hover:bg-toolbar-active/50 font-normal justify-between gap-1">
          {currentSize || "크기"}
          <span className="text-[8px] text-muted-foreground">▼</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-32 p-1.5" align="start">
        <ScrollArea className="h-52">
          <div className="space-y-0.5">
            <button
              className={`w-full text-left px-2 py-1 text-xs rounded-sm hover:bg-accent ${!currentSize ? "bg-accent font-medium" : ""}`}
              onClick={() => editor.chain().focus().unsetFontSize().run()}
            >
              기본
            </button>
            {FONT_SIZES.map((s) => (
              <button
                key={s.value}
                className={`w-full text-left px-2 py-1 text-xs rounded-sm hover:bg-accent ${currentSize === s.value ? "bg-accent font-medium" : ""}`}
                onClick={() => editor.chain().focus().setFontSize(s.value).run()}
              >
                {s.label}px
              </button>
            ))}
          </div>
        </ScrollArea>
        <Separator className="my-1.5" />
        <div className="flex gap-1">
          <Input
            placeholder="직접 입력"
            value={customSize}
            onChange={(e) => setCustomSize(e.target.value)}
            className="h-7 text-xs flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && customSize) {
                const val = customSize.includes("px") ? customSize : `${customSize}px`;
                editor.chain().focus().setFontSize(val).run();
                setCustomSize("");
              }
            }}
          />
          <Button size="sm" className="h-7 text-xs px-2" onClick={() => {
            if (customSize) {
              const val = customSize.includes("px") ? customSize : `${customSize}px`;
              editor.chain().focus().setFontSize(val).run();
              setCustomSize("");
            }
          }}>
            적용
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

const MathMenu = ({ editor }: { editor: Editor }) => {
  const [open, setOpen] = useState(false);
  const [latex, setLatex] = useState("");
  const [mode, setMode] = useState<"inline" | "block">("inline");

  const insertMath = () => {
    if (!latex) return;
    if (mode === "inline") {
      editor.chain().focus().insertContent({
        type: "math",
        attrs: { latex, display: "inline" },
      }).run();
    } else {
      editor.chain().focus().insertContent({
        type: "mathBlock",
        attrs: { latex, display: "block" },
      }).run();
    }
    setLatex("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Toggle size="sm" pressed={false} className="h-8 w-8 p-0 hover:bg-toolbar-active/50 rounded-sm" title="수식 삽입">
          <Sigma className="h-4 w-4" />
        </Toggle>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-3" align="start">
        <p className="text-sm font-medium">수식 삽입 (LaTeX)</p>
        <div className="flex gap-1 border-b border-border pb-2">
          <Button variant={mode === "inline" ? "secondary" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setMode("inline")}>
            인라인 수식
          </Button>
          <Button variant={mode === "block" ? "secondary" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setMode("block")}>
            블록 수식
          </Button>
        </div>
        <textarea
          value={latex}
          onChange={(e) => setLatex(e.target.value)}
          placeholder={mode === "inline" ? "예: E = mc^2" : "예: \\int_0^\\infty e^{-x} dx = 1"}
          className="w-full bg-secondary text-foreground text-sm font-mono p-2 rounded-md outline-none resize-none min-h-[60px] border border-border"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) insertMath();
          }}
        />
        {latex && (
          <div className="border border-border rounded-md p-3 bg-background flex justify-center min-h-[40px] items-center">
            <MathPreview latex={latex} displayMode={mode === "block"} />
          </div>
        )}
        <Button size="sm" onClick={insertMath} className="w-full h-8 text-sm" disabled={!latex}>삽입</Button>
      </PopoverContent>
    </Popover>
  );
};

const MathPreview = ({ latex, displayMode }: { latex: string; displayMode: boolean }) => {
  try {
    const html = katexLib.renderToString(latex, { displayMode, throwOnError: false });
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  } catch {
    return <span className="text-destructive text-xs">렌더링 오류</span>;
  }
};

const AdmonitionMenu = ({ editor }: { editor: Editor }) => {
  const types = [
    { type: "note", label: "노트", icon: "📝" },
    { type: "tip", label: "팁", icon: "💡" },
    { type: "warning", label: "경고", icon: "⚠️" },
    { type: "danger", label: "위험", icon: "🚨" },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Toggle
          size="sm"
          pressed={editor.isActive("admonition")}
          title="콜아웃 삽입"
          className="h-8 w-8 p-0 data-[state=on]:bg-toolbar-active hover:bg-toolbar-active/50 rounded-sm"
        >
          <MessageSquareWarning className="h-4 w-4" />
        </Toggle>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-1" align="start">
        {types.map((t) => (
          <button
            key={t.type}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent text-left"
            onClick={() => {
              (editor.commands as any).insertAdmonition({ type: t.type });
            }}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
};

const CaptionMenu = ({ editor }: { editor: Editor }) => {
  const [open, setOpen] = useState(false);
  const [captionType, setCaptionType] = useState<"figure" | "table">("figure");
  const [label, setLabel] = useState("");
  const [captionText, setCaptionText] = useState("");

  const insert = () => {
    (editor.commands as any).insertFigureCaption({ captionType, label, captionText });
    // Move cursor after the caption into a new paragraph
    const { state } = editor;
    const pos = state.selection.to;
    editor.chain().focus().insertContentAt(pos, { type: "paragraph" }).run();
    setLabel("");
    setCaptionText("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Toggle size="sm" pressed={false} className="h-8 w-8 p-0 hover:bg-toolbar-active/50 rounded-sm" title="캡션 삽입">
          <TextCursorInput className="h-4 w-4" />
        </Toggle>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-3" align="start">
        <p className="text-sm font-medium">캡션 삽입</p>
        <div className="flex gap-1 border-b border-border pb-2">
          <Button variant={captionType === "figure" ? "secondary" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setCaptionType("figure")}>
            그림
          </Button>
          <Button variant={captionType === "table" ? "secondary" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setCaptionType("table")}>
            표
          </Button>
        </div>
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">라벨 (교차 참조용)</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="예: fig:result" className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">캡션 텍스트</Label>
            <Input value={captionText} onChange={(e) => setCaptionText(e.target.value)} placeholder="캡션 내용" className="h-8 text-sm" onKeyDown={(e) => e.key === "Enter" && insert()} />
          </div>
        </div>
        <Button size="sm" onClick={insert} className="w-full h-8 text-sm">삽입</Button>
      </PopoverContent>
    </Popover>
  );
};

const CrossRefMenu = ({ editor }: { editor: Editor }) => {
  const [open, setOpen] = useState(false);
  const [labels, setLabels] = useState<{ label: string; type: string }[]>([]);

  const collectLabels = () => {
    const items: { label: string; type: string }[] = [];
    editor.state.doc.descendants((node: any) => {
      if (node.type.name === "figureCaption" && node.attrs.label) {
        items.push({ label: node.attrs.label, type: node.attrs.captionType });
      }
    });
    setLabels(items);
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) collectLabels(); }}>
      <PopoverTrigger asChild>
        <Toggle size="sm" pressed={false} className="h-8 w-8 p-0 hover:bg-toolbar-active/50 rounded-sm" title="교차 참조 삽입">
          <Tag className="h-4 w-4" />
        </Toggle>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="start">
        <p className="text-sm font-medium px-2 py-1.5">교차 참조</p>
        {labels.length === 0 ? (
          <p className="text-xs text-muted-foreground px-2 py-2">
            라벨이 있는 캡션이 없습니다. 먼저 캡션을 추가하세요.
          </p>
        ) : (
          labels.map((item) => (
            <button
              key={item.label}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent text-left"
              onClick={() => {
                (editor.commands as any).insertCrossReference({ targetLabel: item.label });
                setOpen(false);
              }}
            >
              <span className="text-xs text-muted-foreground">{item.type === "table" ? "표" : "그림"}</span>
              <span>{item.label}</span>
            </button>
          ))
        )}
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
      {/* Font selects */}
      <FontFamilySelect editor={editor} />
      <FontSizeSelect editor={editor} />
      <Separator orientation="vertical" className="mx-1.5 h-5" />
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
        <MathMenu editor={editor} />
        <Toggle
          size="sm"
          pressed={false}
          onPressedChange={() => (editor.commands as any).insertMermaid()}
          title="Mermaid 다이어그램"
          className="h-8 w-8 p-0 hover:bg-toolbar-active/50 rounded-sm"
        >
          <GitBranch className="h-4 w-4" />
        </Toggle>
        <AdmonitionMenu editor={editor} />
        <Toggle
          size="sm"
          pressed={false}
          onPressedChange={() => (editor.commands as any).insertFootnote()}
          title="각주 삽입"
          className="h-8 w-8 p-0 hover:bg-toolbar-active/50 rounded-sm"
        >
          <FootprintsIcon className="h-4 w-4" />
        </Toggle>
        <Separator orientation="vertical" className="mx-1.5 h-5" />
        <Toggle
          size="sm"
          pressed={false}
          onPressedChange={() => (editor.commands as any).insertTableOfContents()}
          title="목차 삽입"
          className="h-8 w-8 p-0 hover:bg-toolbar-active/50 rounded-sm"
        >
          <ListTree className="h-4 w-4" />
        </Toggle>
        <CaptionMenu editor={editor} />
        <CrossRefMenu editor={editor} />
      </div>
    </div>
  );
};

export default EditorToolbar;
