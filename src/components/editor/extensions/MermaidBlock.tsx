import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { loadMermaid } from "@/lib/rendering/loadMermaid";

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

const MermaidNodeView = ({ node, updateAttributes, selected }: any) => {
  const [editing, setEditing] = useState(!node.attrs.code);
  const [code, setCode] = useState(node.attrs.code || "");
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const renderRequestRef = useRef(0);

  const isDark = useCallback(() => document.documentElement.classList.contains("dark"), []);

  const renderDiagram = useCallback(async (source: string) => {
    const requestId = ++renderRequestRef.current;

    if (!source.trim()) {
      setSvg("");
      setError("");
      return;
    }

    try {
      const mermaid = await initMermaid(isDark());
      const id = `mermaid-${++mermaidId}`;
      const { svg: rendered } = await mermaid.render(id, source);

      if (requestId !== renderRequestRef.current) {
        return;
      }

      setSvg(rendered);
      setError("");
    } catch (nextError) {
      if (requestId !== renderRequestRef.current) {
        return;
      }

      setSvg("");
      setError(nextError instanceof Error ? nextError.message : "Failed to render Mermaid diagram.");
    }
  }, [isDark]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (!editing && node.attrs.code) {
        void renderDiagram(node.attrs.code);
      }
    });

    observer.observe(document.documentElement, { attributeFilter: ["class"], attributes: true });

    return () => observer.disconnect();
  }, [editing, node.attrs.code, renderDiagram]);

  useEffect(() => {
    if (!editing) {
      void renderDiagram(node.attrs.code);
    }
  }, [editing, node.attrs.code, renderDiagram]);

  useEffect(() => {
    if (editing && code.trim()) {
      const timer = window.setTimeout(() => {
        void renderDiagram(code);
      }, 400);

      return () => window.clearTimeout(timer);
    }
  }, [code, editing, renderDiagram]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [code, editing]);

  useEffect(() => () => {
    renderRequestRef.current += 1;
  }, []);

  const handleSave = useCallback(() => {
    updateAttributes({ code });
    setEditing(false);
  }, [code, updateAttributes]);

  if (editing) {
    return (
      <NodeViewWrapper className="my-4">
        <div className="overflow-hidden rounded-lg border-2 border-primary/40 shadow-sm">
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
          {(svg || error) && (
            <div className="flex min-h-[60px] items-center justify-center border-t border-border bg-secondary/20 p-4">
              {svg ? (
                <div className="mermaid-preview max-w-full overflow-auto" dangerouslySetInnerHTML={{ __html: svg }} />
              ) : (
                <span className="font-mono text-xs text-destructive">{error}</span>
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
      <div className={`relative rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/30 ${selected ? "bg-primary/5" : ""}`}>
        <div className="absolute top-2 right-2 flex items-center gap-1 text-[9px] text-muted-foreground opacity-0 transition-opacity group-hover/mermaid:opacity-100">
          <span>Click to edit</span>
        </div>
        {svg ? (
          <div className="mermaid-preview flex max-w-full justify-center overflow-auto" dangerouslySetInnerHTML={{ __html: svg }} />
        ) : error ? (
          <div className="p-2 font-mono text-sm text-destructive">{error}</div>
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
        ({ commands }: any) => {
          return commands.insertContent({
            type: this.name,
            attrs: { code: attrs?.code || "" },
          });
        },
    } as any;
  },
});

export default MermaidBlock;
