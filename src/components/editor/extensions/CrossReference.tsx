import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";

const CrossReferenceComponent = ({ node, editor }: any) => {
  const { targetLabel } = node.attrs;

  // Find the referenced caption node and compute its number
  let refText = `[${targetLabel}]`;
  if (editor && targetLabel) {
    let number = 0;
    let captionType = "figure";
    let found = false;
    editor.state.doc.descendants((n: any) => {
      if (found) return false;
      if (n.type.name === "figureCaption") {
        if (n.attrs.captionType === captionType || !found) {
          // Count by type until we find the label
        }
        if (n.attrs.label === targetLabel) {
          found = true;
          captionType = n.attrs.captionType;
        }
      }
    });

    // Now count the number
    if (found) {
      let count = 0;
      editor.state.doc.descendants((n: any) => {
        if (n.type.name === "figureCaption" && n.attrs.captionType === captionType) {
          count++;
          if (n.attrs.label === targetLabel) {
            number = count;
          }
        }
      });
      const prefix = captionType === "table" ? "표" : "그림";
      refText = `${prefix} ${number}`;
    }
  }

  return (
    <NodeViewWrapper as="span" className="inline">
      <span
        contentEditable={false}
        className="text-primary font-medium cursor-pointer hover:underline bg-primary/5 px-1 rounded text-sm"
        title={`참조: ${targetLabel}`}
        onClick={() => {
          // Scroll to the referenced caption
          if (!editor || !targetLabel) return;
          editor.state.doc.descendants((n: any, pos: number) => {
            if (n.type.name === "figureCaption" && n.attrs.label === targetLabel) {
              editor.commands.focus(pos);
              return false;
            }
          });
        }}
      >
        {refText}
      </span>
    </NodeViewWrapper>
  );
};

const CrossReference = Node.create({
  name: "crossReference",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      targetLabel: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="cross-ref"]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "cross-ref",
        "data-target": node.attrs.targetLabel,
      }),
      `[${node.attrs.targetLabel}]`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CrossReferenceComponent);
  },

  addCommands() {
    return {
      insertCrossReference:
        (attrs: { targetLabel: string }) =>
        ({ commands }: any) => {
          return commands.insertContent({
            type: this.name,
            attrs: { targetLabel: attrs.targetLabel },
          });
        },
    } as any;
  },
});

export default CrossReference;
