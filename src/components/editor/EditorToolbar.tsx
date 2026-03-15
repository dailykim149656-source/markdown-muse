import { useCallback, useRef, useState } from "react";
import { Editor } from "@tiptap/react";
import type { LucideIcon } from "lucide-react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  CheckSquare,
  ChevronDown,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  MoreHorizontal,
  Redo,
  Strikethrough,
  Underline,
  Undo,
} from "lucide-react";
import MobileEditorFormatSheet from "./MobileEditorFormatSheet";
import type { EditorCommand, EditorSelectionSnapshot } from "./editorSelectionMemory";
import {
  getRememberedEditorSelection,
  rememberEditorSelection,
  runEditorCommand,
} from "./editorSelectionMemory";
import {
  AlignmentSection,
  CaptionSection,
  ColorSection,
  DocumentUtilitySection,
  FontFamilySection,
  FontSizeSection,
  LinkSection,
  MathInsertSection,
  MermaidInsertSection,
  MoreFormattingSection,
  StructureSection,
} from "./EditorToolbarPanelSections";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import { useI18n } from "@/i18n/useI18n";

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

type DesktopPanelId =
  | "alignment"
  | "caption"
  | "color"
  | "documentTools"
  | "fontFamily"
  | "fontSize"
  | "link"
  | "mathInsert"
  | "mermaidInsert"
  | "moreFormatting"
  | "structure";

type ToolbarInteractionProps = {
  onMouseDown: (event: React.MouseEvent<HTMLElement>) => void;
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onTouchStart: () => void;
};

const DesktopToolbarPanel = ({
  children,
  id,
  label,
  onCaptureSelection,
  scrollable = false,
  toolbarInteractionProps,
  widthClassName = "w-[23rem]",
}: {
  children: React.ReactNode;
  id: DesktopPanelId;
  label: string;
  onCaptureSelection: () => void;
  scrollable?: boolean;
  toolbarInteractionProps: ToolbarInteractionProps;
  widthClassName?: string;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover
      modal={false}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          onCaptureSelection();
        }
      }}
      open={open}
    >
      <PopoverTrigger asChild>
        <Button
          className="h-8 gap-1 whitespace-nowrap px-3 text-xs font-medium"
          data-testid={`toolbar-desktop-panel-${id}`}
          size="sm"
          title={label}
          type="button"
          variant={open ? "secondary" : "ghost"}
          {...toolbarInteractionProps}
        >
          {label}
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn("p-0", widthClassName)}
        data-testid={`toolbar-desktop-panel-content-${id}`}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onOpenAutoFocus={(event) => event.preventDefault()}
        sideOffset={8}
      >
        <div className={cn("space-y-4 p-4", scrollable && "max-h-[min(70vh,42rem)] overflow-y-auto pr-3")}>
          {children}
        </div>
      </PopoverContent>
    </Popover>
  );
};

const DesktopFeatureEnablePanel = ({
  actionLabel,
  onClick,
}: {
  actionLabel: string;
  onClick?: () => void;
}) => (
  <div className="rounded-lg border border-border/70 bg-background/80 p-3">
    <Button
      className="w-full justify-start"
      disabled={!onClick}
      onClick={onClick}
      size="sm"
      type="button"
      variant="outline"
    >
      {actionLabel}
    </Button>
  </div>
);

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
  const [mobileSheetSelection, setMobileSheetSelection] = useState<EditorSelectionSnapshot | null>(null);
  const pendingMobileSheetSelectionRef = useRef<EditorSelectionSnapshot | null>(null);
  const desktopPanelSelectionsRef = useRef<Record<DesktopPanelId, EditorSelectionSnapshot | null>>({
    alignment: null,
    caption: null,
    color: null,
    documentTools: null,
    fontFamily: null,
    fontSize: null,
    link: null,
    mathInsert: null,
    mermaidInsert: null,
    moreFormatting: null,
    structure: null,
  });

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

  const captureDesktopPanelSelection = useCallback(
    (panelId: DesktopPanelId) => {
      desktopPanelSelectionsRef.current[panelId] = captureSelection();
    },
    [captureSelection],
  );

  const runDesktopPanelCommand = useCallback(
    (panelId: DesktopPanelId, command: EditorCommand) => {
      const selection = desktopPanelSelectionsRef.current[panelId] ?? captureSelection();
      desktopPanelSelectionsRef.current[panelId] = selection;
      const result = runEditorCommand(editor, command, {
        preferExpandedSelection: true,
        selection,
      });
      rememberEditorSelection(editor);
      desktopPanelSelectionsRef.current[panelId] = getRememberedEditorSelection(editor, {
        preferExpanded: true,
      });
      return result;
    },
    [captureSelection, editor],
  );

  const createDesktopPanelRunner = useCallback(
    (panelId: DesktopPanelId) => (command: EditorCommand) => runDesktopPanelCommand(panelId, command),
    [runDesktopPanelCommand],
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

  const toolbarInteractionProps: ToolbarInteractionProps = {
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

  const mobileToolbarGroups: ToolbarItem[][] = [
    historyGroup,
    [
      ...quickTextStyleGroup,
      {
        active: editor.isActive("strike"),
        command: (currentEditor) => currentEditor.chain().focus().toggleStrike().run(),
        icon: Strikethrough,
        title: t("toolbar.actions.strike"),
      },
    ],
    structureGroup,
    listGroup,
    alignmentGroup,
  ];

  const desktopQuickActions = [...historyGroup, ...quickTextStyleGroup];

  const renderToolbarButtons = (items: ToolbarItem[], keyPrefix: string) =>
    items.map((item) => (
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
            {mobileToolbarGroups.map((group, groupIndex) => (
              <div className="flex shrink-0 snap-start items-center gap-0.5" key={`mobile-group-${groupIndex}`}>
                {groupIndex > 0 ? <Separator className="mx-1.5 h-5" orientation="vertical" /> : null}
                {renderToolbarButtons(group, `mobile-${groupIndex}`)}
              </div>
            ))}
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
                type="button"
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

      <div className="hidden flex-wrap items-start gap-3 px-3 py-1.5 sm:flex" data-testid="toolbar-desktop">
        <div className="flex items-center gap-0.5" data-testid="toolbar-desktop-quick-actions">
          {renderToolbarButtons(desktopQuickActions, "desktop-quick")}
        </div>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5" data-testid="toolbar-desktop-panels">
          <DesktopToolbarPanel
            id="moreFormatting"
            label={t("toolbar.desktopTriggers.moreFormatting")}
            onCaptureSelection={() => captureDesktopPanelSelection("moreFormatting")}
            toolbarInteractionProps={toolbarInteractionProps}
            widthClassName="w-[20rem]"
          >
            <MoreFormattingSection
              editor={editor}
              layout="desktop"
              runCommand={createDesktopPanelRunner("moreFormatting")}
              showTitle={false}
            />
          </DesktopToolbarPanel>
          <DesktopToolbarPanel
            id="structure"
            label={t("toolbar.desktopTriggers.structure")}
            onCaptureSelection={() => captureDesktopPanelSelection("structure")}
            toolbarInteractionProps={toolbarInteractionProps}
            widthClassName="w-[21rem]"
          >
            <StructureSection
              editor={editor}
              layout="desktop"
              runCommand={createDesktopPanelRunner("structure")}
              showTitle={false}
            />
          </DesktopToolbarPanel>
          <DesktopToolbarPanel
            id="alignment"
            label={t("toolbar.desktopTriggers.alignment")}
            onCaptureSelection={() => captureDesktopPanelSelection("alignment")}
            toolbarInteractionProps={toolbarInteractionProps}
            widthClassName="w-[20rem]"
          >
            <AlignmentSection
              editor={editor}
              layout="desktop"
              runCommand={createDesktopPanelRunner("alignment")}
              showTitle={false}
            />
          </DesktopToolbarPanel>
          <DesktopToolbarPanel
            id="link"
            label={t("toolbar.desktopTriggers.link")}
            onCaptureSelection={() => captureDesktopPanelSelection("link")}
            toolbarInteractionProps={toolbarInteractionProps}
            widthClassName="w-[22rem]"
          >
            <LinkSection
              editor={editor}
              layout="desktop"
              runCommand={createDesktopPanelRunner("link")}
              showTitle={false}
            />
          </DesktopToolbarPanel>
          <DesktopToolbarPanel
            id="color"
            label={t("toolbar.desktopTriggers.color")}
            onCaptureSelection={() => captureDesktopPanelSelection("color")}
            toolbarInteractionProps={toolbarInteractionProps}
            widthClassName="w-[22rem]"
          >
            <ColorSection
              editor={editor}
              layout="desktop"
              runCommand={createDesktopPanelRunner("color")}
              showTitle={false}
            />
          </DesktopToolbarPanel>
          <DesktopToolbarPanel
            id="documentTools"
            label={t("toolbar.desktopTriggers.documentTools")}
            onCaptureSelection={() => captureDesktopPanelSelection("documentTools")}
            scrollable
            toolbarInteractionProps={toolbarInteractionProps}
            widthClassName="w-[24rem]"
          >
            {documentFeaturesEnabled ? (
              <DocumentUtilitySection
                editor={editor}
                layout="desktop"
                runCommand={createDesktopPanelRunner("documentTools")}
                showTitle={false}
              />
            ) : (
              <DesktopFeatureEnablePanel
                actionLabel={t("toolbar.actions.enableDocumentTools")}
                onClick={canEnableDocumentFeatures ? onEnableDocumentFeatures : undefined}
              />
            )}
          </DesktopToolbarPanel>
          <DesktopToolbarPanel
            id="fontFamily"
            label={t("toolbar.desktopTriggers.fontFamily")}
            onCaptureSelection={() => captureDesktopPanelSelection("fontFamily")}
            toolbarInteractionProps={toolbarInteractionProps}
            widthClassName="w-[24rem]"
          >
            {documentFeaturesEnabled ? (
              <FontFamilySection
                editor={editor}
                layout="desktop"
                runCommand={createDesktopPanelRunner("fontFamily")}
                showTitle={false}
              />
            ) : (
              <DesktopFeatureEnablePanel
                actionLabel={t("toolbar.actions.enableDocumentTools")}
                onClick={canEnableDocumentFeatures ? onEnableDocumentFeatures : undefined}
              />
            )}
          </DesktopToolbarPanel>
          <DesktopToolbarPanel
            id="fontSize"
            label={t("toolbar.desktopTriggers.fontSize")}
            onCaptureSelection={() => captureDesktopPanelSelection("fontSize")}
            toolbarInteractionProps={toolbarInteractionProps}
            widthClassName="w-[22rem]"
          >
            {documentFeaturesEnabled ? (
              <FontSizeSection
                editor={editor}
                layout="desktop"
                runCommand={createDesktopPanelRunner("fontSize")}
                showTitle={false}
              />
            ) : (
              <DesktopFeatureEnablePanel
                actionLabel={t("toolbar.actions.enableDocumentTools")}
                onClick={canEnableDocumentFeatures ? onEnableDocumentFeatures : undefined}
              />
            )}
          </DesktopToolbarPanel>
          <DesktopToolbarPanel
            id="caption"
            label={t("toolbar.desktopTriggers.caption")}
            onCaptureSelection={() => captureDesktopPanelSelection("caption")}
            toolbarInteractionProps={toolbarInteractionProps}
            widthClassName="w-[22rem]"
          >
            {documentFeaturesEnabled ? (
              <CaptionSection
                editor={editor}
                layout="desktop"
                runCommand={createDesktopPanelRunner("caption")}
                showTitle={false}
              />
            ) : (
              <DesktopFeatureEnablePanel
                actionLabel={t("toolbar.actions.enableDocumentTools")}
                onClick={canEnableDocumentFeatures ? onEnableDocumentFeatures : undefined}
              />
            )}
          </DesktopToolbarPanel>
          <DesktopToolbarPanel
            id="mathInsert"
            label={t("toolbar.desktopTriggers.mathInsert")}
            onCaptureSelection={() => captureDesktopPanelSelection("mathInsert")}
            toolbarInteractionProps={toolbarInteractionProps}
            widthClassName="w-[22rem]"
          >
            {advancedBlocksEnabled ? (
              <MathInsertSection
                editor={editor}
                layout="desktop"
                runCommand={createDesktopPanelRunner("mathInsert")}
                showTitle={false}
              />
            ) : (
              <DesktopFeatureEnablePanel
                actionLabel={t("toolbar.actions.enableAdvancedBlocks")}
                onClick={canEnableAdvancedBlocks ? onEnableAdvancedBlocks : undefined}
              />
            )}
          </DesktopToolbarPanel>
          <DesktopToolbarPanel
            id="mermaidInsert"
            label={t("toolbar.desktopTriggers.mermaidInsert")}
            onCaptureSelection={() => captureDesktopPanelSelection("mermaidInsert")}
            toolbarInteractionProps={toolbarInteractionProps}
            widthClassName="w-[22rem]"
          >
            {advancedBlocksEnabled ? (
              <MermaidInsertSection
                editor={editor}
                layout="desktop"
                runCommand={createDesktopPanelRunner("mermaidInsert")}
                showTitle={false}
              />
            ) : (
              <DesktopFeatureEnablePanel
                actionLabel={t("toolbar.actions.enableAdvancedBlocks")}
                onClick={canEnableAdvancedBlocks ? onEnableAdvancedBlocks : undefined}
              />
            )}
          </DesktopToolbarPanel>
        </div>
      </div>
    </div>
  );
};

export default EditorToolbar;
