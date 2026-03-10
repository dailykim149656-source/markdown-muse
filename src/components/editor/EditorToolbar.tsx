import { Suspense, lazy, useState } from "react";
import { Editor } from "@tiptap/react";
import type { LucideIcon } from "lucide-react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  CheckSquare,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  Link,
  List,
  ListOrdered,
  MoreHorizontal,
  Quote,
  Redo,
  Strikethrough,
  Subscript,
  Superscript,
  Underline,
  Undo,
  Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import { useI18n } from "@/i18n/useI18n";

const EditorToolbarDocumentTools = lazy(() => import("./EditorToolbarDocumentTools"));
const EditorToolbarAdvancedTools = lazy(() => import("./EditorToolbarAdvancedTools"));

interface EditorToolbarProps {
  advancedBlocksEnabled?: boolean;
  canEnableAdvancedBlocks?: boolean;
  canEnableDocumentFeatures?: boolean;
  documentFeaturesEnabled?: boolean;
  editor: Editor | null;
  onEnableAdvancedBlocks?: () => void;
  onEnableDocumentFeatures?: () => void;
}

type ToolbarItem = {
  action: () => void;
  active: boolean;
  icon: LucideIcon;
  title: string;
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

const CoreInsertTools = ({ editor }: { editor: Editor }) => {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-0.5">
      <LinkDialog editor={editor} />
      {editor.isActive("link") && (
        <Toggle className="h-8 w-8 rounded-sm p-0 hover:bg-toolbar-active/50" onPressedChange={() => editor.chain().focus().unsetLink().run()} pressed={false} size="sm" title={t("toolbar.actions.unlink")}>
          <Unlink className="h-4 w-4" />
        </Toggle>
      )}
    </div>
  );
};

const EditorToolbar = ({
  advancedBlocksEnabled = false,
  canEnableAdvancedBlocks = false,
  canEnableDocumentFeatures = false,
  documentFeaturesEnabled = false,
  editor,
  onEnableAdvancedBlocks,
  onEnableDocumentFeatures,
}: EditorToolbarProps) => {
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
          <CoreInsertTools editor={editor} />
        </div>
        {documentFeaturesEnabled && (
          <div className="hidden shrink-0 snap-start items-center gap-0.5 sm:flex">
            <Separator className="mx-1.5 h-5" orientation="vertical" />
            <Suspense fallback={null}>
              <EditorToolbarDocumentTools editor={editor} />
            </Suspense>
          </div>
        )}
        {!documentFeaturesEnabled && canEnableDocumentFeatures && onEnableDocumentFeatures && (
          <div className="hidden shrink-0 snap-start items-center gap-0.5 sm:flex">
            <Separator className="mx-1.5 h-5" orientation="vertical" />
            <Button className="h-8 gap-1 px-2 text-xs font-normal hover:bg-toolbar-active/50" onClick={onEnableDocumentFeatures} size="sm" variant="ghost">
              {t("toolbar.actions.enableDocumentTools")}
            </Button>
          </div>
        )}
        {advancedBlocksEnabled && (
          <div className="hidden shrink-0 snap-start items-center gap-0.5 sm:flex">
            <Separator className="mx-1.5 h-5" orientation="vertical" />
            <Suspense fallback={null}>
              <EditorToolbarAdvancedTools editor={editor} />
            </Suspense>
          </div>
        )}
        {!advancedBlocksEnabled && canEnableAdvancedBlocks && onEnableAdvancedBlocks && (
          <div className="hidden shrink-0 snap-start items-center gap-0.5 sm:flex">
            <Separator className="mx-1.5 h-5" orientation="vertical" />
            <Button className="h-8 gap-1 px-2 text-xs font-normal hover:bg-toolbar-active/50" onClick={onEnableAdvancedBlocks} size="sm" variant="ghost">
              {t("toolbar.actions.enableAdvancedBlocks")}
            </Button>
          </div>
        )}
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
              <div className="space-y-3 px-4 pb-5">
                <CoreInsertTools editor={editor} />
                {!documentFeaturesEnabled && canEnableDocumentFeatures && onEnableDocumentFeatures && (
                  <Button className="w-full justify-start" onClick={onEnableDocumentFeatures} size="sm" variant="outline">
                    {t("toolbar.actions.enableDocumentTools")}
                  </Button>
                )}
                {documentFeaturesEnabled && (
                  <Suspense fallback={null}>
                    <EditorToolbarDocumentTools editor={editor} mobile />
                  </Suspense>
                )}
                {!advancedBlocksEnabled && canEnableAdvancedBlocks && onEnableAdvancedBlocks && (
                  <Button className="w-full justify-start" onClick={onEnableAdvancedBlocks} size="sm" variant="outline">
                    {t("toolbar.actions.enableAdvancedBlocks")}
                  </Button>
                )}
                {advancedBlocksEnabled && (
                  <Suspense fallback={null}>
                    <EditorToolbarAdvancedTools editor={editor} mobile />
                  </Suspense>
                )}
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
    </div>
  );
};

export default EditorToolbar;
