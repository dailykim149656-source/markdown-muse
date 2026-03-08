import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { useState, useCallback, useEffect } from "react";

// Inline footnote reference (superscript number in body)
const FootnoteRefView = ({ node, editor, getPos }: any) => {
  const id = node.attrs.id;

  // Calculate footnote number based on document order
  const [num, setNum] = useState(0);
  useEffect(() => {
    const calcNum = () => {
      let count = 0;
      editor.state.doc.descendants((n: any, pos: number) => {
        if (n.type.name === "footnoteRef") {
          count++;
          if (pos === getPos()) setNum(count);
        }
      });
    };
    calcNum();
    // Recalculate on doc changes
    const handler = () => calcNum();
    editor.on("update", handler);
    return () => editor.off("update", handler);
  }, [editor, getPos, id]);

  const scrollToFootnote = useCallback(() => {
    const el = document.querySelector(`[data-footnote-id="${id}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [id]);

  return (
    <NodeViewWrapper as="span" className="inline">
      <sup
        className="footnote-ref cursor-pointer text-primary font-semibold hover:underline text-[0.7em] ml-[1px]"
        onClick={scrollToFootnote}
        title={`각주 ${num}`}
      >
        [{num}]
      </sup>
    </NodeViewWrapper>
  );
};

// Block footnote item (appears at bottom)
const FootnoteItemView = ({ node, updateAttributes, editor, getPos }: any) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(node.attrs.text);
  const id = node.attrs.id;

  useEffect(() => {
    if (!editing) setText(node.attrs.text);
  }, [node.attrs.text, editing]);

  // Calculate number
  const [num, setNum] = useState(0);
  useEffect(() => {
    const calcNum = () => {
      let refCount = 0;
      editor.state.doc.descendants((n: any) => {
        if (n.type.name === "footnoteRef") {
          refCount++;
          if (n.attrs.id === id) setNum(refCount);
        }
      });
    };
    calcNum();
    const handler = () => calcNum();
    editor.on("update", handler);
    return () => editor.off("update", handler);
  }, [editor, id]);

  const scrollToRef = useCallback(() => {
    // Find the footnoteRef with same id
    let targetPos = -1;
    editor.state.doc.descendants((n: any, pos: number) => {
      if (n.type.name === "footnoteRef" && n.attrs.id === id) {
        targetPos = pos;
      }
    });
    if (targetPos >= 0) {
      editor.commands.setTextSelection(targetPos);
      editor.commands.scrollIntoView();
    }
  }, [editor, id]);

  const handleSave = useCallback(() => {
    updateAttributes({ text });
    setEditing(false);
  }, [text, updateAttributes]);

  return (
    <NodeViewWrapper data-footnote-id={id} className="footnote-item">
      <div className="flex items-start gap-2 py-1 text-sm text-muted-foreground group/fn">
        <span
          className="footnote-num cursor-pointer text-primary font-semibold hover:underline shrink-0 mt-0.5"
          onClick={scrollToRef}
          title="본문으로 이동"
        >
          [{num}]
        </span>
        {editing ? (
          <div className="flex-1 flex items-center gap-1">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                e.stopPropagation();
              }}
              className="flex-1 bg-secondary/50 border border-border rounded px-2 py-0.5 text-sm outline-none"
              autoFocus
            />
            <button onClick={handleSave} className="text-xs px-2 py-0.5 bg-primary text-primary-foreground rounded hover:opacity-90">
              완료
            </button>
          </div>
        ) : (
          <span
            className="flex-1 cursor-pointer hover:text-foreground transition-colors"
            onClick={() => setEditing(true)}
            title="클릭하여 편집"
          >
            {text || <span className="italic opacity-50">각주 내용을 입력하세요</span>}
            <span className="opacity-0 group-hover/fn:opacity-100 ml-1 text-[10px]">✏️</span>
          </span>
        )}
      </div>
    </NodeViewWrapper>
  );
};

let footnoteIdCounter = 0;

const FootnoteRef = Node.create({
  name: "footnoteRef",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      id: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="footnote-ref"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-type": "footnote-ref" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FootnoteRefView);
  },

  addCommands() {
    return {
      insertFootnote:
        () =>
        ({ editor, commands }: any) => {
          const id = `fn-${Date.now()}-${++footnoteIdCounter}`;
          commands.insertContent({
            type: "footnoteRef",
            attrs: { id },
          });
          const endPos = editor.state.doc.content.size;
          editor.chain().insertContentAt(endPos, {
            type: "footnoteItem",
            attrs: { id, text: "" },
          }).run();
          return true;
        },
    } as any;
  },
});

const FootnoteItem = Node.create({
  name: "footnoteItem",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      id: { default: "" },
      text: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="footnote-item"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "footnote-item" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FootnoteItemView);
  },
});


export { FootnoteRef, FootnoteItem };
  };
};

export { FootnoteRef, FootnoteItem, insertFootnoteCommand };
