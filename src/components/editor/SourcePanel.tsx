import { useEffect } from "react";
import type { ChangeEvent, FocusEvent, KeyboardEvent, ReactNode, RefObject } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ArrowLeftRight, Code2, PanelRightClose, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

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
}: SourcePanelHeaderProps) => {
  const isMobile = useIsMobile();

  return (
  <div className={`border-b border-border bg-secondary/50 shrink-0 ${isMobile ? "min-h-11 px-3 py-2" : "h-8 px-3"}`}>
    <div className="flex h-full items-center justify-between gap-2">
    <div className="flex min-w-0 flex-1 items-center gap-1.5">
      <Code2 className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="truncate text-xs font-medium text-muted-foreground">{label}</span>
      <span className="ml-1 hidden text-[10px] text-muted-foreground/60 sm:block">
        Tip: Tab to indent, Shift+Tab to outdent
      </span>
    </div>
    <div className="flex shrink-0 items-center gap-0.5">
      {!isMobile && (
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
      )}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0"
        aria-label="Close source panel"
        onClick={onClose}
        title="Close source panel"
        tabIndex={-1}
        onKeyDownCapture={onButtonKeyDown}
        onMouseDown={(event) => event.preventDefault()}
      >
        <PanelRightClose className="h-3.5 w-3.5" />
      </Button>
    </div>
  </div>
  </div>
  );
};

interface SourcePanelProps {
  label: string;
  value: string;
  rootRef?: RefObject<HTMLDivElement | null>;
  focusLineNumber?: number | null;
  onFocusLineHandled?: () => void;
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
  focusLineNumber,
  onFocusLineHandled,
}: SourcePanelProps) => {
  const isMobile = useIsMobile();

  useEffect(() => {
    const textarea = textareaRef?.current;

    if (!focusLineNumber || !textarea) {
      return;
    }

    const lines = value.split("\n");
    const clampedLine = Math.max(1, Math.min(focusLineNumber, lines.length || 1));
    let selectionStart = 0;

    for (let lineIndex = 0; lineIndex < clampedLine - 1; lineIndex += 1) {
      selectionStart += (lines[lineIndex]?.length || 0) + 1;
    }

    const selectionEnd = selectionStart + (lines[clampedLine - 1]?.length || 0);

    requestAnimationFrame(() => {
      if (document.activeElement !== textarea) {
        textarea.focus();
      }

      textarea.setSelectionRange(selectionStart, selectionEnd);

      const computedLineHeight = Number.parseFloat(window.getComputedStyle(textarea).lineHeight);
      const lineHeight = Number.isFinite(computedLineHeight) ? computedLineHeight : 20;
      const targetScrollTop = Math.max(0, ((clampedLine - 1) * lineHeight) - (textarea.clientHeight / 2));
      textarea.scrollTop = targetScrollTop;
    });

    onFocusLineHandled?.();
  }, [focusLineNumber, onFocusLineHandled, textareaRef, value]);

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
      className={`flex h-full min-h-0 flex-col bg-background ${isMobile ? "rounded-t-2xl" : ""}`}
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
          className="flex-1 min-h-0 w-full resize-none bg-background p-4 font-mono text-xs leading-relaxed text-foreground outline-none"
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
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="relative flex-1 overflow-y-auto tiptap-editor">
        {editorContent}
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-2 z-10 h-7 gap-1 px-2 text-xs text-muted-foreground"
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
        <Sheet onOpenChange={onShowPanel} open={showPanel}>
          <SheetContent
            className="h-[88svh] gap-0 overflow-hidden rounded-t-2xl border-x-0 border-b-0 px-0 pb-0 pt-0 [&>button]:hidden"
            side="bottom"
          >
            <div className="sr-only">
              <SheetTitle>Source panel</SheetTitle>
              <SheetDescription>
                Edit and review the raw source for the current document on mobile.
              </SheetDescription>
            </div>
            {sourcePanel}
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  return (
    <ResizablePanelGroup direction="horizontal" className="flex-1">
      {showPanel && sourceLeft && (
        <>
          <ResizablePanel
            collapsible
            collapsedSize={0}
            defaultSize={40}
            id="desktop-source-panel"
            maxSize={70}
            minSize={20}
            order={1}
          >
            {sourcePanel}
          </ResizablePanel>
          <ResizableHandle id="desktop-source-handle-left" withHandle />
        </>
      )}
      <ResizablePanel
        defaultSize={showPanel ? 60 : 100}
        id="desktop-editor-panel"
        minSize={20}
        order={showPanel && sourceLeft ? 2 : 1}
      >
        <div className="relative h-full overflow-y-auto tiptap-editor">
          {editorContent}
          {!showPanel && (
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
          )}
        </div>
      </ResizablePanel>
      {showPanel && !sourceLeft && (
        <>
          <ResizableHandle id="desktop-source-handle-right" withHandle />
          <ResizablePanel
            collapsible
            collapsedSize={0}
            defaultSize={40}
            id="desktop-source-panel"
            maxSize={70}
            minSize={20}
            order={2}
          >
            {sourcePanel}
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
};

export { SourcePanel, SplitEditorLayout };
