import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { useState, useCallback, useEffect, useRef } from "react";

// React component for rendering math with improved preview
const MathNodeView = ({ node, updateAttributes, selected }: any) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(node.attrs.latex);
  const isBlock = node.attrs.display === "block";
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync external changes
  useEffect(() => {
    if (!editing) setValue(node.attrs.latex);
  }, [node.attrs.latex, editing]);

  const handleSave = useCallback(() => {
    updateAttributes({ latex: value });
    setEditing(false);
  }, [value, updateAttributes]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [value, editing]);

  if (editing) {
    return (
      <NodeViewWrapper as={isBlock ? "div" : "span"} className={isBlock ? "my-4" : ""}>
        <div className={`border-2 border-primary/40 rounded-lg overflow-hidden shadow-sm ${isBlock ? "" : "inline-block"}`}>
          <div className="bg-primary/5 px-3 py-1.5 text-[10px] text-muted-foreground border-b border-border flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-primary/70">∑</span>
              <span className="font-medium">{isBlock ? "블록 수식" : "인라인 수식"}</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="text-[9px] px-1 py-0.5 bg-secondary rounded border border-border">
                ⌘+↵
              </kbd>
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
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleSave();
              }
              e.stopPropagation();
            }}
            className="w-full bg-background text-foreground text-sm font-mono p-3 outline-none resize-none min-h-[36px] leading-relaxed"
            autoFocus
            placeholder="LaTeX 수식을 입력하세요..."
          />
          {value && (
            <div className="border-t border-border p-3 bg-secondary/20 flex justify-center min-h-[40px] items-center">
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
      className={`cursor-pointer group/math transition-all ${
        isBlock ? "my-4 flex justify-center" : "inline"
      } ${selected ? "ring-2 ring-primary/30 rounded-md" : ""}`}
      onClick={() => setEditing(true)}
      title="클릭하여 편집"
    >
      <div className={`relative ${isBlock ? "px-4 py-2" : "px-0.5"} ${
        selected ? "bg-primary/5 rounded-md" : ""
      } hover:bg-primary/5 rounded transition-colors`}>
        <MathRender latex={node.attrs.latex} displayMode={isBlock} />
        <span className={`absolute ${isBlock ? "top-0 right-1" : "-top-3 -right-1"} text-[9px] text-primary/40 opacity-0 group-hover/math:opacity-100 transition-opacity`}>
          ✏️
        </span>
      </div>
    </NodeViewWrapper>
  );
};

const MathRender = ({ latex, displayMode }: { latex: string; displayMode: boolean }) => {
  if (!latex) {
    return (
      <span className="text-muted-foreground text-sm italic">
        {displayMode ? "수식을 입력하세요" : "수식"}
      </span>
    );
  }

  try {
    const html = katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      trust: true,
      strict: false,
    });
    return (
      <span
        dangerouslySetInnerHTML={{ __html: html }}
        className={`${displayMode ? "block text-center" : "inline"} math-rendered`}
      />
    );
  } catch (err) {
    return (
      <span className="text-destructive text-sm font-mono bg-destructive/10 px-1 rounded">
        {latex}
        <span className="block text-[10px] mt-0.5 text-destructive/70">
          {err instanceof Error ? err.message : "렌더링 오류"}
        </span>
      </span>
    );
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
