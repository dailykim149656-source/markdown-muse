import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { loadMermaid } from "@/lib/rendering/loadMermaid";

const INVALID_PREVIEW_MESSAGE = "Preview paused until Mermaid syntax is valid.";
const RENDER_FAILURE_MESSAGE = "Unable to render Mermaid preview.";
const RENDER_CONTAINER_CLASS_NAME = "pointer-events-none absolute left-0 top-0 -z-10 overflow-hidden opacity-0";

const initMermaid = async (dark: boolean) => {
  const mermaid = await loadMermaid();

  mermaid.initialize({
    startOnLoad: false,
    theme: dark ? "dark" : "default",
    securityLevel: "loose",
    fontFamily: "inherit",
  });

  return mermaid;
};

let mermaidId = 0;

type RenderMode = "draft" | "saved";

type MermaidNodeViewProps = {
  node: {
    attrs: {
      code?: string;
    };
  };
  selected: boolean;
  updateAttributes: (attributes: { code: string }) => void;
};

type InsertMermaidCommandContext = {
  commands: {
    insertContent: (content: { type: string; attrs: { code: string } }) => boolean;
  };
};

const clearRenderContainer = (container: HTMLDivElement | null) => {
  if (container) {
    container.innerHTML = "";
  }
};

export const MermaidNodeView = ({ node, updateAttributes, selected }: MermaidNodeViewProps) => {
  const [editing, setEditing] = useState(!node.attrs.code);
  const [code, setCode] = useState(node.attrs.code || "");
  const [svg, setSvg] = useState("");
  const [previewMessage, setPreviewMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const renderContainerRef = useRef<HTMLDivElement>(null);
  const layoutContainerRef = useRef<HTMLDivElement>(null);
  const renderRequestRef = useRef(0);
  const latestSvgRef = useRef("");
  const lastLayoutSizeRef = useRef<{ height: number; width: number } | null>(null);

  const isDark = useCallback(() => document.documentElement.classList.contains("dark"), []);
  const resetRenderContainer = useCallback(() => {
    clearRenderContainer(renderContainerRef.current);
  }, []);

  const applyMessageState = useCallback((mode: RenderMode, message: string) => {
    if (mode === "saved") {
      setSvg("");
    }

    setPreviewMessage(message);
  }, []);

  const renderDiagram = useCallback(async (source: string, mode: RenderMode) => {
    const requestId = ++renderRequestRef.current;

    if (!source.trim()) {
      resetRenderContainer();

      if (mode === "saved") {
        setSvg("");
        setPreviewMessage("");
      } else {
        setPreviewMessage(latestSvgRef.current ? INVALID_PREVIEW_MESSAGE : "");
      }

      return;
    }

    try {
      const mermaid = await initMermaid(isDark());
      const parseResult = await mermaid.parse(source, { suppressErrors: true });

      if (requestId !== renderRequestRef.current) {
        return;
      }

      if (!parseResult) {
        applyMessageState(mode, INVALID_PREVIEW_MESSAGE);
        resetRenderContainer();
        return;
      }

      const id = `mermaid-${++mermaidId}`;
      resetRenderContainer();

      const { svg: rendered } = await mermaid.render(id, source, renderContainerRef.current ?? undefined);

      if (requestId !== renderRequestRef.current) {
        return;
      }

      setSvg(rendered);
      setPreviewMessage("");
    } catch {
      if (requestId !== renderRequestRef.current) {
        return;
      }

      applyMessageState(mode, RENDER_FAILURE_MESSAGE);
    } finally {
      resetRenderContainer();
    }
  }, [applyMessageState, isDark, resetRenderContainer]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (!editing && node.attrs.code) {
        void renderDiagram(node.attrs.code, "saved");
      }
    });

    observer.observe(document.documentElement, { attributeFilter: ["class"], attributes: true });

    return () => observer.disconnect();
  }, [editing, node.attrs.code, renderDiagram]);

  useEffect(() => {
    if (!editing) {
      void renderDiagram(node.attrs.code, "saved");
    }
  }, [editing, node.attrs.code, renderDiagram]);

  useEffect(() => {
    if (!editing) {
      return;
    }

    if (!code.trim()) {
      void renderDiagram(code, "draft");
      return;
    }

    const timer = window.setTimeout(() => {
      void renderDiagram(code, "draft");
    }, 400);

    return () => window.clearTimeout(timer);
  }, [code, editing, renderDiagram]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [code, editing]);

  useEffect(() => {
    latestSvgRef.current = svg;
  }, [svg]);

  useEffect(() => {
    const container = layoutContainerRef.current;
    const source = editing ? code : (node.attrs.code || "");

    if (!container || !source.trim()) {
      lastLayoutSizeRef.current = null;
      return;
    }

    let resizeTimer: number | null = null;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      const nextSize = {
        height: Math.round(entry.contentRect.height),
        width: Math.round(entry.contentRect.width),
      };

      const previousSize = lastLayoutSizeRef.current;
      lastLayoutSizeRef.current = nextSize;

      if (!previousSize || (previousSize.width === nextSize.width && previousSize.height === nextSize.height)) {
        return;
      }

      if (resizeTimer !== null) {
        window.clearTimeout(resizeTimer);
      }

      resizeTimer = window.setTimeout(() => {
        void renderDiagram(source, editing ? "draft" : "saved");
      }, 120);
    });

    observer.observe(container);

    return () => {
      observer.disconnect();

      if (resizeTimer !== null) {
        window.clearTimeout(resizeTimer);
      }
    };
  }, [code, editing, node.attrs.code, renderDiagram]);

  useEffect(() => () => {
    renderRequestRef.current += 1;
    resetRenderContainer();
  }, [resetRenderContainer]);

  const handleSave = useCallback(() => {
    updateAttributes({ code });
    setEditing(false);
  }, [code, updateAttributes]);

  if (editing) {
    return (
      <NodeViewWrapper className="my-4">
        <div className="relative overflow-hidden rounded-lg border-2 border-primary/40 shadow-sm" ref={layoutContainerRef}>
          <div className="flex items-center justify-between border-b border-border bg-primary/5 px-3 py-1.5 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-primary/70">MMD</span>
              <span className="font-medium">Mermaid diagram</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-secondary px-1 py-0.5 text-[9px]">Cmd/Ctrl+Enter</kbd>
              <button
                className="rounded-md bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                onClick={handleSave}
                type="button"
              >
                Save
              </button>
            </div>
          </div>
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                handleSave();
              }

              event.stopPropagation();
            }}
            autoFocus
            className="min-h-[60px] w-full resize-none bg-background p-3 font-mono text-sm leading-relaxed text-foreground outline-none"
            placeholder={`graph TD\n    A[Start] --> B[Review]`}
          />
          <div aria-hidden="true" className={RENDER_CONTAINER_CLASS_NAME} ref={renderContainerRef} />
          {(svg || previewMessage) && (
            <div className="flex min-h-[60px] flex-col items-center justify-center border-t border-border bg-secondary/20 p-4">
              {svg && (
                <div className="mermaid-preview max-w-full overflow-auto" dangerouslySetInnerHTML={{ __html: svg }} />
              )}
              {previewMessage && (
                <span
                  aria-live="polite"
                  className={`font-mono text-xs text-amber-700 dark:text-amber-300 ${svg ? "mt-3" : ""}`}
                >
                  {previewMessage}
                </span>
              )}
            </div>
          )}
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      className={`my-4 cursor-pointer transition-all group/mermaid ${selected ? "rounded-lg ring-2 ring-primary/30" : ""}`}
      onClick={() => setEditing(true)}
      title="Click to edit"
    >
      <div
        className={`relative rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/30 ${selected ? "bg-primary/5" : ""}`}
        ref={layoutContainerRef}
      >
        <div aria-hidden="true" className={RENDER_CONTAINER_CLASS_NAME} ref={renderContainerRef} />
        <div className="absolute top-2 right-2 flex items-center gap-1 text-[9px] text-muted-foreground opacity-0 transition-opacity group-hover/mermaid:opacity-100">
          <span>Click to edit</span>
        </div>
        {svg ? (
          <div className="space-y-3">
            <div className="mermaid-preview flex max-w-full justify-center overflow-auto" dangerouslySetInnerHTML={{ __html: svg }} />
            {previewMessage && (
              <div aria-live="polite" className="px-2 pb-1 font-mono text-xs text-amber-700 dark:text-amber-300">
                {previewMessage}
              </div>
            )}
          </div>
        ) : previewMessage ? (
          <div aria-live="polite" className="p-2 font-mono text-sm text-amber-700 dark:text-amber-300">
            {previewMessage}
          </div>
        ) : (
          <div className="py-4 text-center text-sm italic text-muted-foreground">
            Enter Mermaid diagram code.
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

const MermaidBlock = Node.create({
  name: "mermaidBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      code: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="mermaid"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "mermaid" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidNodeView);
  },

  addCommands() {
    return {
      insertMermaid:
        (attrs?: { code?: string }) =>
        ({ commands }: InsertMermaidCommandContext) => {
          return commands.insertContent({
            type: this.name,
            attrs: { code: attrs?.code || "" },
          });
        },
    } satisfies Record<string, unknown>;
  },
});

export default MermaidBlock;
