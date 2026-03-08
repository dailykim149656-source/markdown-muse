import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { useState } from "react";

const FigureCaptionComponent = ({ node, updateAttributes, editor }: any) => {
  const { captionType, label, captionText } = node.attrs;
  const [editing, setEditing] = useState(false);

  // Auto-number: count all figureCaption nodes of the same type up to and including this one
  let number = 1;
  if (editor) {
    let found = false;
    editor.state.doc.descendants((n: any, pos: number) => {
      if (found) return false;
      if (n.type.name === "figureCaption" && n.attrs.captionType === captionType) {
        if (n.attrs.label === label && n.attrs.captionText === captionText) {
          found = true;
        } else {
          number++;
        }
      }
    });
  }

  const prefix = captionType === "table" ? "표" : "그림";

  return (
    <NodeViewWrapper>
      <div
        className="my-2 text-center text-sm text-muted-foreground"
        contentEditable={false}
      >
        <span className="font-semibold text-foreground">
          {prefix} {number}
        </span>
        {label && (
          <span className="text-xs text-muted-foreground ml-1">
            [{label}]
          </span>
        )}
        {": "}
        {editing ? (
          <input
            autoFocus
            className="inline-block border-b border-primary bg-transparent text-sm text-foreground outline-none min-w-[120px]"
            value={captionText}
            onChange={(e) => updateAttributes({ captionText: e.target.value })}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setEditing(false);
            }}
          />
        ) : (
          <span
            className="cursor-pointer hover:text-foreground transition-colors"
            onClick={() => setEditing(true)}
            title="캡션을 편집하려면 클릭하세요"
          >
            {captionText || "(캡션을 입력하세요)"}
          </span>
        )}
      </div>
    </NodeViewWrapper>
  );
};

const FigureCaption = Node.create({
  name: "figureCaption",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      captionType: { default: "figure" }, // "figure" | "table"
      label: { default: "" },
      captionText: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="figure-caption"]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const prefix = node.attrs.captionType === "table" ? "표" : "그림";
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "figure-caption",
        "data-caption-type": node.attrs.captionType,
        "data-label": node.attrs.label,
      }),
      `${prefix}: ${node.attrs.captionText}`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FigureCaptionComponent);
  },

  addCommands() {
    return {
      insertFigureCaption:
        (attrs: { captionType?: string; label?: string; captionText?: string }) =>
        ({ commands }: any) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              captionType: attrs?.captionType || "figure",
              label: attrs?.label || "",
              captionText: attrs?.captionText || "",
            },
          });
        },
    } as any;
  },
});

export default FigureCaption;
