import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { useRef, useState } from "react";
import {
  ArrowLeftRight,
  ArrowUpDown,
  Code,
  CodeSquare,
  FootprintsIcon,
  GitBranch,
  Highlighter,
  Image,
  Link,
  ListTree,
  MessageSquareWarning,
  Minus,
  Quote,
  Sigma,
  Subscript,
  Superscript,
  Table,
  Trash2,
  Unlink,
} from "lucide-react";
import AdvancedColorPicker from "./AdvancedColorPicker";
import MathRender from "./MathRender";
import { FONT_FAMILIES, FONT_SIZES } from "./fonts";
import type { EditorCommand } from "./editorSelectionMemory";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/i18n/useI18n";

type AdmonitionCommandSet = {
  insertAdmonition: (attrs: { type: string }) => boolean;
};

type CaptionCommandSet = {
  insertFigureCaption: (attrs: {
    captionText: string;
    captionType: "figure" | "table";
    label: string;
  }) => boolean;
};

type CrossReferenceCommandSet = {
  insertCrossReference: (attrs: { targetLabel: string }) => boolean;
};

type FootnoteCommandSet = {
  insertFootnote: () => boolean;
};

type MermaidCommandSet = {
  insertMermaid: () => boolean;
};

type TocCommandSet = {
  insertTableOfContents: () => boolean;
};

interface MobileEditorFormatSheetProps {
  advancedBlocksEnabled?: boolean;
  canEnableAdvancedBlocks?: boolean;
  canEnableDocumentFeatures?: boolean;
  documentFeaturesEnabled?: boolean;
  editor: Editor;
  onEnableAdvancedBlocks?: () => void;
  onEnableDocumentFeatures?: () => void;
  runCommand: (command: EditorCommand) => boolean;
}

const SheetSection = ({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) => (
  <section className="space-y-2">
    <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {title}
    </h3>
    {children}
  </section>
);

const SheetActionButton = ({
  active = false,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) => (
  <Button
    className="justify-start"
    onClick={onClick}
    size="sm"
    variant={active ? "secondary" : "outline"}
  >
    {children}
  </Button>
);

const SheetGroup = ({
  children,
  title,
  value,
}: {
  children: React.ReactNode;
  title: string;
  value: string;
}) => (
  <AccordionItem className="rounded-xl border border-border/70 bg-background/60 px-3" value={value}>
    <AccordionTrigger className="py-3 text-sm font-semibold no-underline hover:no-underline">
      {title}
    </AccordionTrigger>
    <AccordionContent className="space-y-4">
      {children}
    </AccordionContent>
  </AccordionItem>
);

const MoreFormattingSection = ({
  editor,
  runCommand,
}: {
  editor: Editor;
  runCommand: MobileEditorFormatSheetProps["runCommand"];
}) => {
  const { t } = useI18n();

  return (
    <SheetSection title={t("toolbar.mobileFormat.sections.moreFormatting")}>
      <div className="grid grid-cols-2 gap-2">
        <SheetActionButton
          active={editor.isActive("code")}
          onClick={() => runCommand((currentEditor) => currentEditor.chain().focus().toggleCode().run())}
        >
          <Code className="mr-2 h-4 w-4" />
          {t("toolbar.actions.inlineCode")}
        </SheetActionButton>
        <SheetActionButton
          active={editor.isActive("highlight")}
          onClick={() => runCommand((currentEditor) => currentEditor.chain().focus().toggleHighlight().run())}
        >
          <Highlighter className="mr-2 h-4 w-4" />
          {t("toolbar.actions.highlight")}
        </SheetActionButton>
        <SheetActionButton
          active={editor.isActive("superscript")}
          onClick={() => runCommand((currentEditor) => currentEditor.chain().focus().toggleSuperscript().run())}
        >
          <Superscript className="mr-2 h-4 w-4" />
          {t("toolbar.actions.superscript")}
        </SheetActionButton>
        <SheetActionButton
          active={editor.isActive("subscript")}
          onClick={() => runCommand((currentEditor) => currentEditor.chain().focus().toggleSubscript().run())}
        >
          <Subscript className="mr-2 h-4 w-4" />
          {t("toolbar.actions.subscript")}
        </SheetActionButton>
      </div>
      <SheetActionButton
        active={editor.isActive("blockquote")}
        onClick={() => runCommand((currentEditor) => currentEditor.chain().focus().toggleBlockquote().run())}
      >
        <Quote className="mr-2 h-4 w-4" />
        {t("toolbar.actions.blockquote")}
      </SheetActionButton>
    </SheetSection>
  );
};

const LinkSection = ({
  editor,
  runCommand,
}: {
  editor: Editor;
  runCommand: MobileEditorFormatSheetProps["runCommand"];
}) => {
  const { t } = useI18n();
  const [url, setUrl] = useState(editor.getAttributes("link").href || "");

  return (
    <SheetSection title={t("toolbar.mobileFormat.sections.link")}>
      <div className="space-y-2 rounded-lg border border-border/70 bg-background/80 p-3">
        <Label className="text-xs">{t("toolbar.link.title")}</Label>
        <Input
          className="h-9"
          onChange={(event) => setUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && url) {
              runCommand((currentEditor) =>
                currentEditor.chain().focus().extendMarkRange("link").setLink({ href: url }).run());
            }
          }}
          placeholder="https://..."
          value={url}
        />
        <div className="grid grid-cols-2 gap-2">
          <Button
            disabled={!url}
            onClick={() =>
              runCommand((currentEditor) =>
                currentEditor.chain().focus().extendMarkRange("link").setLink({ href: url }).run())}
            size="sm"
          >
            <Link className="mr-2 h-4 w-4" />
            {t("toolbar.link.apply")}
          </Button>
          <Button
            disabled={!editor.isActive("link")}
            onClick={() => runCommand((currentEditor) => currentEditor.chain().focus().unsetLink().run())}
            size="sm"
            variant="outline"
          >
            <Unlink className="mr-2 h-4 w-4" />
            {t("toolbar.actions.unlink")}
          </Button>
        </div>
      </div>
    </SheetSection>
  );
};

const ColorSection = ({
  editor,
  runCommand,
}: {
  editor: Editor;
  runCommand: MobileEditorFormatSheetProps["runCommand"];
}) => {
  const { t } = useI18n();
  const currentColor = editor.getAttributes("textStyle").color || "inherit";

  return (
    <SheetSection title={t("toolbar.mobileFormat.sections.color")}>
      <div className="rounded-lg border border-border/70 bg-background/80 p-3">
        <AdvancedColorPicker
          currentColor={currentColor}
          onColorSelect={(color) => {
            runCommand((currentEditor) => currentEditor.chain().focus().setColor(color).run());
          }}
          onReset={() => {
            runCommand((currentEditor) => currentEditor.chain().focus().unsetColor().run());
          }}
        />
      </div>
    </SheetSection>
  );
};

const FontFamilySection = ({
  editor,
  runCommand,
}: {
  editor: Editor;
  runCommand: MobileEditorFormatSheetProps["runCommand"];
}) => {
  const { t } = useI18n();
  const currentFont = editor.getAttributes("textStyle").fontFamily || "__default__";
  const categories = [...new Set(FONT_FAMILIES.map((font) => font.category))];

  return (
    <SheetSection title={t("toolbar.mobileFormat.sections.fontFamily")}>
      <div className="space-y-3 rounded-lg border border-border/70 bg-background/80 p-3">
        {categories.map((category) => (
          <div className="space-y-2" key={category}>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {t(`toolbar.fontFamily.categories.${category}`)}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {FONT_FAMILIES.filter((font) => font.category === category).map((font) => {
                const value = font.value || "__default__";

                return (
                  <SheetActionButton
                    active={currentFont === value}
                    key={`${category}-${value}`}
                    onClick={() => {
                      if (value === "__default__") {
                        runCommand((currentEditor) => currentEditor.chain().focus().unsetFontFamily().run());
                        return;
                      }

                      runCommand((currentEditor) => currentEditor.chain().focus().setFontFamily(value).run());
                    }}
                  >
                    <span style={{ fontFamily: font.value || "inherit" }}>
                      {font.value ? font.label : t("toolbar.fontFamily.defaultOption")}
                    </span>
                  </SheetActionButton>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </SheetSection>
  );
};

const FontSizeSection = ({
  editor,
  runCommand,
}: {
  editor: Editor;
  runCommand: MobileEditorFormatSheetProps["runCommand"];
}) => {
  const { t } = useI18n();
  const currentSize = editor.getAttributes("textStyle").fontSize || "";
  const [customSize, setCustomSize] = useState("");

  const applyCustomSize = () => {
    if (!customSize) {
      return;
    }

    const nextValue = customSize.includes("px") ? customSize : `${customSize}px`;
    runCommand((currentEditor) => currentEditor.chain().focus().setFontSize(nextValue).run());
    setCustomSize("");
  };

  return (
    <SheetSection title={t("toolbar.mobileFormat.sections.fontSize")}>
      <div className="space-y-3 rounded-lg border border-border/70 bg-background/80 p-3">
        <div className="grid grid-cols-3 gap-2">
          <SheetActionButton
            active={!currentSize}
            onClick={() => runCommand((currentEditor) => currentEditor.chain().focus().unsetFontSize().run())}
          >
            {t("toolbar.fontSize.defaultOption")}
          </SheetActionButton>
          {FONT_SIZES.map((size) => (
            <SheetActionButton
              active={currentSize === size.value}
              key={size.value}
              onClick={() => runCommand((currentEditor) => currentEditor.chain().focus().setFontSize(size.value).run())}
            >
              {size.label}px
            </SheetActionButton>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            className="h-9"
            onChange={(event) => setCustomSize(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                applyCustomSize();
              }
            }}
            placeholder={t("toolbar.fontSize.customPlaceholder")}
            value={customSize}
          />
          <Button onClick={applyCustomSize} size="sm">
            {t("toolbar.fontSize.apply")}
          </Button>
        </div>
      </div>
    </SheetSection>
  );
};

const ImageSection = ({
  editor,
  runCommand,
}: {
  editor: Editor;
  runCommand: MobileEditorFormatSheetProps["runCommand"];
}) => {
  const { t } = useI18n();
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const insertImage = () => {
    if (!url) {
      return;
    }

    runCommand((currentEditor) =>
      currentEditor.chain().focus().setImage({ src: url, alt: alt || undefined }).run());
    setUrl("");
    setAlt("");
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const base64 = loadEvent.target?.result as string;
      runCommand((currentEditor) =>
        currentEditor.chain().focus().setImage({ src: base64, alt: alt || file.name }).run());
      setAlt("");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  return (
    <SheetSection title={t("toolbar.mobileFormat.sections.image")}>
      <div className="space-y-3 rounded-lg border border-border/70 bg-background/80 p-3">
        <input
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
          ref={fileInputRef}
          type="file"
        />
        <Button onClick={() => fileInputRef.current?.click()} size="sm" variant="outline">
          <Image className="mr-2 h-4 w-4" />
          {t("toolbar.image.selectFile")}
        </Button>
        <div className="space-y-2">
          <Label className="text-xs">{t("toolbar.image.urlLabel")}</Label>
          <Input
            className="h-9"
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                insertImage();
              }
            }}
            placeholder="https://..."
            value={url}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">{t("toolbar.image.altLabel")}</Label>
          <Input
            className="h-9"
            onChange={(event) => setAlt(event.target.value)}
            placeholder={t("toolbar.image.altPlaceholder")}
            value={alt}
          />
        </div>
        <Button disabled={!url} onClick={insertImage} size="sm">
          {t("toolbar.image.insert")}
        </Button>
      </div>
    </SheetSection>
  );
};

const TableSection = ({
  editor,
  runCommand,
}: {
  editor: Editor;
  runCommand: MobileEditorFormatSheetProps["runCommand"];
}) => {
  const { t } = useI18n();
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);

  if (editor.isActive("table")) {
    return (
      <SheetSection title={t("toolbar.mobileFormat.sections.table")}>
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/70 bg-background/80 p-3">
          <SheetActionButton onClick={() => runCommand((currentEditor) => currentEditor.chain().focus().addColumnAfter().run())}>
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            {t("toolbar.table.addColumn")}
          </SheetActionButton>
          <SheetActionButton onClick={() => runCommand((currentEditor) => currentEditor.chain().focus().addRowAfter().run())}>
            <ArrowUpDown className="mr-2 h-4 w-4" />
            {t("toolbar.table.addRow")}
          </SheetActionButton>
          <SheetActionButton onClick={() => runCommand((currentEditor) => currentEditor.chain().focus().deleteColumn().run())}>
            <Trash2 className="mr-2 h-4 w-4" />
            {t("toolbar.table.deleteColumn")}
          </SheetActionButton>
          <SheetActionButton onClick={() => runCommand((currentEditor) => currentEditor.chain().focus().deleteRow().run())}>
            <Trash2 className="mr-2 h-4 w-4" />
            {t("toolbar.table.deleteRow")}
          </SheetActionButton>
          <Button
            className="col-span-2 justify-start"
            onClick={() => runCommand((currentEditor) => currentEditor.chain().focus().deleteTable().run())}
            size="sm"
            variant="destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t("toolbar.table.deleteTable")}
          </Button>
        </div>
      </SheetSection>
    );
  }

  return (
    <SheetSection title={t("toolbar.mobileFormat.sections.table")}>
      <div className="space-y-3 rounded-lg border border-border/70 bg-background/80 p-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label className="text-xs">{t("toolbar.table.rows")}</Label>
            <Input
              className="h-9"
              max={20}
              min={1}
              onChange={(event) => setRows(parseInt(event.target.value, 10) || 1)}
              type="number"
              value={rows}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">{t("toolbar.table.columns")}</Label>
            <Input
              className="h-9"
              max={20}
              min={1}
              onChange={(event) => setCols(parseInt(event.target.value, 10) || 1)}
              type="number"
              value={cols}
            />
          </div>
        </div>
        <Button
          onClick={() =>
            runCommand((currentEditor) =>
              currentEditor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run())}
          size="sm"
        >
          <Table className="mr-2 h-4 w-4" />
          {t("toolbar.table.insertSized", { cols, rows })}
        </Button>
      </div>
    </SheetSection>
  );
};

const AdmonitionSection = ({
  editor,
  runCommand,
}: {
  editor: Editor;
  runCommand: MobileEditorFormatSheetProps["runCommand"];
}) => {
  const { t } = useI18n();
  const items = [
    { label: t("toolbar.admonition.note"), type: "note" },
    { label: t("toolbar.admonition.tip"), type: "tip" },
    { label: t("toolbar.admonition.warning"), type: "warning" },
    { label: t("toolbar.admonition.danger"), type: "danger" },
  ] as const;

  return (
    <SheetSection title={t("toolbar.mobileFormat.sections.admonition")}>
      <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/70 bg-background/80 p-3">
        {items.map((item) => (
          <SheetActionButton
            active={editor.isActive("admonition", { type: item.type })}
            key={item.type}
            onClick={() =>
              runCommand((currentEditor) =>
                (currentEditor.commands as unknown as AdmonitionCommandSet).insertAdmonition({ type: item.type }))}
          >
            <MessageSquareWarning className="mr-2 h-4 w-4" />
            {item.label}
          </SheetActionButton>
        ))}
      </div>
    </SheetSection>
  );
};

const CaptionSection = ({
  editor,
  runCommand,
}: {
  editor: Editor;
  runCommand: MobileEditorFormatSheetProps["runCommand"];
}) => {
  const { t } = useI18n();
  const [captionType, setCaptionType] = useState<"figure" | "table">("figure");
  const [label, setLabel] = useState("");
  const [captionText, setCaptionText] = useState("");

  const insertCaption = () => {
    runCommand((currentEditor) => {
      (currentEditor.commands as unknown as CaptionCommandSet).insertFigureCaption({
        captionText,
        captionType,
        label,
      });
      const position = currentEditor.state.selection.to;
      return currentEditor.chain().focus().insertContentAt(position, { type: "paragraph" }).run();
    });

    setLabel("");
    setCaptionText("");
  };

  return (
    <SheetSection title={t("toolbar.mobileFormat.sections.caption")}>
      <div className="space-y-3 rounded-lg border border-border/70 bg-background/80 p-3">
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => setCaptionType("figure")}
            size="sm"
            variant={captionType === "figure" ? "secondary" : "outline"}
          >
            {t("toolbar.caption.figure")}
          </Button>
          <Button
            onClick={() => setCaptionType("table")}
            size="sm"
            variant={captionType === "table" ? "secondary" : "outline"}
          >
            {t("toolbar.caption.table")}
          </Button>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">{t("toolbar.caption.label")}</Label>
          <Input
            className="h-9"
            onChange={(event) => setLabel(event.target.value)}
            placeholder={t("toolbar.caption.labelPlaceholder")}
            value={label}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">{t("toolbar.caption.text")}</Label>
          <Input
            className="h-9"
            onChange={(event) => setCaptionText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                insertCaption();
              }
            }}
            placeholder={t("toolbar.caption.textPlaceholder")}
            value={captionText}
          />
        </div>
        <Button disabled={!captionText} onClick={insertCaption} size="sm">
          {t("toolbar.caption.insert")}
        </Button>
      </div>
    </SheetSection>
  );
};

const CrossReferenceSection = ({
  editor,
  runCommand,
}: {
  editor: Editor;
  runCommand: MobileEditorFormatSheetProps["runCommand"];
}) => {
  const { t } = useI18n();
  const labels: Array<{ label: string; type: string }> = [];

  editor.state.doc.descendants((node: ProseMirrorNode) => {
    const attrs = node.attrs as { captionType?: string; label?: string };
    if (node.type.name === "figureCaption" && attrs.label) {
      labels.push({ label: attrs.label, type: attrs.captionType || "figure" });
    }
  });

  return (
    <SheetSection title={t("toolbar.mobileFormat.sections.crossReference")}>
      <div className="space-y-2 rounded-lg border border-border/70 bg-background/80 p-3">
        {labels.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("toolbar.crossReference.empty")}</p>
        ) : (
          labels.map((item) => (
            <SheetActionButton
              key={`${item.type}-${item.label}`}
              onClick={() =>
                runCommand((currentEditor) =>
                  (currentEditor.commands as unknown as CrossReferenceCommandSet).insertCrossReference({
                    targetLabel: item.label,
                  }))}
            >
              {item.type === "table" ? t("toolbar.crossReference.table") : t("toolbar.crossReference.figure")}
              {`: ${item.label}`}
            </SheetActionButton>
          ))
        )}
      </div>
    </SheetSection>
  );
};

const DocumentToolsSection = ({
  canEnableDocumentFeatures = false,
  documentFeaturesEnabled = false,
  editor,
  onEnableDocumentFeatures,
  runCommand,
}: {
  canEnableDocumentFeatures?: boolean;
  documentFeaturesEnabled?: boolean;
  editor: Editor;
  onEnableDocumentFeatures?: () => void;
  runCommand: MobileEditorFormatSheetProps["runCommand"];
}) => {
  const { t } = useI18n();

  if (!documentFeaturesEnabled) {
    if (!canEnableDocumentFeatures || !onEnableDocumentFeatures) {
      return null;
    }

    return (
      <SheetSection title={t("toolbar.mobileFormat.sections.documentTools")}>
        <Button className="w-full justify-start" onClick={onEnableDocumentFeatures} size="sm" variant="outline">
          {t("toolbar.actions.enableDocumentTools")}
        </Button>
      </SheetSection>
    );
  }

  return (
    <SheetSection title={t("toolbar.mobileFormat.sections.documentTools")}>
      <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/70 bg-background/80 p-3">
        <SheetActionButton
          active={editor.isActive("codeBlock")}
          onClick={() => runCommand((currentEditor) => currentEditor.chain().focus().toggleCodeBlock().run())}
        >
          <CodeSquare className="mr-2 h-4 w-4" />
          {t("toolbar.actions.codeBlock")}
        </SheetActionButton>
        <SheetActionButton
          onClick={() => runCommand((currentEditor) => currentEditor.chain().focus().setHorizontalRule().run())}
        >
          <Minus className="mr-2 h-4 w-4" />
          {t("toolbar.actions.horizontalRule")}
        </SheetActionButton>
        <SheetActionButton
          onClick={() =>
            runCommand((currentEditor) => {
              currentEditor.commands.focus?.();
              return (currentEditor.commands as unknown as FootnoteCommandSet).insertFootnote();
            })}
        >
          <FootprintsIcon className="mr-2 h-4 w-4" />
          {t("toolbar.actions.footnote")}
        </SheetActionButton>
        <SheetActionButton
          onClick={() =>
            runCommand((currentEditor) => {
              currentEditor.commands.focus?.();
              return (currentEditor.commands as unknown as TocCommandSet).insertTableOfContents();
            })}
        >
          <ListTree className="mr-2 h-4 w-4" />
          {t("toolbar.actions.toc")}
        </SheetActionButton>
      </div>
      <FontFamilySection editor={editor} runCommand={runCommand} />
      <FontSizeSection editor={editor} runCommand={runCommand} />
      <ImageSection editor={editor} runCommand={runCommand} />
      <TableSection editor={editor} runCommand={runCommand} />
      <AdmonitionSection editor={editor} runCommand={runCommand} />
      <CaptionSection editor={editor} runCommand={runCommand} />
      <CrossReferenceSection editor={editor} runCommand={runCommand} />
    </SheetSection>
  );
};

const AdvancedToolsSection = ({
  advancedBlocksEnabled = false,
  canEnableAdvancedBlocks = false,
  editor,
  onEnableAdvancedBlocks,
  runCommand,
}: {
  advancedBlocksEnabled?: boolean;
  canEnableAdvancedBlocks?: boolean;
  editor: Editor;
  onEnableAdvancedBlocks?: () => void;
  runCommand: MobileEditorFormatSheetProps["runCommand"];
}) => {
  const { t } = useI18n();
  const [latex, setLatex] = useState("");
  const [mode, setMode] = useState<"inline" | "block">("inline");

  if (!advancedBlocksEnabled) {
    if (!canEnableAdvancedBlocks || !onEnableAdvancedBlocks) {
      return null;
    }

    return (
      <SheetSection title={t("toolbar.mobileFormat.sections.advancedTools")}>
        <Button className="w-full justify-start" onClick={onEnableAdvancedBlocks} size="sm" variant="outline">
          {t("toolbar.actions.enableAdvancedBlocks")}
        </Button>
      </SheetSection>
    );
  }

  return (
    <SheetSection title={t("toolbar.mobileFormat.sections.advancedTools")}>
      <div className="space-y-3 rounded-lg border border-border/70 bg-background/80 p-3">
        <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {t("toolbar.mobileFormat.sections.math")}
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => setMode("inline")}
            size="sm"
            variant={mode === "inline" ? "secondary" : "outline"}
          >
            {t("toolbar.math.inline")}
          </Button>
          <Button
            onClick={() => setMode("block")}
            size="sm"
            variant={mode === "block" ? "secondary" : "outline"}
          >
            {t("toolbar.math.block")}
          </Button>
        </div>
        <textarea
          className="min-h-[90px] w-full resize-none rounded-md border border-border bg-background px-3 py-2 font-mono text-sm outline-none"
          onChange={(event) => setLatex(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && latex) {
              runCommand((currentEditor) => {
                if (mode === "inline") {
                  return currentEditor.chain().focus().insertContent({
                    attrs: { display: "inline", latex },
                    type: "math",
                  }).run();
                }

                return currentEditor.chain().focus().insertContent({
                  attrs: { display: "block", latex },
                  type: "mathBlock",
                }).run();
              });
              setLatex("");
            }
          }}
          placeholder={mode === "inline" ? t("toolbar.math.inlinePlaceholder") : t("toolbar.math.blockPlaceholder")}
          value={latex}
        />
        {latex && (
          <div className="rounded-md border border-border bg-background p-3">
            <MathRender
              displayMode={mode === "block"}
              latex={latex}
              renderErrorLabel={t("toolbar.math.renderError")}
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button
            disabled={!latex}
            onClick={() => {
              runCommand((currentEditor) => {
                if (mode === "inline") {
                  return currentEditor.chain().focus().insertContent({
                    attrs: { display: "inline", latex },
                    type: "math",
                  }).run();
                }

                return currentEditor.chain().focus().insertContent({
                  attrs: { display: "block", latex },
                  type: "mathBlock",
                }).run();
              });
              setLatex("");
            }}
            size="sm"
          >
            <Sigma className="mr-2 h-4 w-4" />
            {t("toolbar.math.insert")}
          </Button>
          <Button
            onClick={() =>
              runCommand((currentEditor) => {
                currentEditor.commands.focus?.();
                return (currentEditor.commands as unknown as MermaidCommandSet).insertMermaid();
              })}
            size="sm"
            variant="outline"
          >
            <GitBranch className="mr-2 h-4 w-4" />
            {t("toolbar.actions.mermaid")}
          </Button>
        </div>
      </div>
    </SheetSection>
  );
};

const MobileEditorFormatSheet = ({
  advancedBlocksEnabled = false,
  canEnableAdvancedBlocks = false,
  canEnableDocumentFeatures = false,
  documentFeaturesEnabled = false,
  editor,
  onEnableAdvancedBlocks,
  onEnableDocumentFeatures,
  runCommand,
}: MobileEditorFormatSheetProps) => {
  const { t } = useI18n();

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      data-testid="toolbar-mobile-sheet"
    >
      <div
        className="flex-1 overflow-y-auto overscroll-y-contain px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]"
        data-testid="toolbar-mobile-sheet-scroll"
      >
        <Accordion
          className="space-y-3"
          defaultValue={["formatting"]}
          type="multiple"
        >
          <SheetGroup title={t("toolbar.mobileFormat.groups.formatting")} value="formatting">
            <MoreFormattingSection editor={editor} runCommand={runCommand} />
          </SheetGroup>
          <SheetGroup title={t("toolbar.mobileFormat.groups.links")} value="links">
            <LinkSection editor={editor} runCommand={runCommand} />
            <ColorSection editor={editor} runCommand={runCommand} />
          </SheetGroup>
          <SheetGroup title={t("toolbar.mobileFormat.groups.document")} value="document">
            <DocumentToolsSection
              canEnableDocumentFeatures={canEnableDocumentFeatures}
              documentFeaturesEnabled={documentFeaturesEnabled}
              editor={editor}
              onEnableDocumentFeatures={onEnableDocumentFeatures}
              runCommand={runCommand}
            />
          </SheetGroup>
          <SheetGroup title={t("toolbar.mobileFormat.groups.advanced")} value="advanced">
            <AdvancedToolsSection
              advancedBlocksEnabled={advancedBlocksEnabled}
              canEnableAdvancedBlocks={canEnableAdvancedBlocks}
              editor={editor}
              onEnableAdvancedBlocks={onEnableAdvancedBlocks}
              runCommand={runCommand}
            />
          </SheetGroup>
        </Accordion>
        <Separator className="my-4" />
        <p className="pb-1 text-xs text-muted-foreground">
          {t("toolbar.mobileFormat.footer")}
        </p>
      </div>
    </div>
  );
};

export default MobileEditorFormatSheet;
