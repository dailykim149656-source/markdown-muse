import { useRef, useState } from "react";
import { Editor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { LucideIcon } from "lucide-react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowLeftRight,
  ArrowUpDown,
  Bold,
  CheckSquare,
  ChevronDown,
  Code,
  CodeSquare,
  MoreHorizontal,
  FootprintsIcon,
  GitBranch,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Image,
  Italic,
  Link,
  List,
  ListOrdered,
  ListTree,
  MessageSquareWarning,
  Minus,
  Palette,
  Quote,
  Redo,
  Sigma,
  Strikethrough,
  Subscript,
  Superscript,
  Table,
  TableProperties,
  Tag,
  TextCursorInput,
  Trash2,
  Underline,
  Undo,
  Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import { useI18n } from "@/i18n/useI18n";
import AdvancedColorPicker from "./AdvancedColorPicker";
import { FONT_FAMILIES, FONT_SIZES } from "./fonts";
import MathRender from "./MathRender";

interface EditorToolbarProps {
  editor: Editor | null;
}

type ToolbarItem = {
  action: () => void;
  active: boolean;
  icon: LucideIcon;
  title: string;
};

type AdmonitionCommandSet = {
  insertAdmonition: (attrs: { type: string }) => boolean;
};

type CaptionCommandSet = {
  insertFigureCaption: (attrs: { captionText: string; captionType: "figure" | "table"; label: string }) => boolean;
};

type CrossReferenceCommandSet = {
  insertCrossReference: (attrs: { targetLabel: string }) => boolean;
};

type MermaidCommandSet = {
  insertMermaid: () => boolean;
};

type FootnoteCommandSet = {
  insertFootnote: () => boolean;
};

type TocCommandSet = {
  insertTableOfContents: () => boolean;
};

const ImageDialog = ({ editor }: { editor: Editor }) => {
  const { t } = useI18n();
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"url" | "upload">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const insertImage = () => {
    if (!url) {
      return;
    }

    editor.chain().focus().setImage({ src: url, alt: alt || undefined }).run();
    setUrl("");
    setAlt("");
    setOpen(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const base64 = loadEvent.target?.result as string;
      editor.chain().focus().setImage({ src: base64, alt: alt || file.name }).run();
      setAlt("");
      setOpen(false);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Toggle className="h-8 w-8 rounded-sm p-0 hover:bg-toolbar-active/50" pressed={false} size="sm" title={t("toolbar.image.title")}>
          <Image className="h-4 w-4" />
        </Toggle>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3">
        <p className="text-sm font-medium">{t("toolbar.image.title")}</p>
        <div className="flex gap-1 border-b border-border pb-2">
          <Button className="h-7 text-xs" onClick={() => setTab("upload")} size="sm" variant={tab === "upload" ? "secondary" : "ghost"}>
            {t("toolbar.image.uploadTab")}
          </Button>
          <Button className="h-7 text-xs" onClick={() => setTab("url")} size="sm" variant={tab === "url" ? "secondary" : "ghost"}>
            {t("toolbar.image.urlTab")}
          </Button>
        </div>
        {tab === "upload" ? (
          <div className="space-y-2">
            <input accept="image/*" className="hidden" onChange={handleFileUpload} ref={fileInputRef} type="file" />
            <Button className="h-9 w-full text-sm" onClick={() => fileInputRef.current?.click()} size="sm" variant="outline">
              <Image className="mr-2 h-4 w-4" />
              {t("toolbar.image.selectFile")}
            </Button>
            <div className="space-y-1">
              <Label className="text-xs">{t("toolbar.image.altLabel")}</Label>
              <Input className="h-8 text-sm" onChange={(event) => setAlt(event.target.value)} placeholder={t("toolbar.image.altPlaceholder")} value={alt} />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="space-y-1">
              <Label className="text-xs">{t("toolbar.image.urlLabel")}</Label>
              <Input className="h-8 text-sm" onChange={(event) => setUrl(event.target.value)} onKeyDown={(event) => event.key === "Enter" && insertImage()} placeholder="https://..." value={url} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("toolbar.image.altLabel")}</Label>
              <Input className="h-8 text-sm" onChange={(event) => setAlt(event.target.value)} placeholder={t("toolbar.image.altPlaceholder")} value={alt} />
            </div>
            <Button className="h-8 w-full text-sm" onClick={insertImage} size="sm">
              {t("toolbar.image.insert")}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

const LinkDialog = ({ editor }: { editor: Editor }) => {
  const { t } = useI18n();
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState(false);

  const setLink = () => {
    if (!url) {
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    setUrl("");
    setOpen(false);
  };

  return (
    <Popover
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setUrl(editor.getAttributes("link").href || "");
        }
      }}
      open={open}
    >
      <PopoverTrigger asChild>
        <Toggle
          className="h-8 w-8 rounded-sm p-0 data-[state=on]:bg-toolbar-active hover:bg-toolbar-active/50"
          pressed={editor.isActive("link")}
          size="sm"
          title={t("toolbar.link.title")}
        >
          <Link className="h-4 w-4" />
        </Toggle>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3">
        <p className="text-sm font-medium">{t("toolbar.link.title")}</p>
        <div className="space-y-2">
          <Label className="text-xs">URL</Label>
          <Input className="h-8 text-sm" onChange={(event) => setUrl(event.target.value)} onKeyDown={(event) => event.key === "Enter" && setLink()} placeholder="https://..." value={url} />
        </div>
        <Button className="h-8 w-full text-sm" onClick={setLink} size="sm">
          {t("toolbar.link.apply")}
        </Button>
      </PopoverContent>
    </Popover>
  );
};

const TableMenu = ({ editor }: { editor: Editor }) => {
  const { t } = useI18n();
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
          <Toggle className="h-8 w-8 rounded-sm p-0 hover:bg-toolbar-active/50" pressed={false} size="sm" title={t("toolbar.table.insertTitle")}>
            <Table className="h-4 w-4" />
          </Toggle>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto space-y-3 p-3">
          <p className="text-sm font-medium">{t("toolbar.table.insertTitle")}</p>
          <div>
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${maxCols}, 1fr)` }}>
              {Array.from({ length: maxRows * maxCols }).map((_, index) => {
                const nextRow = Math.floor(index / maxCols) + 1;
                const nextCol = (index % maxCols) + 1;
                const isActive = nextRow <= hoverRow && nextCol <= hoverCol;

                return (
                  <div
                    className={`h-5 w-5 cursor-pointer rounded-sm border transition-colors ${
                      isActive ? "border-primary/50 bg-primary/30" : "border-border hover:border-muted-foreground/50"
                    }`}
                    key={`${nextRow}-${nextCol}`}
                    onClick={() => {
                      setRows(nextRow);
                      setCols(nextCol);
                      editor.chain().focus().insertTable({ rows: nextRow, cols: nextCol, withHeaderRow: true }).run();
                      setOpen(false);
                    }}
                    onMouseEnter={() => {
                      setHoverRow(nextRow);
                      setHoverCol(nextCol);
                    }}
                  />
                );
              })}
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {hoverRow > 0 ? `${hoverRow} × ${hoverCol}` : t("toolbar.table.selectSize")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 space-y-0.5">
              <Label className="text-[10px] text-muted-foreground">{t("toolbar.table.rows")}</Label>
              <Input className="h-7 text-center text-xs" max={20} min={1} onChange={(event) => setRows(parseInt(event.target.value, 10) || 1)} type="number" value={rows} />
            </div>
            <span className="mt-4 text-xs text-muted-foreground">×</span>
            <div className="flex-1 space-y-0.5">
              <Label className="text-[10px] text-muted-foreground">{t("toolbar.table.columns")}</Label>
              <Input className="h-7 text-center text-xs" max={20} min={1} onChange={(event) => setCols(parseInt(event.target.value, 10) || 1)} type="number" value={cols} />
            </div>
          </div>
          <Button className="h-8 w-full text-sm" onClick={insertTable} size="sm">
            {t("toolbar.table.insertSized", { cols, rows })}
          </Button>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Toggle className="h-8 w-8 rounded-sm p-0 data-[state=on]:bg-toolbar-active hover:bg-toolbar-active/50" pressed size="sm" title={t("toolbar.table.editTitle")}>
          <TableProperties className="h-4 w-4" />
        </Toggle>
      </PopoverTrigger>
      <PopoverContent className="w-48 space-y-1">
        <p className="mb-2 text-sm font-medium">{t("toolbar.table.editTitle")}</p>
        <Button className="h-8 w-full justify-start text-sm" onClick={() => editor.chain().focus().addColumnAfter().run()} size="sm" variant="ghost">
          <ArrowLeftRight className="mr-2 h-3.5 w-3.5" />
          {t("toolbar.table.addColumn")}
        </Button>
        <Button className="h-8 w-full justify-start text-sm" onClick={() => editor.chain().focus().addRowAfter().run()} size="sm" variant="ghost">
          <ArrowUpDown className="mr-2 h-3.5 w-3.5" />
          {t("toolbar.table.addRow")}
        </Button>
        <Button className="h-8 w-full justify-start text-sm" onClick={() => editor.chain().focus().deleteColumn().run()} size="sm" variant="ghost">
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          {t("toolbar.table.deleteColumn")}
        </Button>
        <Button className="h-8 w-full justify-start text-sm" onClick={() => editor.chain().focus().deleteRow().run()} size="sm" variant="ghost">
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          {t("toolbar.table.deleteRow")}
        </Button>
        <Separator className="my-1" />
        <Button
          className="h-8 w-full justify-start text-sm text-destructive"
          onClick={() => {
            editor.chain().focus().deleteTable().run();
            setOpen(false);
          }}
          size="sm"
          variant="ghost"
        >
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          {t("toolbar.table.deleteTable")}
        </Button>
      </PopoverContent>
    </Popover>
  );
};
const ColorPicker = ({ editor }: { editor: Editor }) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const currentColor = editor.getAttributes("textStyle").color || "inherit";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Toggle className="relative h-8 w-8 rounded-sm p-0 hover:bg-toolbar-active/50" pressed={false} size="sm" title={t("toolbar.color.title")}>
          <Palette className="h-4 w-4" />
          <div className="absolute bottom-0.5 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full" style={{ backgroundColor: currentColor === "inherit" ? "hsl(var(--foreground))" : currentColor }} />
        </Toggle>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
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
  const { t } = useI18n();
  const currentFont = editor.getAttributes("textStyle").fontFamily || "__default__";
  const categories = [...new Set(FONT_FAMILIES.map((font) => font.category))];

  return (
    <Select
      onValueChange={(value) => {
        if (value === "__default__") {
          editor.chain().focus().unsetFontFamily().run();
          return;
        }

        editor.chain().focus().setFontFamily(value).run();
      }}
      value={currentFont}
    >
      <SelectTrigger className="h-8 w-32 gap-1 border-none bg-transparent px-2 text-xs hover:bg-toolbar-active/50">
        <SelectValue placeholder={t("toolbar.fontFamily.placeholder")} />
      </SelectTrigger>
      <SelectContent>
        <ScrollArea className="h-72">
          {categories.map((category) => (
            <SelectGroup key={category}>
              <SelectLabel className="mx-1 rounded-sm bg-muted/50 px-2 py-1 text-[10px] text-muted-foreground">
                {t(`toolbar.fontFamily.categories.${category}`)}
              </SelectLabel>
              {FONT_FAMILIES.filter((font) => font.category === category).map((font) => (
                <SelectItem className="text-sm" key={`${category}-${font.value || "default"}`} value={font.value || "__default__"}>
                  <span style={{ fontFamily: font.value || "inherit" }}>{font.value ? font.label : t("toolbar.fontFamily.defaultOption")}</span>
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
  const { t } = useI18n();
  const currentSize = editor.getAttributes("textStyle").fontSize || "";
  const [customSize, setCustomSize] = useState("");

  const applyCustomSize = () => {
    if (!customSize) {
      return;
    }

    const nextValue = customSize.includes("px") ? customSize : `${customSize}px`;
    editor.chain().focus().setFontSize(nextValue).run();
    setCustomSize("");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button className="h-8 min-w-[52px] justify-between gap-1 px-2 text-xs font-normal hover:bg-toolbar-active/50" variant="ghost">
          {currentSize || t("toolbar.fontSize.placeholder")}
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-32 p-1.5">
        <ScrollArea className="h-52">
          <div className="space-y-0.5">
            <button className={`w-full rounded-sm px-2 py-1 text-left text-xs hover:bg-accent ${!currentSize ? "bg-accent font-medium" : ""}`} onClick={() => editor.chain().focus().unsetFontSize().run()} type="button">
              {t("toolbar.fontSize.defaultOption")}
            </button>
            {FONT_SIZES.map((size) => (
              <button className={`w-full rounded-sm px-2 py-1 text-left text-xs hover:bg-accent ${currentSize === size.value ? "bg-accent font-medium" : ""}`} key={size.value} onClick={() => editor.chain().focus().setFontSize(size.value).run()} type="button">
                {size.label}px
              </button>
            ))}
          </div>
        </ScrollArea>
        <Separator className="my-1.5" />
        <div className="flex gap-1">
          <Input className="h-7 flex-1 text-xs" onChange={(event) => setCustomSize(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { applyCustomSize(); } }} placeholder={t("toolbar.fontSize.customPlaceholder")} value={customSize} />
          <Button className="h-7 px-2 text-xs" onClick={applyCustomSize} size="sm">
            {t("toolbar.fontSize.apply")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

const MathMenu = ({ editor }: { editor: Editor }) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [latex, setLatex] = useState("");
  const [mode, setMode] = useState<"inline" | "block">("inline");

  const insertMath = () => {
    if (!latex) {
      return;
    }

    if (mode === "inline") {
      editor.chain().focus().insertContent({ attrs: { display: "inline", latex }, type: "math" }).run();
    } else {
      editor.chain().focus().insertContent({ attrs: { display: "block", latex }, type: "mathBlock" }).run();
    }

    setLatex("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Toggle className="h-8 w-8 rounded-sm p-0 hover:bg-toolbar-active/50" pressed={false} size="sm" title={t("toolbar.math.title")}>
          <Sigma className="h-4 w-4" />
        </Toggle>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-3">
        <p className="text-sm font-medium">{t("toolbar.math.dialogTitle")}</p>
        <div className="flex gap-1 border-b border-border pb-2">
          <Button className="h-7 text-xs" onClick={() => setMode("inline")} size="sm" variant={mode === "inline" ? "secondary" : "ghost"}>
            {t("toolbar.math.inline")}
          </Button>
          <Button className="h-7 text-xs" onClick={() => setMode("block")} size="sm" variant={mode === "block" ? "secondary" : "ghost"}>
            {t("toolbar.math.block")}
          </Button>
        </div>
        <textarea
          className="min-h-[60px] w-full resize-none rounded-md border border-border bg-secondary p-2 font-mono text-sm text-foreground outline-none"
          onChange={(event) => setLatex(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { insertMath(); } }}
          placeholder={mode === "inline" ? t("toolbar.math.inlinePlaceholder") : t("toolbar.math.blockPlaceholder")}
          rows={3}
          value={latex}
        />
        {latex && (
          <div className="flex min-h-[40px] items-center justify-center rounded-md border border-border bg-background p-3">
            <MathRender
              displayMode={mode === "block"}
              latex={latex}
              renderErrorLabel={t("toolbar.math.renderError")}
            />
          </div>
        )}
        <Button className="h-8 w-full text-sm" disabled={!latex} onClick={insertMath} size="sm">
          {t("toolbar.math.insert")}
        </Button>
      </PopoverContent>
    </Popover>
  );
};
const AdmonitionMenu = ({ editor }: { editor: Editor }) => {
  const { t } = useI18n();
  const types = [
    { icon: "[note]", label: t("toolbar.admonition.note"), type: "note" },
    { icon: "[tip]", label: t("toolbar.admonition.tip"), type: "tip" },
    { icon: "[warn]", label: t("toolbar.admonition.warning"), type: "warning" },
    { icon: "[danger]", label: t("toolbar.admonition.danger"), type: "danger" },
  ] as const;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Toggle className="h-8 w-8 rounded-sm p-0 data-[state=on]:bg-toolbar-active hover:bg-toolbar-active/50" pressed={editor.isActive("admonition")} size="sm" title={t("toolbar.admonition.title")}>
          <MessageSquareWarning className="h-4 w-4" />
        </Toggle>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-40 p-1">
        {types.map((type) => (
          <button
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
            key={type.type}
            onClick={() => {
              (editor.commands as unknown as AdmonitionCommandSet).insertAdmonition({ type: type.type });
            }}
            type="button"
          >
            <span>{type.icon}</span>
            <span>{type.label}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
};

const CaptionMenu = ({ editor }: { editor: Editor }) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [captionType, setCaptionType] = useState<"figure" | "table">("figure");
  const [label, setLabel] = useState("");
  const [captionText, setCaptionText] = useState("");

  const insertCaption = () => {
    (editor.commands as unknown as CaptionCommandSet).insertFigureCaption({ captionText, captionType, label });
    const position = editor.state.selection.to;
    editor.chain().focus().insertContentAt(position, { type: "paragraph" }).run();
    setLabel("");
    setCaptionText("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (nextOpen) { setCaptionType("figure"); setLabel(""); setCaptionText(""); } }}>
      <PopoverTrigger asChild>
        <Toggle className="h-8 w-8 rounded-sm p-0 hover:bg-toolbar-active/50" pressed={false} size="sm" title={t("toolbar.caption.title")}>
          <TextCursorInput className="h-4 w-4" />
        </Toggle>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 space-y-3">
        <p className="text-sm font-medium">{t("toolbar.caption.title")}</p>
        <div className="flex gap-1 border-b border-border pb-2">
          <Button className="h-7 text-xs" onClick={() => setCaptionType("figure")} size="sm" variant={captionType === "figure" ? "secondary" : "ghost"}>
            {t("toolbar.caption.figure")}
          </Button>
          <Button className="h-7 text-xs" onClick={() => setCaptionType("table")} size="sm" variant={captionType === "table" ? "secondary" : "ghost"}>
            {t("toolbar.caption.table")}
          </Button>
        </div>
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">{t("toolbar.caption.label")}</Label>
            <Input className="h-8 text-sm" onChange={(event) => setLabel(event.target.value)} placeholder={t("toolbar.caption.labelPlaceholder")} value={label} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("toolbar.caption.text")}</Label>
            <Input className="h-8 text-sm" onChange={(event) => setCaptionText(event.target.value)} onKeyDown={(event) => event.key === "Enter" && insertCaption()} placeholder={t("toolbar.caption.textPlaceholder")} value={captionText} />
          </div>
        </div>
        <Button className="h-8 w-full text-sm" onClick={insertCaption} size="sm">
          {t("toolbar.caption.insert")}
        </Button>
      </PopoverContent>
    </Popover>
  );
};

const CrossRefMenu = ({ editor }: { editor: Editor }) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [labels, setLabels] = useState<{ label: string; type: string }[]>([]);

  const collectLabels = () => {
    const items: { label: string; type: string }[] = [];
    editor.state.doc.descendants((node: ProseMirrorNode) => {
      const attrs = node.attrs as { captionType?: string; label?: string };
      if (node.type.name === "figureCaption" && attrs.label) {
        items.push({ label: attrs.label, type: attrs.captionType || "figure" });
      }
    });
    setLabels(items);
  };

  return (
    <Popover open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (nextOpen) { collectLabels(); } }}>
      <PopoverTrigger asChild>
        <Toggle className="h-8 w-8 rounded-sm p-0 hover:bg-toolbar-active/50" pressed={false} size="sm" title={t("toolbar.crossReference.title")}>
          <Tag className="h-4 w-4" />
        </Toggle>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        <p className="px-2 py-1.5 text-sm font-medium">{t("toolbar.crossReference.dialogTitle")}</p>
        {labels.length === 0 ? (
          <p className="px-2 py-2 text-xs text-muted-foreground">{t("toolbar.crossReference.empty")}</p>
        ) : (
          labels.map((item) => (
            <button
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
              key={item.label}
              onClick={() => {
                (editor.commands as unknown as CrossReferenceCommandSet).insertCrossReference({ targetLabel: item.label });
                setOpen(false);
              }}
              type="button"
            >
              <span className="text-xs text-muted-foreground">{item.type === "table" ? t("toolbar.crossReference.table") : t("toolbar.crossReference.figure")}</span>
              <span>{item.label}</span>
            </button>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
};

const InsertToolsGroup = ({ editor, mobile = false }: { editor: Editor; mobile?: boolean }) => {
  const { t } = useI18n();

  return (
    <div className={mobile ? "flex flex-wrap items-center gap-1" : "flex items-center gap-0.5"}>
      <LinkDialog editor={editor} />
      {editor.isActive("link") && (
        <Toggle className="h-8 w-8 rounded-sm p-0 hover:bg-toolbar-active/50" onPressedChange={() => editor.chain().focus().unsetLink().run()} pressed={false} size="sm" title={t("toolbar.actions.unlink")}>
          <Unlink className="h-4 w-4" />
        </Toggle>
      )}
      <ImageDialog editor={editor} />
      <TableMenu editor={editor} />
      <ColorPicker editor={editor} />
      <MathMenu editor={editor} />
      <Toggle
        className="h-8 w-8 rounded-sm p-0 hover:bg-toolbar-active/50"
        onPressedChange={() => (editor.commands as unknown as MermaidCommandSet).insertMermaid()}
        pressed={false}
        size="sm"
        title={t("toolbar.actions.mermaid")}
      >
        <GitBranch className="h-4 w-4" />
      </Toggle>
      <AdmonitionMenu editor={editor} />
      <Toggle
        className="h-8 w-8 rounded-sm p-0 hover:bg-toolbar-active/50"
        onPressedChange={() => (editor.commands as unknown as FootnoteCommandSet).insertFootnote()}
        pressed={false}
        size="sm"
        title={t("toolbar.actions.footnote")}
      >
        <FootprintsIcon className="h-4 w-4" />
      </Toggle>
      {!mobile && <Separator className="mx-1.5 h-5" orientation="vertical" />}
      <Toggle
        className="h-8 w-8 rounded-sm p-0 hover:bg-toolbar-active/50"
        onPressedChange={() => (editor.commands as unknown as TocCommandSet).insertTableOfContents()}
        pressed={false}
        size="sm"
        title={t("toolbar.actions.toc")}
      >
        <ListTree className="h-4 w-4" />
      </Toggle>
      <CaptionMenu editor={editor} />
      <CrossRefMenu editor={editor} />
    </div>
  );
};

const EditorToolbar = ({ editor }: EditorToolbarProps) => {
  const { t } = useI18n();

  if (!editor) {
    return null;
  }

  const historyGroup: ToolbarItem[] = [
    { action: () => editor.chain().focus().undo().run(), active: false, icon: Undo, title: t("toolbar.actions.undo") },
    { action: () => editor.chain().focus().redo().run(), active: false, icon: Redo, title: t("toolbar.actions.redo") },
  ];

  const textStyleGroup: ToolbarItem[] = [
    { action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold"), icon: Bold, title: t("toolbar.actions.bold") },
    { action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic"), icon: Italic, title: t("toolbar.actions.italic") },
    { action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive("underline"), icon: Underline, title: t("toolbar.actions.underline") },
    { action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive("strike"), icon: Strikethrough, title: t("toolbar.actions.strike") },
    { action: () => editor.chain().focus().toggleCode().run(), active: editor.isActive("code"), icon: Code, title: t("toolbar.actions.inlineCode") },
    { action: () => editor.chain().focus().toggleHighlight().run(), active: editor.isActive("highlight"), icon: Highlighter, title: t("toolbar.actions.highlight") },
    { action: () => editor.chain().focus().toggleSuperscript().run(), active: editor.isActive("superscript"), icon: Superscript, title: t("toolbar.actions.superscript") },
    { action: () => editor.chain().focus().toggleSubscript().run(), active: editor.isActive("subscript"), icon: Subscript, title: t("toolbar.actions.subscript") },
  ];

  const structureGroup: ToolbarItem[] = [
    { action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive("heading", { level: 1 }), icon: Heading1, title: t("toolbar.actions.heading1") },
    { action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive("heading", { level: 2 }), icon: Heading2, title: t("toolbar.actions.heading2") },
    { action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive("heading", { level: 3 }), icon: Heading3, title: t("toolbar.actions.heading3") },
  ];

  const listAndBlockGroup: ToolbarItem[] = [
    { action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive("bulletList"), icon: List, title: t("toolbar.actions.bulletList") },
    { action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive("orderedList"), icon: ListOrdered, title: t("toolbar.actions.orderedList") },
    { action: () => editor.chain().focus().toggleTaskList().run(), active: editor.isActive("taskList"), icon: CheckSquare, title: t("toolbar.actions.taskList") },
    { action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive("blockquote"), icon: Quote, title: t("toolbar.actions.blockquote") },
    { action: () => editor.chain().focus().toggleCodeBlock().run(), active: editor.isActive("codeBlock"), icon: CodeSquare, title: t("toolbar.actions.codeBlock") },
    { action: () => editor.chain().focus().setHorizontalRule().run(), active: false, icon: Minus, title: t("toolbar.actions.horizontalRule") },
  ];

  const alignmentGroup: ToolbarItem[] = [
    { action: () => editor.chain().focus().setTextAlign("left").run(), active: editor.isActive({ textAlign: "left" }), icon: AlignLeft, title: t("toolbar.actions.alignLeft") },
    { action: () => editor.chain().focus().setTextAlign("center").run(), active: editor.isActive({ textAlign: "center" }), icon: AlignCenter, title: t("toolbar.actions.alignCenter") },
    { action: () => editor.chain().focus().setTextAlign("right").run(), active: editor.isActive({ textAlign: "right" }), icon: AlignRight, title: t("toolbar.actions.alignRight") },
    { action: () => editor.chain().focus().setTextAlign("justify").run(), active: editor.isActive({ textAlign: "justify" }), icon: AlignJustify, title: t("toolbar.actions.alignJustify") },
  ];

  const toolbarGroups: ToolbarItem[][] = [
    historyGroup,
    textStyleGroup,
    structureGroup,
    listAndBlockGroup,
    alignmentGroup,
  ];

  return (
    <div className="relative border-b border-toolbar-border bg-toolbar">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-[hsl(var(--toolbar-bg))] to-transparent sm:hidden" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-[hsl(var(--toolbar-bg))] to-transparent sm:hidden" />
      <div className="scrollbar-thin flex w-full min-w-max items-center gap-0.5 overflow-x-auto overscroll-x-contain px-2 py-1.5 [scroll-snap-type:x_proximity] [scrollbar-width:thin] [touch-action:pan-x] [-webkit-overflow-scrolling:touch] sm:px-3">
        {toolbarGroups.map((group, groupIndex) => (
          <div className="flex shrink-0 snap-start items-center gap-0.5" key={`group-${groupIndex}`}>
            {groupIndex > 0 && <Separator className="mx-1.5 h-5" orientation="vertical" />}
            {group.map((item) => (
              <Toggle className="h-8 w-8 rounded-sm p-0 data-[state=on]:bg-toolbar-active hover:bg-toolbar-active/50" key={item.title} onPressedChange={item.action} pressed={item.active} size="sm" title={item.title}>
                <item.icon className="h-4 w-4" />
              </Toggle>
            ))}
          </div>
        ))}
        <div className="flex shrink-0 snap-start items-center gap-0.5">
          <Separator className="mx-1.5 h-5" orientation="vertical" />
          <FontFamilySelect editor={editor} />
          <FontSizeSelect editor={editor} />
        </div>
        <div className="hidden shrink-0 snap-start items-center gap-0.5 sm:flex">
          <Separator className="mx-1.5 h-5" orientation="vertical" />
          <InsertToolsGroup editor={editor} />
        </div>
        <div className="flex shrink-0 snap-start items-center gap-0.5 sm:hidden">
          <Separator className="mx-1.5 h-5" orientation="vertical" />
          <Drawer>
            <DrawerTrigger asChild>
              <Button className="h-8 gap-1 px-2 text-xs font-normal hover:bg-toolbar-active/50" size="sm" variant="ghost">
                <MoreHorizontal className="h-4 w-4" />
                {t("toolbar.actions.more")}
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>{t("toolbar.mobileInsert.title")}</DrawerTitle>
                <DrawerDescription>{t("toolbar.mobileInsert.description")}</DrawerDescription>
              </DrawerHeader>
              <div className="px-4 pb-5">
                <InsertToolsGroup editor={editor} mobile />
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
    </div>
  );
};

export default EditorToolbar;


