import type { ChangeEventHandler, ComponentProps, ReactNode, RefObject } from "react";
import type { EditorMode } from "@/types/document";
import AiAssistantDialog from "@/components/editor/AiAssistantDialog";
import EditorHeader from "@/components/editor/EditorHeader";
import FindReplaceBar from "@/components/editor/FindReplaceBar";
import KeyboardShortcutsModal from "@/components/editor/KeyboardShortcutsModal";
import DocumentTabs from "@/components/editor/DocumentTabs";
import FileSidebar from "@/components/editor/FileSidebar";
import ExportPreviewPanel from "@/components/editor/ExportPreviewPanel";
import PatchReviewDialog from "@/components/editor/PatchReviewDialog";
import TemplateDialog from "@/components/editor/TemplateDialog";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { SidebarProvider } from "@/components/ui/sidebar";

type FileSidebarProps = ComponentProps<typeof FileSidebar>;
type EditorHeaderProps = ComponentProps<typeof EditorHeader>;
type DocumentTabsProps = ComponentProps<typeof DocumentTabs>;
type FindReplaceBarProps = ComponentProps<typeof FindReplaceBar>;
type ExportPreviewPanelProps = ComponentProps<typeof ExportPreviewPanel>;
type KeyboardShortcutsModalProps = ComponentProps<typeof KeyboardShortcutsModal>;
type TemplateDialogProps = ComponentProps<typeof TemplateDialog>;
type PatchReviewDialogProps = ComponentProps<typeof PatchReviewDialog>;
type AiAssistantDialogProps = ComponentProps<typeof AiAssistantDialog>;

interface EditorWorkspaceProps {
  activeMode: EditorMode;
  fileInputRef: RefObject<HTMLInputElement | null>;
  headerProps: EditorHeaderProps;
  sidebarProps: FileSidebarProps;
  tabsProps: DocumentTabsProps;
  findReplaceProps: FindReplaceBarProps;
  previewOpen: boolean;
  previewProps: ExportPreviewPanelProps;
  renderEditor: () => ReactNode;
  shortcutsModalProps: KeyboardShortcutsModalProps;
  aiAssistantDialogProps: AiAssistantDialogProps;
  patchReviewDialogProps: PatchReviewDialogProps;
  templateDialogProps: TemplateDialogProps;
  onFileChange: ChangeEventHandler<HTMLInputElement>;
}

const EditorWorkspace = ({
  activeMode,
  fileInputRef,
  headerProps,
  sidebarProps,
  tabsProps,
  findReplaceProps,
  previewOpen,
  previewProps,
  renderEditor,
  shortcutsModalProps,
  aiAssistantDialogProps,
  patchReviewDialogProps,
  templateDialogProps,
  onFileChange,
}: EditorWorkspaceProps) => (
  <SidebarProvider defaultOpen={false}>
    <div className="h-screen flex w-full">
      <FileSidebar {...sidebarProps} />
      <div className="flex-1 flex flex-col min-w-0">
        <EditorHeader {...headerProps} />
        <DocumentTabs {...tabsProps} />
        <FindReplaceBar {...findReplaceProps} />
        <div className="flex-1 overflow-hidden">
          {previewOpen && activeMode !== "json" && activeMode !== "yaml" ? (
            <ResizablePanelGroup direction="horizontal" className="h-full">
              <ResizablePanel defaultSize={60} minSize={30}>
                <div className="h-full overflow-y-auto">
                  {renderEditor()}
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={40} minSize={20} maxSize={60}>
                <ExportPreviewPanel {...previewProps} />
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            renderEditor()
          )}
        </div>
        <input
          ref={fileInputRef}
          accept=".docsy,.md,.markdown,.txt,.tex,.html,.htm,.json,.yaml,.yml,.adoc,.asciidoc,.rst"
          className="hidden"
          onChange={onFileChange}
          type="file"
        />
        <KeyboardShortcutsModal {...shortcutsModalProps} />
        <AiAssistantDialog {...aiAssistantDialogProps} />
        <PatchReviewDialog {...patchReviewDialogProps} />
        <TemplateDialog {...templateDialogProps} />
      </div>
    </div>
  </SidebarProvider>
);

export default EditorWorkspace;
