import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { useEffect, useState, useCallback } from "react";
import { ListTree } from "lucide-react";

interface TocHeading {
  id: string;
  text: string;
  level: number;
}

const TableOfContentsComponent = ({ editor }: any) => {
  const [headings, setHeadings] = useState<TocHeading[]>([]);

  const collectHeadings = useCallback(() => {
    if (!editor) return;
    const items: TocHeading[] = [];
    editor.state.doc.descendants((node: any, pos: number) => {
      if (node.type.name === "heading") {
        const id = `heading-${pos}`;
        items.push({
          id,
          text: node.textContent,
          level: node.attrs.level,
        });
      }
    });
    setHeadings(items);
  }, [editor]);

  useEffect(() => {
    collectHeadings();
    if (!editor) return;
    const handler = () => collectHeadings();
    editor.on("update", handler);
    return () => editor.off("update", handler);
  }, [editor, collectHeadings]);

  const scrollToHeading = (id: string) => {
    const pos = parseInt(id.replace("heading-", ""), 10);
    if (!isNaN(pos)) {
      editor.commands.focus(pos + 1);
    }
  };

  return (
    <NodeViewWrapper>
      <div
        className="my-4 p-4 border border-border rounded-lg bg-muted/30"
        contentEditable={false}
      >
        <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-foreground">
          <ListTree className="h-4 w-4" />
          목차
        </div>
        {headings.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            문서에 제목(H1, H2, H3)을 추가하면 여기에 목차가 자동으로 생성됩니다.
          </p>
        ) : (
          <nav className="space-y-0.5">
            {headings.map((h, i) => (
              <button
                key={i}
                onClick={() => scrollToHeading(h.id)}
                className="block w-full text-left text-sm text-primary hover:underline cursor-pointer transition-colors"
                style={{ paddingLeft: `${(h.level - 1) * 1}rem` }}
              >
                {h.text || "(빈 제목)"}
              </button>
            ))}
          </nav>
        )}
      </div>
    </NodeViewWrapper>
  );
};

const TableOfContents = Node.create({
  name: "tableOfContents",
  group: "block",
  atom: true,

  parseHTML() {
    return [{ tag: 'div[data-type="toc"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "toc" }), "목차"];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TableOfContentsComponent);
  },

  addCommands() {
    return {
      insertTableOfContents:
        () =>
        ({ commands }: any) => {
          return commands.insertContent({ type: this.name });
        },
    } as any;
  },
});

export default TableOfContents;
