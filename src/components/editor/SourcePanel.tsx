import type { ChangeEvent, FocusEvent, KeyboardEvent, ReactNode, RefObject } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ArrowLeftRight, Code2, PanelRightClose, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SourcePanelHeaderProps {
  label: string;
  onSwap: () => void;
  onClose: () => void;
  onButtonKeyDown?: (e: KeyboardEvent<HTMLButtonElement>) => void;
}

const SourcePanelHeader = ({
  label,
  onSwap,
  onClose,
  onButtonKeyDown,
}: SourcePanelHeaderProps) => (
  <div className="h-8 flex items-center justify-between px-3 bg-secondary/50 border-b border-border shrink-0">
    <div className="flex items-center gap-1.5">
      <Code2 className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-[10px] text-muted-foreground/60 ml-1">
        Tip: Tab to indent, Shift+Tab to outdent
      </span>
    </div>
    <div className="flex items-center gap-0.5">
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0"
        onClick={onSwap}
        title="Move source panel"
        tabIndex={-1}
        onKeyDownCapture={onButtonKeyDown}
        onMouseDown={(event) => event.preventDefault()}
      >
        <ArrowLeftRight className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0"
        onClick={onClose}
        tabIndex={-1}
        onKeyDownCapture={onButtonKeyDown}
        onMouseDown={(event) => event.preventDefault()}
      >
          <PanelRightClose className="h-3.5 w-3.5" />
      </Button>
    </div>
  </div>
);

interface SourcePanelProps {
  label: string;
  value: string;
  rootRef?: RefObject<HTMLDivElement | null>;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onKeyDownCapture?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onPanelKeyDownCapture?: (e: KeyboardEvent<HTMLDivElement>) => void;
  onPanelFocusCapture?: (e: FocusEvent<HTMLDivElement>) => void;
  onSwap: () => void;
  onClose: () => void;
  placeholder?: string;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  /** Optional custom editor component instead of textarea */
  children?: ReactNode;
}

const SourcePanel = ({
  label,
  value,
  rootRef,
  onChange,
  onKeyDown,
  onKeyDownCapture,
  onPanelKeyDownCapture,
  onPanelFocusCapture,
  onSwap,
  onClose,
  placeholder,
  textareaRef,
  children,
}: SourcePanelProps) => {
  const handlePanelKeyDownCapture = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") {
      if (onPanelKeyDownCapture) {
        onPanelKeyDownCapture(e);
      }
      return;
    }

    const textarea = textareaRef?.current;
    const target = e.target as HTMLElement | null;
    const focusInTextarea = target?.tagName === "TEXTAREA" || Boolean(target?.closest("textarea"));

    if (!focusInTextarea && textarea) {
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      if (document.activeElement !== textarea) {
        textarea.focus();
      }
    }

    if (onPanelKeyDownCapture) {
      onPanelKeyDownCapture(e);
    }
  };

  const handleHeaderButtonInteraction = (
    e: KeyboardEvent<HTMLButtonElement>
  ) => {
    const textarea = textareaRef?.current;
    if (!textarea) {
      return;
    }

    if (e.key !== "Tab") {
      return;
    }

    e.preventDefault();
    textarea.focus();
  };

  return (
    <div
      className="h-full flex flex-col bg-background"
      ref={rootRef}
      onKeyDownCapture={handlePanelKeyDownCapture}
      onFocusCapture={onPanelFocusCapture}
    >
      <SourcePanelHeader
        label={label}
        onSwap={onSwap}
        onClose={onClose}
        onButtonKeyDown={handleHeaderButtonInteraction}
      />
      {children || (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={onChange}
          onKeyDownCapture={onKeyDownCapture}
          onKeyDown={onKeyDown}
          spellCheck={false}
          className="flex-1 w-full bg-background text-foreground font-mono text-xs p-4 resize-none outline-none leading-relaxed"
          placeholder={placeholder}
        />
      )}
    </div>
  );
};

interface SplitEditorLayoutProps {
  showPanel: boolean;
  sourceLeft: boolean;
  onShowPanel: (v: boolean) => void;
  editorContent: ReactNode;
  sourcePanel: ReactNode;
}

const SplitEditorLayout = ({
  showPanel,
  sourceLeft,
  onShowPanel,
  editorContent,
  sourcePanel,
}: SplitEditorLayoutProps) => {
  if (!showPanel) {
    return (
      <div className="flex-1 overflow-y-auto tiptap-editor relative">
        {editorContent}
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-2 h-7 gap-1 px-2 text-xs text-muted-foreground z-10"
          onClick={() => onShowPanel(true)}
          tabIndex={-1}
          onKeyDownCapture={(event) => {
            if (event.key === "Tab") {
              event.preventDefault();
              onShowPanel(true);
            }
          }}
          onMouseDown={(event) => event.preventDefault()}
        >
          <PanelRightOpen className="h-3.5 w-3.5" />
          Source
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
