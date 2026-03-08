import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { useState, useCallback } from "react";

// React component for rendering math
const MathNodeView = ({ node, updateAttributes, selected }: any) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(node.attrs.latex);
  const isBlock = node.attrs.display === "block";

  const handleSave = useCallback(() => {
    updateAttributes({ latex: value });
    setEditing(false);
  }, [value, updateAttributes]);

  if (editing) {
    return (
      <NodeViewWrapper as={isBlock ? "div" : "span"} className={isBlock ? "my-4" : ""}>
        <div className={`border border-primary/30 rounded-md overflow-hidden ${isBlock ? "" : "inline-block"}`}>
          <div className="bg-secondary/50 px-2 py-1 text-[10px] text-muted-foreground border-b border-border flex justify-between items-center">
            <span>수식 편집 (LaTeX)</span>
            <button
              className="text-xs px-2 py-0.5 bg-primary text-primary-foreground rounded hover:opacity-90"
              onClick={handleSave}
            >
              완료
            </button>
          </div>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleSave();
              }
              e.stopPropagation();
            }}
            className="w-full bg-background text-foreground text-sm font-mono p-2 outline-none resize-none min-h-[40px]"
            autoFocus
            rows={isBlock ? 3 : 1}
          />
          {value && (
            <div className="border-t border-border p-2 bg-background flex justify-center">
              <MathRender latex={value} displayMode={isBlock} />
            </div>
          )}
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      as={isBlock ? "div" : "span"}
      className={`cursor-pointer ${isBlock ? "my-4 flex justify-center" : "inline"} ${selected ? "ring-2 ring-primary/30 rounded" : ""}`}
      onClick={() => setEditing(true)}
    >
      <MathRender latex={node.attrs.latex} displayMode={isBlock} />
    </NodeViewWrapper>
  );
};

const MathRender = ({ latex, displayMode }: { latex: string; displayMode: boolean }) => {
  try {
    const html = katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      trust: true,
    });
    return (
      <span
        dangerouslySetInnerHTML={{ __html: html }}
        className={displayMode ? "block text-center" : "inline"}
      />
    );
  } catch {
    return <span className="text-destructive text-sm font-mono">{latex}</span>;
  }
};

// Tiptap extension
const MathExtension = Node.create({
  name: "math",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      latex: { default: "" },
      display: { default: "inline" },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="math"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-type": "math" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathNodeView);
  },
});

// Block math extension
const MathBlockExtension = Node.create({
  name: "mathBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      latex: { default: "" },
      display: { default: "block" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="math-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "math-block" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathNodeView);
  },
});

export { MathExtension, MathBlockExtension };
