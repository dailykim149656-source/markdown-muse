import { ReactNode } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Code2, PanelRightClose, PanelRightOpen, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SourcePanelHeaderProps {
  label: string;
  onSwap: () => void;
  onClose: () => void;
}

const SourcePanelHeader = ({ label, onSwap, onClose }: SourcePanelHeaderProps) => (
  <div className="h-8 flex items-center justify-between px-3 bg-secondary/50 border-b border-border shrink-0">
    <div className="flex items-center gap-1.5">
      <Code2 className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-[10px] text-muted-foreground/60 ml-1">양방향 동기화</span>
    </div>
    <div className="flex items-center gap-0.5">
      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onSwap} title="패널 위치 전환">
        <ArrowLeftRight className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
        <PanelRightClose className="h-3.5 w-3.5" />
      </Button>
    </div>
  </div>
);

interface SourcePanelProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSwap: () => void;
  onClose: () => void;
  placeholder?: string;
  /** Optional custom editor component instead of textarea */
  children?: ReactNode;
}

const SourcePanel = ({ label, value, onChange, onKeyDown, onSwap, onClose, placeholder, children }: SourcePanelProps) => (
  <div className="h-full flex flex-col bg-background">
    <SourcePanelHeader label={label} onSwap={onSwap} onClose={onClose} />
    {children || (
      <textarea
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        spellCheck={false}
        className="flex-1 w-full bg-background text-foreground font-mono text-xs p-4 resize-none outline-none leading-relaxed"
        placeholder={placeholder}
      />
    )}
  </div>
);

interface SplitEditorLayoutProps {
  showPanel: boolean;
  sourceLeft: boolean;
  onShowPanel: (v: boolean) => void;
  editorContent: ReactNode;
  sourcePanel: ReactNode;
}

const SplitEditorLayout = ({ showPanel, sourceLeft, onShowPanel, editorContent, sourcePanel }: SplitEditorLayoutProps) => {
  if (!showPanel) {
    return (
      <div className="flex-1 overflow-y-auto tiptap-editor relative">
        {editorContent}
        <Button variant="ghost" size="sm" className="absolute right-2 top-2 h-7 gap-1 px-2 text-xs text-muted-foreground z-10" onClick={() => onShowPanel(true)}>
          <PanelRightOpen className="h-3.5 w-3.5" />
          소스
        </Button>
      </div>
    );
  }

  return (
    <ResizablePanelGroup direction="horizontal" className="flex-1">
      {sourceLeft ? (
        <>
          <ResizablePanel defaultSize={40} minSize={20} maxSize={70}>
            {sourcePanel}
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={60} minSize={20}>
            <div className="h-full overflow-y-auto tiptap-editor">{editorContent}</div>
          </ResizablePanel>
        </>
      ) : (
        <>
          <ResizablePanel defaultSize={60} minSize={20}>
            <div className="h-full overflow-y-auto tiptap-editor">{editorContent}</div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={40} minSize={20} maxSize={70}>
            {sourcePanel}
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
};

export { SourcePanel, SplitEditorLayout };
