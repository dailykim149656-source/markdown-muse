import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { useState, useCallback, useEffect, useRef } from "react";
import mermaid from "mermaid";

const initMermaid = (dark: boolean) => {
  mermaid.initialize({
    startOnLoad: false,
    theme: dark ? "dark" : "default",
    securityLevel: "loose",
    fontFamily: "inherit",
  });
};

let mermaidId = 0;

const MermaidNodeView = ({ node, updateAttributes, selected }: any) => {
  const [editing, setEditing] = useState(!node.attrs.code);
  const [code, setCode] = useState(node.attrs.code || "");
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const renderDiagram = useCallback(async (source: string) => {
    if (!source.trim()) {
      setSvg("");
      setError("");
      return;
    }
    try {
      const id = `mermaid-${++mermaidId}`;
      const { svg: rendered } = await mermaid.render(id, source);
      setSvg(rendered);
      setError("");
    } catch (err) {
      setSvg("");
      setError(err instanceof Error ? err.message : "렌더링 오류");
    }
  }, []);

  useEffect(() => {
    if (!editing) renderDiagram(node.attrs.code);
  }, [node.attrs.code, editing, renderDiagram]);

  // Live preview while editing
  useEffect(() => {
    if (editing && code.trim()) {
      const timer = setTimeout(() => renderDiagram(code), 400);
      return () => clearTimeout(timer);
    }
  }, [code, editing, renderDiagram]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [code, editing]);

  const handleSave = useCallback(() => {
    updateAttributes({ code });
    setEditing(false);
  }, [code, updateAttributes]);

  if (editing) {
    return (
      <NodeViewWrapper className="my-4">
        <div className={`border-2 border-primary/40 rounded-lg overflow-hidden shadow-sm`}>
          <div className="bg-primary/5 px-3 py-1.5 text-[10px] text-muted-foreground border-b border-border flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-primary/70">◇</span>
              <span className="font-medium">Mermaid 다이어그램</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="text-[9px] px-1 py-0.5 bg-secondary rounded border border-border">⌘+↵</kbd>
              <button
                className="text-xs px-2.5 py-0.5 bg-primary text-primary-foreground rounded-md hover:opacity-90 font-medium"
                onClick={handleSave}
              >
                완료
              </button>
            </div>
          </div>
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSave();
              e.stopPropagation();
            }}
            className="w-full bg-background text-foreground text-sm font-mono p-3 outline-none resize-none min-h-[60px] leading-relaxed"
            autoFocus
            placeholder={`graph TD\n    A[시작] --> B[끝]`}
          />
          {(svg || error) && (
            <div className="border-t border-border p-4 bg-secondary/20 flex justify-center min-h-[60px] items-center">
              {svg ? (
                <div dangerouslySetInnerHTML={{ __html: svg }} className="mermaid-preview max-w-full overflow-auto" />
              ) : (
                <span className="text-destructive text-xs font-mono">{error}</span>
              )}
            </div>
          )}
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      className={`my-4 cursor-pointer group/mermaid transition-all ${selected ? "ring-2 ring-primary/30 rounded-lg" : ""}`}
      onClick={() => setEditing(true)}
      title="클릭하여 편집"
    >
      <div className={`relative border border-border rounded-lg p-4 bg-card hover:bg-accent/30 transition-colors ${selected ? "bg-primary/5" : ""}`}>
        <div className="absolute top-2 right-2 text-[9px] text-muted-foreground opacity-0 group-hover/mermaid:opacity-100 transition-opacity flex items-center gap-1">
          <span>✏️ 편집</span>
        </div>
        {svg ? (
          <div dangerouslySetInnerHTML={{ __html: svg }} className="mermaid-preview flex justify-center max-w-full overflow-auto" />
        ) : error ? (
          <div className="text-destructive text-sm font-mono p-2">{error}</div>
        ) : (
          <div className="text-muted-foreground text-sm italic text-center py-4">
            Mermaid 다이어그램을 입력하세요
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
