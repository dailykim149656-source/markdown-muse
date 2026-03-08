import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import { useState, useCallback } from "react";
import { Info, AlertTriangle, Lightbulb, ShieldAlert, ChevronDown } from "lucide-react";

const ADMONITION_TYPES = {
  note: { label: "노트", icon: Info, colorClass: "admonition-note" },
  warning: { label: "경고", icon: AlertTriangle, colorClass: "admonition-warning" },
  tip: { label: "팁", icon: Lightbulb, colorClass: "admonition-tip" },
  danger: { label: "위험", icon: ShieldAlert, colorClass: "admonition-danger" },
} as const;

type AdmonitionType = keyof typeof ADMONITION_TYPES;

const AdmonitionNodeView = ({ node, updateAttributes, editor }: any) => {
  const type: AdmonitionType = node.attrs.type || "note";
  const title: string = node.attrs.title || "";
  const [collapsed, setCollapsed] = useState(false);
  const config = ADMONITION_TYPES[type];
  const Icon = config.icon;

  const cycleType = useCallback(() => {
    const types: AdmonitionType[] = ["note", "warning", "tip", "danger"];
    const idx = types.indexOf(type);
    const next = types[(idx + 1) % types.length];
    updateAttributes({ type: next });
  }, [type, updateAttributes]);

  return (
    <NodeViewWrapper className={`my-3 ${config.colorClass}`}>
      <div className="admonition-container rounded-lg border-l-4 overflow-hidden">
        <div className="admonition-header flex items-center gap-2 px-3 py-2 cursor-default select-none">
          <button
            onClick={cycleType}
            className="admonition-icon-btn flex items-center justify-center h-5 w-5 rounded hover:opacity-70 transition-opacity"
            title="타입 변경"
            contentEditable={false}
          >
            <Icon className="h-4 w-4" />
          </button>
          <input
            value={title}
            onChange={(e) => updateAttributes({ title: e.target.value })}
            placeholder={config.label}
            className="flex-1 bg-transparent text-sm font-semibold outline-none placeholder:opacity-60"
            contentEditable={false}
          />
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="h-5 w-5 flex items-center justify-center rounded hover:opacity-70 transition-all"
            contentEditable={false}
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${collapsed ? "-rotate-90" : ""}`} />
          </button>
        </div>
        {!collapsed && (
          <div className="admonition-body px-4 py-2 text-sm">
            <NodeViewContent className="admonition-content" />
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

const AdmonitionExtension = Node.create({
  name: "admonition",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      type: { default: "note" },
      title: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="admonition"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "admonition" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AdmonitionNodeView);
  },

  addCommands() {
    return {
      insertAdmonition:
        (attrs?: { type?: string; title?: string }) =>
        ({ commands }: any) => {
          return commands.insertContent({
            type: this.name,
            attrs: { type: attrs?.type || "note", title: attrs?.title || "" },
            content: [{ type: "paragraph" }],
          });
        },
    } as any;
  },
});

export default AdmonitionExtension;
export { ADMONITION_TYPES };
export type { AdmonitionType };
