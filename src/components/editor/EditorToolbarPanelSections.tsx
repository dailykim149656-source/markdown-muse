import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { Suspense, lazy, useRef, useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowLeftRight,
  ArrowUpDown,
  CheckSquare,
  Code,
  CodeSquare,
  FootprintsIcon,
  GitBranch,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Image,
  Link as LinkIcon,
  List,
  ListOrdered,
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
import { FONT_FAMILIES, FONT_SIZES } from "./fonts";
import type { EditorCommand } from "./editorSelectionMemory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/useI18n";
import { cn } from "@/lib/utils";

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

export type ToolbarSectionLayout = "desktop" | "mobile";

interface ToolbarSectionProps {
  editor: Editor;
  layout?: ToolbarSectionLayout;
  runCommand: (command: EditorCommand) => boolean;
  showTitle?: boolean;
}

interface ToolbarFeatureSectionProps extends ToolbarSectionProps {
  advancedBlocksEnabled?: boolean;
  canEnableAdvancedBlocks?: boolean;
  canEnableDocumentFeatures?: boolean;
  documentFeaturesEnabled?: boolean;
  onEnableAdvancedBlocks?: () => void;
  onEnableDocumentFeatures?: () => void;
}

const sectionSurfaceClassName = "rounded-lg border border-border/70 bg-background/80 p-3";
const MathRender = lazy(() => import("./MathRender"));

const ToolbarSection = ({
  children,
  layout = "mobile",
  showTitle = true,
  title,
}: {
  children: React.ReactNode;
  layout?: ToolbarSectionLayout;
  showTitle?: boolean;
  title: string;
}) => (
  <section className={cn("space-y-2", layout === "desktop" && "space-y-3")}>
    {showTitle ? (
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </h3>
    ) : null}
    {children}
  </section>
);

const ToolbarActionButton = ({
  active = false,
  children,
  className,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  className?: string;
  onClick: () => void;
}) => (
  <Button
    className={cn("justify-start", className)}
    onClick={onClick}
    size="sm"
    type="button"
    variant={active ? "secondary" : "outline"}
  >
    {children}
  </Button>
);

export const MoreFormattingSection = ({
  editor,
  layout = "mobile",
  runCommand,
  showTitle = true,
}: ToolbarSectionProps) => {
  const { t } = useI18n();

  return (
    <ToolbarSection
      layout={layout}
      showTitle={showTitle}
      title={t("toolbar.mobileFormat.sections.moreFormatting")}
    >
      <div className={cn("grid grid-cols-2 gap-2", sectionSurfaceClassName)}>
        <ToolbarActionButton
          active={editor.isActive("strike")}
          onClick={() => runCommand((currentEditor) => currentEditor.chain().focus().toggleStrike().run())}
        >
          <Minus className="mr-2 h-4 w-4" />
          {t("toolbar.actions.strike")}
        </ToolbarActionButton>
        <ToolbarActionButton
          active={editor.isActive("code")}
          onClick={() => runCommand((currentEditor) => currentEditor.chain().focus().toggleCode().run())}
        >
          <Code className="mr-2 h-4 w-4" />
          {t("toolbar.actions.inlineCode")}
        </ToolbarActionButton>
        <ToolbarActionButton
          active={editor.isActive("highlight")}
          onClick={() => runCommand((currentEditor) => currentEditor.chain().focus().toggleHighlight().run())}
        >
          <Highlighter className="mr-2 h-4 w-4" />
          {t("toolbar.actions.highlight")}
        </ToolbarActionButton>
        <ToolbarActionButton
          active={editor.isActive("superscript")}
          onClick={() => runCommand((currentEditor) => currentEditor.chain().focus().toggleSuperscript().run())}
        >
          <Superscript className="mr-2 h-4 w-4" />
          {t("toolbar.actions.superscript")}
        </ToolbarActionButton>
        <ToolbarActionButton
          active={editor.isActive("subscript")}
          onClick={() => runCommand((currentEditor) => currentEditor.chain().focus().toggleSubscript().run())}
        >
          <Subscript className="mr-2 h-4 w-4" />
          {t("toolbar.actions.subscript")}
        </ToolbarActionButton>
      </div>
    </ToolbarSection>
  );
};

export const StructureSection = ({
  editor,
  layout = "mobile",
  runCommand,
  showTitle = true,
}: ToolbarSectionProps) => {
  const { t } = useI18n();

  return (
    <ToolbarSection
      layout={layout}
      showTitle={showTitle}
      title={t("toolbar.mobileFormat.sections.structure")}
    >
      <div className={cn("grid grid-cols-2 gap-2", sectionSurfaceClassName)}>
        <ToolbarActionButton
          active={editor.isActive("heading", { level: 1 })}
          onClick={() =>
            runCommand((currentEditor) => currentEditor.chain().focus().toggleHeading({ level: 1 }).run())
          }
        >
          <Heading1 className="mr-2 h-4 w-4" />
          {t("toolbar.actions.heading1")}
        </ToolbarActionButton>
        <ToolbarActionButton
          active={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            runCommand((currentEditor) => currentEditor.chain().focus().toggleHeading({ level: 2 }).run())
          }
        >
          <Heading2 className="mr-2 h-4 w-4" />
          {t("toolbar.actions.heading2")}
        </ToolbarActionButton>
        <ToolbarActionButton
          active={editor.isActive("heading", { level: 3 })}
          onClick={() =>
            runCommand((currentEditor) => currentEditor.chain().focus().toggleHeading({ level: 3 }).run())
          }
        >
          <Heading3 className="mr-2 h-4 w-4" />
          {t("toolbar.actions.heading3")}
        </ToolbarActionButton>
        <ToolbarActionButton
          active={editor.isActive("bulletList")}
          onClick={() => runCommand((currentEditor) => currentEditor.chain().focus().toggleBulletList().run())}
        >
          <List className="mr-2 h-4 w-4" />
          {t("toolbar.actions.bulletList")}
        </ToolbarActionButton>
        <ToolbarActionButton
          active={editor.isActive("orderedList")}
          onClick={() => runCommand((currentEditor) => currentEditor.chain().focus().toggleOrderedList().run())}
        >
          <ListOrdered className="mr-2 h-4 w-4" />
          {t("toolbar.actions.orderedList")}
        </ToolbarActionButton>
        <ToolbarActionButton
          active={editor.isActive("taskList")}
          onClick={() => runCommand((currentEditor) => currentEditor.chain().focus().toggleTaskList().run())}
        >
          <CheckSquare className="mr-2 h-4 w-4" />
          {t("toolbar.actions.taskList")}
        </ToolbarActionButton>
        <ToolbarActionButton
          active={editor.isActive("blockquote")}
          className="col-span-2"
          onClick={() => runCommand((currentEditor) => currentEditor.chain().focus().toggleBlockquote().run())}
        >
          <Quote className="mr-2 h-4 w-4" />
          {t("toolbar.actions.blockquote")}
        </ToolbarActionButton>
      </div>
    </ToolbarSection>
  );
};

export const AlignmentSection = ({
  editor,
  layout = "mobile",
  runCommand,
  showTitle = true,
}: ToolbarSectionProps) => {
  const { t } = useI18n();

  return (
    <ToolbarSection
      layout={layout}
      showTitle={showTitle}
      title={t("toolbar.mobileFormat.sections.alignment")}
    >
      <div className={cn("grid grid-cols-2 gap-2", sectionSurfaceClassName)}>
        <ToolbarActionButton
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => runCommand((currentEditor) => currentEditor.chain().focus().setTextAlign("left").run())}
        >
          <AlignLeft className="mr-2 h-4 w-4" />
          {t("toolbar.actions.alignLeft")}
        </ToolbarActionButton>
        <ToolbarActionButton
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => runCommand((currentEditor) => currentEditor.chain().focus().setTextAlign("center").run())}
        >
          <AlignCenter className="mr-2 h-4 w-4" />
          {t("toolbar.actions.alignCenter")}
        </ToolbarActionButton>
        <ToolbarActionButton
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => runCommand((currentEditor) => currentEditor.chain().focus().setTextAlign("right").run())}
        >
          <AlignRight className="mr-2 h-4 w-4" />
          {t("toolbar.actions.alignRight")}
        </ToolbarActionButton>
        <ToolbarActionButton
          active={editor.isActive({ textAlign: "justify" })}
          onClick={() => runCommand((currentEditor) => currentEditor.chain().focus().setTextAlign("justify").run())}
        >
          <AlignJustify className="mr-2 h-4 w-4" />
          {t("toolbar.actions.alignJustify")}
        </ToolbarActionButton>
      </div>
    </ToolbarSection>
  );
};

export const LinkSection = ({
  editor,
  layout = "mobile",
  runCommand,
  showTitle = true,
}: ToolbarSectionProps) => {
  const { t } = useI18n();
  const [url, setUrl] = useState(editor.getAttributes("link").href || "");

  return (
    <ToolbarSection layout={layout} showTitle={showTitle} title={t("toolbar.mobileFormat.sections.link")}>
      <div className={cn("space-y-2", sectionSurfaceClassName)}>
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
                currentEditor.chain().focus().extendMarkRange("link").setLink({ href: url }).run())
            }
            size="sm"
            type="button"
          >
            <LinkIcon className="mr-2 h-4 w-4" />
            {t("toolbar.link.apply")}
          </Button>
          <Button
            disabled={!editor.isActive("link")}
            onClick={() => runCommand((currentEditor) => currentEditor.chain().focus().unsetLink().run())}
            size="sm"
            type="button"
            variant="outline"
          >
            <Unlink className="mr-2 h-4 w-4" />
            {t("toolbar.actions.unlink")}
          </Button>
        </div>
      </div>
    </ToolbarSection>
  );
};

export const ColorSection = ({
  editor,
  layout = "mobile",
  runCommand,
  showTitle = true,
}: ToolbarSectionProps) => {
  const { t } = useI18n();
  const currentColor = editor.getAttributes("textStyle").color || "inherit";

  return (
    <ToolbarSection layout={layout} showTitle={showTitle} title={t("toolbar.mobileFormat.sections.color")}>
      <div className={sectionSurfaceClassName}>
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
    </ToolbarSection>
  );
};

export const FontFamilySection = ({
  editor,
  layout = "mobile",
  runCommand,
  showTitle = true,
}: ToolbarSectionProps) => {
  const { t } = useI18n();
  const currentFont = editor.getAttributes("textStyle").fontFamily || "__default__";
  const categories = [...new Set(FONT_FAMILIES.map((font) => font.category))];

  return (
    <ToolbarSection
      layout={layout}
      showTitle={showTitle}
      title={t("toolbar.mobileFormat.sections.fontFamily")}
    >
      <div className={cn("space-y-3", sectionSurfaceClassName)}>
        {categories.map((category) => (
          <div className="space-y-2" key={category}>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {t(`toolbar.fontFamily.categories.${category}`)}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {FONT_FAMILIES.filter((font) => font.category === category).map((font) => {
                const value = font.value || "__default__";

                return (
                  <ToolbarActionButton
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
                  </ToolbarActionButton>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </ToolbarSection>
  );
};

export const FontSizeSection = ({
  editor,
  layout = "mobile",
  runCommand,
  showTitle = true,
}: ToolbarSectionProps) => {
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
    <ToolbarSection
      layout={layout}
      showTitle={showTitle}
      title={t("toolbar.mobileFormat.sections.fontSize")}
    >
      <div className={cn("space-y-3", sectionSurfaceClassName)}>
        <div className="grid grid-cols-3 gap-2">
          <ToolbarActionButton
            active={!currentSize}
            onClick={() => runCommand((currentEditor) => currentEditor.chain().focus().unsetFontSize().run())}
          >
            {t("toolbar.fontSize.defaultOption")}
          </ToolbarActionButton>
          {FONT_SIZES.map((size) => (
            <ToolbarActionButton
              active={currentSize === size.value}
              key={size.value}
              onClick={() => runCommand((currentEditor) => currentEditor.chain().focus().setFontSize(size.value).run())}
            >
              {size.label}px
            </ToolbarActionButton>
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
          <Button onClick={applyCustomSize} size="sm" type="button">
            {t("toolbar.fontSize.apply")}
          </Button>
        </div>
      </div>
    </ToolbarSection>
  );
};

export const ImageSection = ({
  editor,
  layout = "mobile",
  runCommand,
  showTitle = true,
}: ToolbarSectionProps) => {
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
    <ToolbarSection layout={layout} showTitle={showTitle} title={t("toolbar.mobileFormat.sections.image")}>
      <div className={cn("space-y-3", sectionSurfaceClassName)}>
        <input
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
          ref={fileInputRef}
          type="file"
        />
        <Button onClick={() => fileInputRef.current?.click()} size="sm" type="button" variant="outline">
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
        <Button disabled={!url} onClick={insertImage} size="sm" type="button">
          {t("toolbar.image.insert")}
        </Button>
      </div>
    </ToolbarSection>
  );
};

export const TableSection = ({
  editor,
  layout = "mobile",
  runCommand,
  showTitle = true,
}: ToolbarSectionProps) => {
  const { t } = useI18n();
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);

  if (editor.isActive("table")) {
    return (
      <ToolbarSection layout={layout} showTitle={showTitle} title={t("toolbar.mobileFormat.sections.table")}>
        <div className={cn("grid grid-cols-2 gap-2", sectionSurfaceClassName)}>
          <ToolbarActionButton
            onClick={() => runCommand((currentEditor) => currentEditor.chain().focus().addColumnAfter().run())}
          >
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            {t("toolbar.table.addColumn")}
          </ToolbarActionButton>
          <ToolbarActionButton
            onClick={() => runCommand((currentEditor) => currentEditor.chain().focus().addRowAfter().run())}
          >
            <ArrowUpDown className="mr-2 h-4 w-4" />
            {t("toolbar.table.addRow")}
          </ToolbarActionButton>
          <ToolbarActionButton
            onClick={() => runCommand((currentEditor) => currentEditor.chain().focus().deleteColumn().run())}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t("toolbar.table.deleteColumn")}
          </ToolbarActionButton>
          <ToolbarActionButton
            onClick={() => runCommand((currentEditor) => currentEditor.chain().focus().deleteRow().run())}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t("toolbar.table.deleteRow")}
          </ToolbarActionButton>
          <Button
            className="col-span-2 justify-start"
            onClick={() => runCommand((currentEditor) => currentEditor.chain().focus().deleteTable().run())}
            size="sm"
            type="button"
            variant="destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t("toolbar.table.deleteTable")}
          </Button>
        </div>
      </ToolbarSection>
    );
  }

  return (
    <ToolbarSection layout={layout} showTitle={showTitle} title={t("toolbar.mobileFormat.sections.table")}>
      <div className={cn("space-y-3", sectionSurfaceClassName)}>
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
              currentEditor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run())
          }
          size="sm"
          type="button"
        >
          <Table className="mr-2 h-4 w-4" />
          {t("toolbar.table.insertSized", { cols, rows })}
        </Button>
      </div>
    </ToolbarSection>
  );
};

export const AdmonitionSection = ({
  editor,
  layout = "mobile",
  runCommand,
  showTitle = true,
}: ToolbarSectionProps) => {
  const { t } = useI18n();
  const items = [
    { label: t("toolbar.admonition.note"), type: "note" },
    { label: t("toolbar.admonition.tip"), type: "tip" },
    { label: t("toolbar.admonition.warning"), type: "warning" },
    { label: t("toolbar.admonition.danger"), type: "danger" },
  ] as const;

  return (
    <ToolbarSection
      layout={layout}
      showTitle={showTitle}
      title={t("toolbar.mobileFormat.sections.admonition")}
    >
      <div className={cn("grid grid-cols-2 gap-2", sectionSurfaceClassName)}>
        {items.map((item) => (
          <ToolbarActionButton
            active={editor.isActive("admonition", { type: item.type })}
            key={item.type}
            onClick={() =>
              runCommand((currentEditor) =>
                (currentEditor.commands as unknown as AdmonitionCommandSet).insertAdmonition({ type: item.type }))
            }
          >
            <MessageSquareWarning className="mr-2 h-4 w-4" />
            {item.label}
          </ToolbarActionButton>
        ))}
      </div>
    </ToolbarSection>
  );
};

export const CaptionSection = ({
  editor,
  layout = "mobile",
  runCommand,
  showTitle = true,
}: ToolbarSectionProps) => {
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
    <ToolbarSection
      layout={layout}
      showTitle={showTitle}
      title={t("toolbar.mobileFormat.sections.caption")}
    >
      <div className={cn("space-y-3", sectionSurfaceClassName)}>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => setCaptionType("figure")}
            size="sm"
            type="button"
            variant={captionType === "figure" ? "secondary" : "outline"}
          >
            {t("toolbar.caption.figure")}
          </Button>
          <Button
            onClick={() => setCaptionType("table")}
            size="sm"
            type="button"
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
        <Button disabled={!captionText} onClick={insertCaption} size="sm" type="button">
          {t("toolbar.caption.insert")}
        </Button>
      </div>
    </ToolbarSection>
  );
};

export const CrossReferenceSection = ({
  editor,
  layout = "mobile",
  runCommand,
  showTitle = true,
}: ToolbarSectionProps) => {
  const { t } = useI18n();
  const labels: Array<{ label: string; type: string }> = [];

  editor.state.doc.descendants((node: ProseMirrorNode) => {
    const attrs = node.attrs as { captionType?: string; label?: string };
    if (node.type.name === "figureCaption" && attrs.label) {
      labels.push({ label: attrs.label, type: attrs.captionType || "figure" });
    }
  });

  return (
    <ToolbarSection
      layout={layout}
      showTitle={showTitle}
      title={t("toolbar.mobileFormat.sections.crossReference")}
    >
      <div className={cn("space-y-2", sectionSurfaceClassName)}>
        {labels.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("toolbar.crossReference.empty")}</p>
        ) : (
          labels.map((item) => (
            <ToolbarActionButton
              key={`${item.type}-${item.label}`}
              onClick={() =>
                runCommand((currentEditor) =>
                  (currentEditor.commands as unknown as CrossReferenceCommandSet).insertCrossReference({
                    targetLabel: item.label,
                  }))
              }
            >
              {item.type === "table" ? t("toolbar.crossReference.table") : t("toolbar.crossReference.figure")}
              {`: ${item.label}`}
            </ToolbarActionButton>
          ))
        )}
      </div>
    </ToolbarSection>
  );
};

export const DocumentUtilitySection = ({
  editor,
  layout = "mobile",
  runCommand,
  showTitle = true,
}: ToolbarSectionProps) => {
  const { t } = useI18n();

  return (
    <ToolbarSection
      layout={layout}
      showTitle={showTitle}
      title={t("toolbar.mobileFormat.sections.documentTools")}
    >
      <div className={cn("grid grid-cols-2 gap-2", sectionSurfaceClassName)}>
        <ToolbarActionButton
          active={editor.isActive("codeBlock")}
          onClick={() => runCommand((currentEditor) => currentEditor.chain().focus().toggleCodeBlock().run())}
        >
          <CodeSquare className="mr-2 h-4 w-4" />
          {t("toolbar.actions.codeBlock")}
        </ToolbarActionButton>
        <ToolbarActionButton
          onClick={() => runCommand((currentEditor) => currentEditor.chain().focus().setHorizontalRule().run())}
        >
          <Minus className="mr-2 h-4 w-4" />
          {t("toolbar.actions.horizontalRule")}
        </ToolbarActionButton>
        <ToolbarActionButton
          onClick={() =>
            runCommand((currentEditor) => {
              currentEditor.commands.focus?.();
              return (currentEditor.commands as unknown as FootnoteCommandSet).insertFootnote();
            })
          }
        >
          <FootprintsIcon className="mr-2 h-4 w-4" />
          {t("toolbar.actions.footnote")}
        </ToolbarActionButton>
        <ToolbarActionButton
          onClick={() =>
            runCommand((currentEditor) => {
              currentEditor.commands.focus?.();
              return (currentEditor.commands as unknown as TocCommandSet).insertTableOfContents();
            })
          }
        >
          <ListTree className="mr-2 h-4 w-4" />
          {t("toolbar.actions.toc")}
        </ToolbarActionButton>
      </div>
      <ImageSection editor={editor} layout={layout} runCommand={runCommand} />
      <TableSection editor={editor} layout={layout} runCommand={runCommand} />
      <AdmonitionSection editor={editor} layout={layout} runCommand={runCommand} />
      <CrossReferenceSection editor={editor} layout={layout} runCommand={runCommand} />
    </ToolbarSection>
  );
};

export const MathInsertSection = ({
  editor,
  layout = "mobile",
  runCommand,
  showTitle = true,
}: ToolbarSectionProps) => {
  const { t } = useI18n();
  const [latex, setLatex] = useState("");
  const [mode, setMode] = useState<"inline" | "block">("inline");

  return (
    <ToolbarSection
      layout={layout}
      showTitle={showTitle}
      title={t("toolbar.mobileFormat.sections.math")}
    >
      <div className={cn("space-y-3", sectionSurfaceClassName)}>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => setMode("inline")}
            size="sm"
            type="button"
            variant={mode === "inline" ? "secondary" : "outline"}
          >
            {t("toolbar.math.inline")}
          </Button>
          <Button
            onClick={() => setMode("block")}
            size="sm"
            type="button"
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
        {latex ? (
          <div className="rounded-md border border-border bg-background p-3">
            <Suspense fallback={<span className="font-mono text-sm text-muted-foreground/80">{latex}</span>}>
              <MathRender
                displayMode={mode === "block"}
                latex={latex}
                renderErrorLabel={t("toolbar.math.renderError")}
              />
            </Suspense>
          </div>
        ) : null}
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
          type="button"
        >
          <Sigma className="mr-2 h-4 w-4" />
          {t("toolbar.math.insert")}
        </Button>
      </div>
    </ToolbarSection>
  );
};

export const MermaidInsertSection = ({
  editor,
  layout = "mobile",
  runCommand,
  showTitle = true,
}: ToolbarSectionProps) => {
  const { t } = useI18n();

  return (
    <ToolbarSection
      layout={layout}
      showTitle={showTitle}
      title={t("toolbar.desktopTriggers.mermaidInsert")}
    >
      <div className={sectionSurfaceClassName}>
        <Button
          className="w-full justify-start"
          onClick={() =>
            runCommand((currentEditor) => {
              currentEditor.commands.focus?.();
              return (currentEditor.commands as unknown as MermaidCommandSet).insertMermaid();
            })
          }
          size="sm"
          type="button"
          variant="outline"
        >
          <GitBranch className="mr-2 h-4 w-4" />
          {t("toolbar.actions.mermaid")}
        </Button>
      </div>
    </ToolbarSection>
  );
};

export const DocumentToolsSection = ({
  canEnableDocumentFeatures = false,
  documentFeaturesEnabled = false,
  editor,
  layout = "mobile",
  onEnableDocumentFeatures,
  runCommand,
  showTitle = true,
}: ToolbarFeatureSectionProps) => {
  const { t } = useI18n();

  if (!documentFeaturesEnabled) {
    if (!canEnableDocumentFeatures || !onEnableDocumentFeatures) {
      return null;
    }

    return (
      <ToolbarSection
        layout={layout}
        showTitle={showTitle}
        title={t("toolbar.mobileFormat.sections.documentTools")}
      >
        <Button
          className="w-full justify-start"
          onClick={onEnableDocumentFeatures}
          size="sm"
          type="button"
          variant="outline"
        >
          {t("toolbar.actions.enableDocumentTools")}
        </Button>
      </ToolbarSection>
    );
  }

  return (
    <ToolbarSection
      layout={layout}
      showTitle={showTitle}
      title={t("toolbar.mobileFormat.sections.documentTools")}
    >
      <DocumentUtilitySection editor={editor} layout={layout} runCommand={runCommand} showTitle={false} />
      <FontFamilySection editor={editor} layout={layout} runCommand={runCommand} />
      <FontSizeSection editor={editor} layout={layout} runCommand={runCommand} />
      <CaptionSection editor={editor} layout={layout} runCommand={runCommand} />
    </ToolbarSection>
  );
};

export const AdvancedToolsSection = ({
  advancedBlocksEnabled = false,
  canEnableAdvancedBlocks = false,
  editor,
  layout = "mobile",
  onEnableAdvancedBlocks,
  runCommand,
  showTitle = true,
}: ToolbarFeatureSectionProps) => {
  const { t } = useI18n();

  if (!advancedBlocksEnabled) {
    if (!canEnableAdvancedBlocks || !onEnableAdvancedBlocks) {
      return null;
    }

    return (
      <ToolbarSection
        layout={layout}
        showTitle={showTitle}
        title={t("toolbar.mobileFormat.sections.advancedTools")}
      >
        <Button
          className="w-full justify-start"
          onClick={onEnableAdvancedBlocks}
          size="sm"
          type="button"
          variant="outline"
        >
          {t("toolbar.actions.enableAdvancedBlocks")}
        </Button>
      </ToolbarSection>
    );
  }

  return (
    <ToolbarSection
      layout={layout}
      showTitle={showTitle}
      title={t("toolbar.mobileFormat.sections.advancedTools")}
    >
      <MathInsertSection
        editor={editor}
        layout={layout}
        runCommand={runCommand}
        showTitle={layout === "mobile"}
      />
      <MermaidInsertSection
        editor={editor}
        layout={layout}
        runCommand={runCommand}
        showTitle={layout === "mobile"}
      />
    </ToolbarSection>
  );
};
