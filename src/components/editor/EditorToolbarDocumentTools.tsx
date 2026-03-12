import { useRef, useState } from "react";
import { Editor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import {
  ArrowLeftRight,
  ArrowUpDown,
  CodeSquare,
  FootprintsIcon,
  Image,
  ListTree,
  MessageSquareWarning,
  Minus,
  Palette,
  Table,
  TableProperties,
  Tag,
  TextCursorInput,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

type AdmonitionCommandSet = {
  insertAdmonition: (attrs: { type: string }) => boolean;
};

type CaptionCommandSet = {
  insertFigureCaption: (attrs: { captionText: string; captionType: "figure" | "table"; label: string }) => boolean;
};

type CrossReferenceCommandSet = {
  insertCrossReference: (attrs: { targetLabel: string }) => boolean;
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
              {hoverRow > 0 ? `${hoverRow} x ${hoverCol}` : t("toolbar.table.selectSize")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 space-y-0.5">
              <Label className="text-[10px] text-muted-foreground">{t("toolbar.table.rows")}</Label>
              <Input className="h-7 text-center text-xs" max={20} min={1} onChange={(event) => setRows(parseInt(event.target.value, 10) || 1)} type="number" value={rows} />
            </div>
            <span className="mt-4 text-xs text-muted-foreground">x</span>
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
        <Button className="h-8 w-full justify-start text-sm text-destructive" onClick={() => { editor.chain().focus().deleteTable().run(); setOpen(false); }} size="sm" variant="ghost">
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
    <Select onValueChange={(value) => { if (value === "__default__") { editor.chain().focus().unsetFontFamily().run(); return; } editor.chain().focus().setFontFamily(value).run(); }} value={currentFont}>
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
          <Minus className="h-3 w-3 text-muted-foreground" />
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
          <button className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent" key={type.type} onClick={() => { (editor.commands as unknown as AdmonitionCommandSet).insertAdmonition({ type: type.type }); }} type="button">
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
            <button className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent" key={item.label} onClick={() => { (editor.commands as unknown as CrossReferenceCommandSet).insertCrossReference({ targetLabel: item.label }); setOpen(false); }} type="button">
              <span className="text-xs text-muted-foreground">{item.type === "table" ? t("toolbar.crossReference.table") : t("toolbar.crossReference.figure")}</span>
              <span>{item.label}</span>
            </button>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
};

const EditorToolbarDocumentTools = ({
  editor,
  mobile = false,
}: {
  editor: Editor;
  mobile?: boolean;
}) => {
  const { t } = useI18n();

  return (
    <div className={mobile ? "flex flex-wrap items-center gap-1" : "flex flex-wrap items-center gap-0.5"}>
      <Toggle className="h-8 w-8 rounded-sm p-0 hover:bg-toolbar-active/50" onPressedChange={() => editor.chain().focus().toggleCodeBlock().run()} pressed={editor.isActive("codeBlock")} size="sm" title={t("toolbar.actions.codeBlock")}>
        <CodeSquare className="h-4 w-4" />
      </Toggle>
      <Toggle className="h-8 w-8 rounded-sm p-0 hover:bg-toolbar-active/50" onPressedChange={() => editor.chain().focus().setHorizontalRule().run()} pressed={false} size="sm" title={t("toolbar.actions.horizontalRule")}>
        <Minus className="h-4 w-4" />
      </Toggle>
      {!mobile && <Separator className="mx-1.5 h-5" orientation="vertical" />}
      <FontFamilySelect editor={editor} />
      <FontSizeSelect editor={editor} />
      {!mobile && <Separator className="mx-1.5 h-5" orientation="vertical" />}
      <ImageDialog editor={editor} />
      <TableMenu editor={editor} />
      <ColorPicker editor={editor} />
      <AdmonitionMenu editor={editor} />
      <Toggle className="h-8 w-8 rounded-sm p-0 hover:bg-toolbar-active/50" onPressedChange={() => (editor.commands as unknown as FootnoteCommandSet).insertFootnote()} pressed={false} size="sm" title={t("toolbar.actions.footnote")}>
        <FootprintsIcon className="h-4 w-4" />
      </Toggle>
      <Toggle className="h-8 w-8 rounded-sm p-0 hover:bg-toolbar-active/50" onPressedChange={() => (editor.commands as unknown as TocCommandSet).insertTableOfContents()} pressed={false} size="sm" title={t("toolbar.actions.toc")}>
        <ListTree className="h-4 w-4" />
      </Toggle>
      <CaptionMenu editor={editor} />
      <CrossRefMenu editor={editor} />
    </div>
  );
};

export default EditorToolbarDocumentTools;
