import { Suspense, lazy, useCallback, useRef, useState } from "react";
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
import MobileEditorFormatSheet from "./MobileEditorFormatSheet";
import type {
  EditorCommand,
  EditorSelectionSnapshot,
} from "./editorSelectionMemory";
import {
  getRememberedEditorSelection,
  rememberEditorSelection,
  runEditorCommand,
} from "./editorSelectionMemory";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
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
  active: boolean;
  command: EditorCommand;
  icon: LucideIcon;
  title: string;
};

const LinkDialog = ({
  captureSelection,
  editor,
  runCommand,
  toolbarInteractionProps,
}: {
  captureSelection: () => void;
  editor: Editor;
  runCommand: (command: EditorCommand) => boolean;
  toolbarInteractionProps: {
    onMouseDown: (event: React.MouseEvent<HTMLElement>) => void;
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
    onTouchStart: () => void;
  };
}) => {
  const { t } = useI18n();
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState(false);

  const setLink = () => {
    if (!url) {
      return;
    }

    runCommand((currentEditor) =>
      currentEditor.chain().focus().extendMarkRange("link").setLink({ href: url }).run());
    setUrl("");
    setOpen(false);
  };

  return (
    <Popover
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          captureSelection();
          setUrl(editor.getAttributes("link").href || "");
        }
      }}
      open={open}
    >
      <PopoverTrigger asChild>
        <Toggle
          aria-label={t("toolbar.link.title")}
          className="h-8 w-8 rounded-sm p-0 data-[state=on]:bg-toolbar-active hover:bg-toolbar-active/50"
          pressed={editor.isActive("link")}
          size="sm"
          title={t("toolbar.link.title")}
          {...toolbarInteractionProps}
        >
          <Link className="h-4 w-4" />
        </Toggle>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3">
        <p className="text-sm font-medium">{t("toolbar.link.title")}</p>
        <div className="space-y-2">
          <Label className="text-xs">URL</Label>
          <Input
            className="h-8 text-sm"
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && setLink()}
            placeholder="https://..."
            value={url}
          />
        </div>
        <Button className="h-8 w-full text-sm" onClick={setLink} size="sm">
          {t("toolbar.link.apply")}
        </Button>
      </PopoverContent>
    </Popover>
  );
};

const CoreInsertTools = ({
  captureSelection,
  editor,
  runCommand,
  toolbarInteractionProps,
}: {
  captureSelection: () => void;
  editor: Editor;
  runCommand: (command: EditorCommand) => boolean;
  toolbarInteractionProps: {
    onMouseDown: (event: React.MouseEvent<HTMLElement>) => void;
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
    onTouchStart: () => void;
  };
}) => {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-0.5">
      <LinkDialog
        captureSelection={captureSelection}
        editor={editor}
        runCommand={runCommand}
        toolbarInteractionProps={toolbarInteractionProps}
      />
      {editor.isActive("link") && (
        <Toggle
          aria-label={t("toolbar.actions.unlink")}
          className="h-8 w-8 rounded-sm p-0 hover:bg-toolbar-active/50"
          onPressedChange={() => runCommand((currentEditor) => currentEditor.chain().focus().unsetLink().run())}
          pressed={false}
          size="sm"
          title={t("toolbar.actions.unlink")}
          {...toolbarInteractionProps}
        >
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
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [mobileSheetSelection, setMobileSheetSelection] =
    useState<EditorSelectionSnapshot | null>(null);
  const pendingMobileSheetSelectionRef = useRef<EditorSelectionSnapshot | null>(null);

  const captureSelection = useCallback(() => {
    rememberEditorSelection(editor);
    return getRememberedEditorSelection(editor, { preferExpanded: true });
  }, [editor]);

  const runToolbarCommand = useCallback(
    (command: EditorCommand) => runEditorCommand(editor, command),
    [editor],
  );

  const runMobileSheetCommand = useCallback(
    (command: EditorCommand) => {
      const result = runEditorCommand(editor, command, {
        preferExpandedSelection: true,
        selection: mobileSheetSelection,
      });
      rememberEditorSelection(editor);
      const nextSelection = getRememberedEditorSelection(editor, { preferExpanded: true });
      pendingMobileSheetSelectionRef.current = nextSelection;
      setMobileSheetSelection(nextSelection);
      return result;
    },
    [editor, mobileSheetSelection],
  );

  const handleToolbarMouseDown = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      pendingMobileSheetSelectionRef.current = captureSelection();
      if (event.cancelable) {
        event.preventDefault();
      }
    },
    [captureSelection],
  );

  const handleToolbarPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      pendingMobileSheetSelectionRef.current = captureSelection();
      if (event.pointerType !== "touch" && event.cancelable) {
        event.preventDefault();
      }
    },
    [captureSelection],
  );

  const handleToolbarTouchStart = useCallback(() => {
    pendingMobileSheetSelectionRef.current = captureSelection();
  }, [captureSelection]);

  if (!editor) {
    return null;
  }

  const toolbarInteractionProps = {
    onMouseDown: handleToolbarMouseDown,
    onPointerDown: handleToolbarPointerDown,
    onTouchStart: handleToolbarTouchStart,
  };

  const historyGroup: ToolbarItem[] = [
    {
      active: false,
      command: (currentEditor) => currentEditor.chain().focus().undo().run(),
      icon: Undo,
      title: t("toolbar.actions.undo"),
    },
    {
      active: false,
      command: (currentEditor) => currentEditor.chain().focus().redo().run(),
      icon: Redo,
      title: t("toolbar.actions.redo"),
    },
  ];

  const quickTextStyleGroup: ToolbarItem[] = [
    {
      active: editor.isActive("bold"),
      command: (currentEditor) => currentEditor.chain().focus().toggleBold().run(),
      icon: Bold,
      title: t("toolbar.actions.bold"),
    },
    {
      active: editor.isActive("italic"),
      command: (currentEditor) => currentEditor.chain().focus().toggleItalic().run(),
      icon: Italic,
      title: t("toolbar.actions.italic"),
    },
    {
      active: editor.isActive("underline"),
      command: (currentEditor) => currentEditor.chain().focus().toggleUnderline().run(),
      icon: Underline,
      title: t("toolbar.actions.underline"),
    },
    {
      active: editor.isActive("strike"),
      command: (currentEditor) => currentEditor.chain().focus().toggleStrike().run(),
      icon: Strikethrough,
      title: t("toolbar.actions.strike"),
    },
  ];

  const extendedTextStyleGroup: ToolbarItem[] = [
    {
      active: editor.isActive("code"),
      command: (currentEditor) => currentEditor.chain().focus().toggleCode().run(),
      icon: Code,
      title: t("toolbar.actions.inlineCode"),
    },
    {
      active: editor.isActive("highlight"),
      command: (currentEditor) => currentEditor.chain().focus().toggleHighlight().run(),
      icon: Highlighter,
      title: t("toolbar.actions.highlight"),
    },
    {
      active: editor.isActive("superscript"),
      command: (currentEditor) => currentEditor.chain().focus().toggleSuperscript().run(),
      icon: Superscript,
      title: t("toolbar.actions.superscript"),
    },
    {
      active: editor.isActive("subscript"),
      command: (currentEditor) => currentEditor.chain().focus().toggleSubscript().run(),
      icon: Subscript,
      title: t("toolbar.actions.subscript"),
    },
  ];

  const structureGroup: ToolbarItem[] = [
    {
      active: editor.isActive("heading", { level: 1 }),
      command: (currentEditor) => currentEditor.chain().focus().toggleHeading({ level: 1 }).run(),
      icon: Heading1,
      title: t("toolbar.actions.heading1"),
    },
    {
      active: editor.isActive("heading", { level: 2 }),
      command: (currentEditor) => currentEditor.chain().focus().toggleHeading({ level: 2 }).run(),
      icon: Heading2,
      title: t("toolbar.actions.heading2"),
    },
    {
      active: editor.isActive("heading", { level: 3 }),
      command: (currentEditor) => currentEditor.chain().focus().toggleHeading({ level: 3 }).run(),
      icon: Heading3,
      title: t("toolbar.actions.heading3"),
    },
  ];

  const listGroup: ToolbarItem[] = [
    {
      active: editor.isActive("bulletList"),
      command: (currentEditor) => currentEditor.chain().focus().toggleBulletList().run(),
      icon: List,
      title: t("toolbar.actions.bulletList"),
    },
    {
      active: editor.isActive("orderedList"),
      command: (currentEditor) => currentEditor.chain().focus().toggleOrderedList().run(),
      icon: ListOrdered,
      title: t("toolbar.actions.orderedList"),
    },
    {
      active: editor.isActive("taskList"),
      command: (currentEditor) => currentEditor.chain().focus().toggleTaskList().run(),
      icon: CheckSquare,
      title: t("toolbar.actions.taskList"),
    },
  ];

  const blockquoteGroup: ToolbarItem[] = [
    {
      active: editor.isActive("blockquote"),
      command: (currentEditor) => currentEditor.chain().focus().toggleBlockquote().run(),
      icon: Quote,
      title: t("toolbar.actions.blockquote"),
    },
  ];

  const alignmentGroup: ToolbarItem[] = [
    {
      active: editor.isActive({ textAlign: "left" }),
      command: (currentEditor) => currentEditor.chain().focus().setTextAlign("left").run(),
      icon: AlignLeft,
      title: t("toolbar.actions.alignLeft"),
    },
    {
      active: editor.isActive({ textAlign: "center" }),
      command: (currentEditor) => currentEditor.chain().focus().setTextAlign("center").run(),
      icon: AlignCenter,
      title: t("toolbar.actions.alignCenter"),
    },
    {
      active: editor.isActive({ textAlign: "right" }),
      command: (currentEditor) => currentEditor.chain().focus().setTextAlign("right").run(),
      icon: AlignRight,
      title: t("toolbar.actions.alignRight"),
    },
    {
      active: editor.isActive({ textAlign: "justify" }),
      command: (currentEditor) => currentEditor.chain().focus().setTextAlign("justify").run(),
      icon: AlignJustify,
      title: t("toolbar.actions.alignJustify"),
    },
  ];

  const desktopToolbarGroups: ToolbarItem[][] = [
    historyGroup,
    quickTextStyleGroup,
    extendedTextStyleGroup,
    structureGroup,
    listGroup,
    blockquoteGroup,
    alignmentGroup,
  ];

  const mobileToolbarGroups: ToolbarItem[][] = [
    historyGroup,
    quickTextStyleGroup,
    structureGroup,
    listGroup,
    alignmentGroup,
  ];

  const renderToolbarGroups = (
    keyPrefix: string,
    groups: ToolbarItem[][],
    mobile: boolean,
  ) =>
    groups.map((group, groupIndex) => (
      <div
        className={mobile ? "flex shrink-0 snap-start items-center gap-0.5" : "flex flex-wrap items-center gap-0.5"}
        key={`${keyPrefix}-group-${groupIndex}`}
      >
        {groupIndex > 0 && <Separator className="mx-1.5 h-5" orientation="vertical" />}
        {group.map((item) => (
          <Toggle
            aria-label={item.title}
            className="h-8 w-8 rounded-sm p-0 data-[state=on]:bg-toolbar-active hover:bg-toolbar-active/50"
            key={`${keyPrefix}-${item.title}`}
            onPressedChange={() => runToolbarCommand(item.command)}
            pressed={item.active}
            size="sm"
            title={item.title}
            {...toolbarInteractionProps}
          >
            <item.icon className="h-4 w-4" />
          </Toggle>
        ))}
      </div>
    ));

  return (
    <div className="relative border-b border-toolbar-border bg-toolbar">
      <div className="flex items-center gap-2 px-2 py-1.5 sm:hidden">
        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-[hsl(var(--toolbar-bg))] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-[hsl(var(--toolbar-bg))] to-transparent" />
          <div
            className="scrollbar-thin flex w-full min-w-0 items-center gap-0.5 overflow-x-auto overscroll-x-contain [scroll-snap-type:x_proximity] [scrollbar-width:thin] [touch-action:pan-x] [-webkit-overflow-scrolling:touch]"
            data-testid="toolbar-mobile-scroll"
          >
            {renderToolbarGroups("mobile", mobileToolbarGroups, true)}
          </div>
        </div>
        <div className="shrink-0" data-testid="toolbar-mobile-more">
          <Drawer
            onOpenChange={(nextOpen) => {
              setMobileSheetOpen(nextOpen);
              const nextSelection = nextOpen
                ? pendingMobileSheetSelectionRef.current ?? captureSelection()
                : null;
              pendingMobileSheetSelectionRef.current = nextSelection;
              setMobileSheetSelection(nextSelection);
            }}
            open={mobileSheetOpen}
          >
            <DrawerTrigger asChild>
              <Button
                className="h-8 shrink-0 gap-1 whitespace-nowrap px-2 text-xs font-normal hover:bg-toolbar-active/50"
                size="sm"
                title={t("toolbar.actions.more")}
                variant="ghost"
                {...toolbarInteractionProps}
              >
                <MoreHorizontal className="h-4 w-4" />
                {t("toolbar.actions.more")}
              </Button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[88svh] overflow-hidden rounded-t-2xl border-x-0 border-b-0 px-0 pb-0 pt-0">
              <DrawerHeader className="shrink-0 border-b border-border bg-background px-4 pb-3 pt-5">
                <DrawerTitle>{t("toolbar.mobileFormat.title")}</DrawerTitle>
                <DrawerDescription>{t("toolbar.mobileFormat.description")}</DrawerDescription>
              </DrawerHeader>
              <MobileEditorFormatSheet
                advancedBlocksEnabled={advancedBlocksEnabled}
                canEnableAdvancedBlocks={canEnableAdvancedBlocks}
                canEnableDocumentFeatures={canEnableDocumentFeatures}
                documentFeaturesEnabled={documentFeaturesEnabled}
                editor={editor}
                onEnableAdvancedBlocks={onEnableAdvancedBlocks}
                onEnableDocumentFeatures={onEnableDocumentFeatures}
                runCommand={runMobileSheetCommand}
              />
            </DrawerContent>
          </Drawer>
        </div>
      </div>

      <div className="hidden w-full flex-wrap items-start gap-x-0.5 gap-y-1 overflow-visible px-3 py-1.5 sm:flex">
        {renderToolbarGroups("desktop", desktopToolbarGroups, false)}
        <div className="flex flex-wrap items-center gap-0.5">
          <Separator className="mx-1.5 h-5" orientation="vertical" />
          <CoreInsertTools
            captureSelection={captureSelection}
            editor={editor}
            runCommand={runToolbarCommand}
            toolbarInteractionProps={toolbarInteractionProps}
          />
        </div>
        {documentFeaturesEnabled && (
          <div className="flex flex-wrap items-center gap-0.5">
            <Separator className="mx-1.5 h-5" orientation="vertical" />
            <Suspense fallback={null}>
              <EditorToolbarDocumentTools editor={editor} />
            </Suspense>
          </div>
        )}
        {!documentFeaturesEnabled && canEnableDocumentFeatures && onEnableDocumentFeatures && (
          <div className="flex flex-wrap items-center gap-0.5">
            <Separator className="mx-1.5 h-5" orientation="vertical" />
            <Button
              className="h-8 gap-1 px-2 text-xs font-normal hover:bg-toolbar-active/50"
              onClick={onEnableDocumentFeatures}
              size="sm"
              variant="ghost"
              {...toolbarInteractionProps}
            >
              {t("toolbar.actions.enableDocumentTools")}
            </Button>
          </div>
        )}
        {advancedBlocksEnabled && (
          <div className="flex flex-wrap items-center gap-0.5">
            <Separator className="mx-1.5 h-5" orientation="vertical" />
            <Suspense fallback={null}>
              <EditorToolbarAdvancedTools editor={editor} />
            </Suspense>
          </div>
        )}
        {!advancedBlocksEnabled && canEnableAdvancedBlocks && onEnableAdvancedBlocks && (
          <div className="flex flex-wrap items-center gap-0.5">
            <Separator className="mx-1.5 h-5" orientation="vertical" />
            <Button
              className="h-8 gap-1 px-2 text-xs font-normal hover:bg-toolbar-active/50"
              onClick={onEnableAdvancedBlocks}
              size="sm"
              variant="ghost"
              {...toolbarInteractionProps}
            >
              {t("toolbar.actions.enableAdvancedBlocks")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditorToolbar;
