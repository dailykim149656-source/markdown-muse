import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import MathRender from "../MathRender";

const MathNodeView = ({ node, updateAttributes, selected }: any) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(node.attrs.latex);
  const isBlock = node.attrs.display === "block";
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) {
      setValue(node.attrs.latex);
    }
  }, [editing, node.attrs.latex]);

  const handleSave = useCallback(() => {
    updateAttributes({ latex: value });
    setEditing(false);
  }, [updateAttributes, value]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editing, value]);

  if (editing) {
    return (
      <NodeViewWrapper as={isBlock ? "div" : "span"} className={isBlock ? "my-4" : ""}>
        <div className={`overflow-hidden rounded-lg border-2 border-primary/40 shadow-sm ${isBlock ? "" : "inline-block"}`}>
          <div className="flex items-center justify-between border-b border-border bg-primary/5 px-3 py-1.5 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-primary/70">TeX</span>
              <span className="font-medium">{isBlock ? "Block math" : "Inline math"}</span>
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
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                handleSave();
              }

              event.stopPropagation();
            }}
            autoFocus
            className="min-h-[36px] w-full resize-none bg-background p-3 font-mono text-sm leading-relaxed text-foreground outline-none"
            placeholder="Enter a LaTeX expression..."
          />
          {value && (
            <div className="flex min-h-[40px] items-center justify-center border-t border-border bg-secondary/20 p-3">
              <MathRender displayMode={isBlock} latex={value} />
            </div>
          )}
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      as={isBlock ? "div" : "span"}
      className={`cursor-pointer transition-all group/math ${isBlock ? "my-4 flex justify-center" : "inline"} ${selected ? "rounded-md ring-2 ring-primary/30" : ""}`}
      onClick={() => setEditing(true)}
      title="Click to edit"
    >
      <div className={`relative rounded transition-colors hover:bg-primary/5 ${isBlock ? "px-4 py-2" : "px-0.5"} ${selected ? "rounded-md bg-primary/5" : ""}`}>
        <MathRender
          displayMode={isBlock}
          emptyLabel={isBlock ? "Enter a math block." : "Math"}
          latex={node.attrs.latex}
        />
        <span className={`absolute text-[9px] text-primary/40 opacity-0 transition-opacity group-hover/math:opacity-100 ${isBlock ? "top-0 right-1" : "-top-3 -right-1"}`}>
          Edit
        </span>
      </div>
    </NodeViewWrapper>
  );
};

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
