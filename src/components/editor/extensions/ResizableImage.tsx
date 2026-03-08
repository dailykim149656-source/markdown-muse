import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { useState, useCallback, useRef, useEffect } from "react";

interface ResizableImageAttrs {
  src: string;
  alt: string;
  title: string;
  width: number | null;
  height: number | null;
}

const ResizableImageComponent = ({ node, updateAttributes, selected }: any) => {
  const { src, alt, title, width, height } = node.attrs as ResizableImageAttrs;
  const [isResizing, setIsResizing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent, direction: "right" | "left") => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      startX.current = e.clientX;
      startWidth.current = imgRef.current?.offsetWidth || width || 300;

      const onMouseMove = (ev: MouseEvent) => {
        const diff = direction === "right" ? ev.clientX - startX.current : startX.current - ev.clientX;
        const newWidth = Math.max(80, startWidth.current + diff);
        updateAttributes({ width: newWidth, height: null });
      };

      const onMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [width, updateAttributes]
  );

  return (
    <NodeViewWrapper className="relative inline-block my-2 mx-auto" style={{ width: width ? `${width}px` : "auto" }}>
      <div className={`relative group ${selected ? "ring-2 ring-primary rounded" : ""}`}>
        <img
          ref={imgRef}
          src={src}
          alt={alt || ""}
          title={title || ""}
          className="block max-w-full h-auto rounded"
          style={{ width: width ? `${width}px` : "auto", height: height ? `${height}px` : "auto" }}
          draggable={false}
        />
        {/* Resize handles */}
        <div
          className="absolute top-0 right-0 w-2 h-full cursor-e-resize opacity-0 group-hover:opacity-100 hover:bg-primary/20 transition-opacity"
          onMouseDown={(e) => onMouseDown(e, "right")}
        />
        <div
          className="absolute top-0 left-0 w-2 h-full cursor-w-resize opacity-0 group-hover:opacity-100 hover:bg-primary/20 transition-opacity"
          onMouseDown={(e) => onMouseDown(e, "left")}
        />
        {/* Corner handle */}
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          onMouseDown={(e) => onMouseDown(e, "right")}
        >
          <div className="w-2.5 h-2.5 border-r-2 border-b-2 border-primary/60 rounded-br-sm" />
        </div>
        {/* Size indicator */}
        {(selected || isResizing) && width && (
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground bg-secondary/90 px-1.5 py-0.5 rounded whitespace-nowrap">
            {Math.round(width)}px
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

const ResizableImage = Node.create({
  name: "image",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: { default: null },
      height: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "img[src]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent);
  },

  addCommands() {
    return {
      setImage:
        (options: { src: string; alt?: string; title?: string; width?: number; height?: number }) =>
        ({ commands }: any) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    } as any;
  },
});

export default ResizableImage;
