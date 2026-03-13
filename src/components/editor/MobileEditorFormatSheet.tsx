import type { Editor } from "@tiptap/react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/i18n/useI18n";
import type { EditorCommand } from "./editorSelectionMemory";
import {
  AdvancedToolsSection,
  ColorSection,
  DocumentToolsSection,
  LinkSection,
  MoreFormattingSection,
} from "./EditorToolbarPanelSections";

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
    <div className="flex min-h-0 flex-1 flex-col" data-testid="toolbar-mobile-sheet">
      <div
        className="flex-1 overflow-y-auto overscroll-y-contain px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]"
        data-testid="toolbar-mobile-sheet-scroll"
      >
        <Accordion className="space-y-3" defaultValue={["formatting"]} type="multiple">
          <SheetGroup title={t("toolbar.mobileFormat.groups.formatting")} value="formatting">
            <MoreFormattingSection editor={editor} layout="mobile" runCommand={runCommand} />
          </SheetGroup>
          <SheetGroup title={t("toolbar.mobileFormat.groups.links")} value="links">
            <LinkSection editor={editor} layout="mobile" runCommand={runCommand} />
            <ColorSection editor={editor} layout="mobile" runCommand={runCommand} />
          </SheetGroup>
          <SheetGroup title={t("toolbar.mobileFormat.groups.document")} value="document">
            <DocumentToolsSection
              canEnableDocumentFeatures={canEnableDocumentFeatures}
              documentFeaturesEnabled={documentFeaturesEnabled}
              editor={editor}
              layout="mobile"
              onEnableDocumentFeatures={onEnableDocumentFeatures}
              runCommand={runCommand}
            />
          </SheetGroup>
          <SheetGroup title={t("toolbar.mobileFormat.groups.advanced")} value="advanced">
            <AdvancedToolsSection
              advancedBlocksEnabled={advancedBlocksEnabled}
              canEnableAdvancedBlocks={canEnableAdvancedBlocks}
              editor={editor}
              layout="mobile"
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
