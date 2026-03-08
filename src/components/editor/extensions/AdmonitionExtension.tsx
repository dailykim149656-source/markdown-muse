import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import { useState, useCallback } from "react";
import { Info, AlertTriangle, Lightbulb, ShieldAlert, ChevronDown, Flame, Zap, Heart, Star, BookOpen, HelpCircle, CheckCircle, XCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const ADMONITION_ICONS = {
  info: Info,
  "alert-triangle": AlertTriangle,
  lightbulb: Lightbulb,
  "shield-alert": ShieldAlert,
  flame: Flame,
  zap: Zap,
  heart: Heart,
  star: Star,
  "book-open": BookOpen,
  "help-circle": HelpCircle,
  "check-circle": CheckCircle,
  "x-circle": XCircle,
} as const;

type IconKey = keyof typeof ADMONITION_ICONS;

const ADMONITION_COLORS = [
  { key: "blue", label: "파랑", border: "#3b82f6", bg: "rgba(59,130,246,0.06)", bgDark: "rgba(59,130,246,0.12)", text: "#2563eb", textDark: "#60a5fa" },
  { key: "green", label: "초록", border: "#22c55e", bg: "rgba(34,197,94,0.06)", bgDark: "rgba(34,197,94,0.12)", text: "#16a34a", textDark: "#4ade80" },
  { key: "yellow", label: "노랑", border: "#eab308", bg: "rgba(234,179,8,0.06)", bgDark: "rgba(234,179,8,0.12)", text: "#a16207", textDark: "#facc15" },
  { key: "red", label: "빨강", border: "#ef4444", bg: "rgba(239,68,68,0.06)", bgDark: "rgba(239,68,68,0.12)", text: "#dc2626", textDark: "#f87171" },
  { key: "purple", label: "보라", border: "#a855f7", bg: "rgba(168,85,247,0.06)", bgDark: "rgba(168,85,247,0.12)", text: "#9333ea", textDark: "#c084fc" },
  { key: "orange", label: "주황", border: "#f97316", bg: "rgba(249,115,22,0.06)", bgDark: "rgba(249,115,22,0.12)", text: "#ea580c", textDark: "#fb923c" },
  { key: "teal", label: "청록", border: "#14b8a6", bg: "rgba(20,184,166,0.06)", bgDark: "rgba(20,184,166,0.12)", text: "#0d9488", textDark: "#2dd4bf" },
  { key: "gray", label: "회색", border: "#6b7280", bg: "rgba(107,114,128,0.06)", bgDark: "rgba(107,114,128,0.12)", text: "#4b5563", textDark: "#9ca3af" },
] as const;

// Legacy type mapping for backward compat
const LEGACY_TYPE_MAP: Record<string, { icon: IconKey; color: string }> = {
  note: { icon: "info", color: "blue" },
  warning: { icon: "alert-triangle", color: "yellow" },
  tip: { icon: "lightbulb", color: "green" },
  danger: { icon: "shield-alert", color: "red" },
};

const getColor = (colorKey: string) => ADMONITION_COLORS.find(c => c.key === colorKey) || ADMONITION_COLORS[0];
const getIcon = (iconKey: string) => ADMONITION_ICONS[iconKey as IconKey] || Info;

const AdmonitionNodeView = ({ node, updateAttributes }: any) => {
  const type: string = node.attrs.type || "note";
  const title: string = node.attrs.title || "";
  const [collapsed, setCollapsed] = useState(false);

  // Resolve icon and color (support legacy types + custom)
  const legacy = LEGACY_TYPE_MAP[type];
  const iconKey: string = node.attrs.icon || legacy?.icon || "info";
  const colorKey: string = node.attrs.color || legacy?.color || "blue";
  const colorConfig = getColor(colorKey);
  const IconComp = getIcon(iconKey);
  const isDark = document.documentElement.classList.contains("dark");

  const labelForType = legacy ? { note: "노트", warning: "경고", tip: "팁", danger: "위험" }[type] || "노트" : "콜아웃";

  return (
    <NodeViewWrapper className="my-3">
      <div
        className="rounded-lg border-l-4 overflow-hidden"
        style={{
          borderLeftColor: colorConfig.border,
          background: isDark ? colorConfig.bgDark : colorConfig.bg,
        }}
      >
        <div className="flex items-center gap-2 px-3 py-2 cursor-default select-none" style={{ color: isDark ? colorConfig.textDark : colorConfig.text }}>
          {/* Icon picker */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="flex items-center justify-center h-5 w-5 rounded hover:opacity-70 transition-opacity"
                title="아이콘 변경"
                contentEditable={false}
              >
                <IconComp className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start" contentEditable={false}>
              <div className="grid grid-cols-6 gap-1">
                {Object.entries(ADMONITION_ICONS).map(([key, Ic]) => (
                  <button
                    key={key}
                    className={`h-7 w-7 flex items-center justify-center rounded hover:bg-accent transition-colors ${iconKey === key ? "bg-accent ring-1 ring-primary" : ""}`}
                    onClick={() => updateAttributes({ icon: key, type: "custom" })}
                    title={key}
                  >
                    <Ic className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <input
            value={title}
            onChange={(e) => updateAttributes({ title: e.target.value })}
            placeholder={labelForType}
            className="flex-1 bg-transparent text-sm font-semibold outline-none placeholder:opacity-60"
            style={{ color: "inherit" }}
            contentEditable={false}
          />

          {/* Color picker */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="h-4 w-4 rounded-full border border-border/50 shrink-0"
                style={{ background: colorConfig.border }}
                title="색상 변경"
                contentEditable={false}
              />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="end" contentEditable={false}>
              <div className="flex gap-1.5">
                {ADMONITION_COLORS.map((c) => (
                  <button
                    key={c.key}
                    className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${colorKey === c.key ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ background: c.border }}
                    onClick={() => updateAttributes({ color: c.key })}
                    title={c.label}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <button
            onClick={() => setCollapsed((c) => !c)}
            className="h-5 w-5 flex items-center justify-center rounded hover:opacity-70 transition-all"
            contentEditable={false}
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${collapsed ? "-rotate-90" : ""}`} />
          </button>
        </div>
        {!collapsed && (
          <div className="px-4 py-2 text-sm">
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
      icon: { default: "" },
      color: { default: "" },
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
        (attrs?: { type?: string; title?: string; icon?: string; color?: string }) =>
        ({ commands }: any) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              type: attrs?.type || "note",
              title: attrs?.title || "",
              icon: attrs?.icon || "",
              color: attrs?.color || "",
            },
            content: [{ type: "paragraph" }],
          });
        },
    } as any;
  },
});

export default AdmonitionExtension;
export { ADMONITION_COLORS, ADMONITION_ICONS, LEGACY_TYPE_MAP, getColor };
export type { IconKey };
