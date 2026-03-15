import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

const safeJsonParse = <T,>(value: string | null | undefined, fallback: T): T => {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const stringifyJson = (value: unknown) => JSON.stringify(value);

const SectionBadge = ({ value }: { value: string }) => (
  <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
    {value}
  </span>
);

const PanelShell = ({
  badge,
  children,
  className = "",
}: {
  badge: string;
  children: ReactNode;
  className?: string;
}) => (
  <NodeViewWrapper className={`my-3 ${className}`.trim()}>
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3">
        <SectionBadge value={badge} />
      </div>
      {children}
    </div>
  </NodeViewWrapper>
);

const Input = ({
  className = "",
  onChange,
  placeholder,
  value,
}: {
  className?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) => (
  <input
    className={`w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary ${className}`.trim()}
    contentEditable={false}
    onChange={(event) => onChange(event.target.value)}
    placeholder={placeholder}
    value={value}
  />
);

const Textarea = ({
  className = "",
  onChange,
  placeholder,
  rows = 3,
  value,
}: {
  className?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  value: string;
}) => (
  <textarea
    className={`w-full rounded-md border border-border bg-background px-3 py-2 text-sm leading-6 outline-none focus:border-primary ${className}`.trim()}
    contentEditable={false}
    onChange={(event) => onChange(event.target.value)}
    placeholder={placeholder}
    rows={rows}
    value={value}
  />
);

const ResumeHeaderNodeView = ({ node, updateAttributes }: any) => (
  <PanelShell badge="Resume Header">
    <div className="grid gap-3 md:grid-cols-2">
      <div className="space-y-3">
        <Input onChange={(value) => updateAttributes({ name: value })} placeholder="Name" value={node.attrs.name || ""} />
        <Input
          onChange={(value) => updateAttributes({ primaryLinkLabel: value })}
          placeholder="Primary link label"
          value={node.attrs.primaryLinkLabel || ""}
        />
        <Input
          onChange={(value) => updateAttributes({ primaryLinkUrl: value })}
          placeholder="Primary link URL"
          value={node.attrs.primaryLinkUrl || ""}
        />
        <Input
          onChange={(value) => updateAttributes({ secondaryLinkLabel: value })}
          placeholder="Secondary link label"
          value={node.attrs.secondaryLinkLabel || ""}
        />
        <Input
          onChange={(value) => updateAttributes({ secondaryLinkUrl: value })}
          placeholder="Secondary link URL"
          value={node.attrs.secondaryLinkUrl || ""}
        />
      </div>
      <div className="space-y-3">
        <Textarea
          onChange={(value) => updateAttributes({ rightPrimary: value })}
          placeholder="Right-side primary line"
          rows={3}
          value={node.attrs.rightPrimary || ""}
        />
        <Input onChange={(value) => updateAttributes({ email: value })} placeholder="Email" value={node.attrs.email || ""} />
        <Input onChange={(value) => updateAttributes({ phone: value })} placeholder="Phone" value={node.attrs.phone || ""} />
        <Input
          onChange={(value) => updateAttributes({ tertiaryRight: value })}
          placeholder="Third right-side line"
          value={node.attrs.tertiaryRight || ""}
        />
      </div>
    </div>
  </PanelShell>
);

const ResumeSummaryNodeView = ({ node, updateAttributes }: any) => (
  <PanelShell badge="Resume Summary">
    <Textarea
      onChange={(value) => updateAttributes({ summary: value })}
      placeholder="Summary"
      rows={5}
      value={node.attrs.summary || ""}
    />
  </PanelShell>
);

const ResumeEntryNodeView = ({ node, updateAttributes }: any) => {
  const details = Array.isArray(node.attrs.details) ? node.attrs.details : [];
  const detailsText = details.join("\n");

  return (
    <PanelShell badge={node.attrs.commandName || "Resume Entry"}>
      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <Input onChange={(value) => updateAttributes({ title: value })} placeholder="Title" value={node.attrs.title || ""} />
          <Input
            onChange={(value) => updateAttributes({ trailingText: value })}
            placeholder="Right-side text"
            value={node.attrs.trailingText || ""}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input onChange={(value) => updateAttributes({ subtitle: value })} placeholder="Subtitle" value={node.attrs.subtitle || ""} />
          <Input
            onChange={(value) => updateAttributes({ tertiaryText: value })}
            placeholder="Secondary right-side text"
            value={node.attrs.tertiaryText || ""}
          />
        </div>
        <Textarea
          onChange={(value) => updateAttributes({ description: value })}
          placeholder="Description"
          rows={3}
          value={node.attrs.description || ""}
        />
        <Textarea
          onChange={(value) => updateAttributes({
            details: value.split("\n").map((line) => line.trim()).filter(Boolean),
          })}
          placeholder="One detail per line"
          rows={Math.max(3, details.length || 3)}
          value={detailsText}
        />
      </div>
    </PanelShell>
  );
};

const ResumeSkillRowNodeView = ({ node, updateAttributes }: any) => {
  const items = Array.isArray(node.attrs.items) ? node.attrs.items : [];

  return (
    <PanelShell badge="Resume Skills">
      <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
        <Input
          onChange={(value) => updateAttributes({
            label: value,
            rawText: `${value ? `\\textbf{${value}} - ` : ""}${items.join(", ")}`,
          })}
          placeholder="Skill label"
          value={node.attrs.label || ""}
        />
        <Textarea
          onChange={(value) => updateAttributes({
            items: value.split(",").map((item) => item.trim()).filter(Boolean),
            rawText: `${node.attrs.label ? `\\textbf{${node.attrs.label}} - ` : ""}${value}`,
          })}
          placeholder="Comma-separated skills"
          rows={3}
          value={items.join(", ")}
        />
      </div>
    </PanelShell>
  );
};

const LatexTitleBlockNodeView = ({ node, updateAttributes }: any) => (
  <PanelShell badge="LaTeX Title">
    <div className="space-y-3">
      <Input onChange={(value) => updateAttributes({ title: value })} placeholder="Title" value={node.attrs.title || ""} />
      <Input onChange={(value) => updateAttributes({ author: value })} placeholder="Author" value={node.attrs.author || ""} />
      <Input onChange={(value) => updateAttributes({ date: value })} placeholder="Date" value={node.attrs.date || ""} />
    </div>
  </PanelShell>
);

const LatexAbstractNodeView = ({ node, updateAttributes }: any) => (
  <PanelShell badge="Abstract">
    <Textarea
      onChange={(value) => updateAttributes({ content: value })}
      placeholder="Abstract"
      rows={6}
      value={node.attrs.content || ""}
    />
  </PanelShell>
);

const OpaqueLatexBlockNodeView = ({ node, updateAttributes }: any) => {
  const [expanded, setExpanded] = useState(false);
  const rawLatex = node.attrs.rawLatex || "";
  const previewLine = rawLatex
    .split("\n")
    .map((line: string) => line.trim())
    .find((line: string) => line.length > 0) || "Raw LaTeX";

  return (
    <PanelShell badge={node.attrs.label || "Opaque LaTeX"} className="font-mono">
      <div className="space-y-3">
        <button
          className="flex w-full items-center justify-between rounded-md border border-border bg-secondary/40 px-3 py-2 text-left text-xs"
          contentEditable={false}
          onClick={() => setExpanded((value) => !value)}
          type="button"
        >
          <span className="truncate">{previewLine}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
        {expanded && (
          <Textarea
            className="font-mono text-xs"
            onChange={(value) => updateAttributes({ rawLatex: value })}
            placeholder="Raw LaTeX"
            rows={10}
            value={rawLatex}
          />
        )}
      </div>
    </PanelShell>
  );
};

const createAttr = <T,>(name: string, fallback: T, parse?: (value: string | null) => T) => ({
  default: fallback,
  parseHTML: (element: HTMLElement) => parse ? parse(element.getAttribute(name)) : (element.getAttribute(name) as unknown as T),
  renderHTML: (attributes: Record<string, unknown>) => {
    const value = attributes[name];

    if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
      return {};
    }

    return {
      [name]: Array.isArray(value) || typeof value === "object"
        ? stringifyJson(value)
        : String(value),
    };
  },
});

const createAtomBlockNode = (config: {
  attrs: Record<string, ReturnType<typeof createAttr<any>>>;
  htmlTag: string;
  nodeName: string;
  renderText?: (node: any) => string;
  view: ComponentType<any>;
}) => Node.create({
  name: config.nodeName,
  group: "block",
  atom: true,

  addAttributes() {
    return config.attrs;
  },

  parseHTML() {
    return [{ tag: `div[data-type="${config.htmlTag}"]` }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, {
      "data-type": config.htmlTag,
    }), config.renderText ? config.renderText({ attrs: HTMLAttributes }) : ""];
  },

  addNodeView() {
    return ReactNodeViewRenderer(config.view);
  },
});

const ResumeHeaderExtension = createAtomBlockNode({
  attrs: {
    email: createAttr("data-email", ""),
    name: createAttr("data-name", ""),
    phone: createAttr("data-phone", ""),
    primaryLinkLabel: createAttr("data-primary-link-label", ""),
    primaryLinkUrl: createAttr("data-primary-link-url", ""),
    rightPrimary: createAttr("data-right-primary", ""),
    secondaryLinkLabel: createAttr("data-secondary-link-label", ""),
    secondaryLinkUrl: createAttr("data-secondary-link-url", ""),
    tertiaryRight: createAttr("data-tertiary-right", ""),
  },
  htmlTag: "resume-header",
  nodeName: "resumeHeader",
  renderText: (node) => `${node.attrs["data-name"] || ""}`,
  view: ResumeHeaderNodeView,
});

const ResumeSummaryExtension = createAtomBlockNode({
  attrs: {
    summary: createAttr("data-summary", ""),
  },
  htmlTag: "resume-summary",
  nodeName: "resumeSummary",
  renderText: (node) => `${node.attrs["data-summary"] || ""}`,
  view: ResumeSummaryNodeView,
});

const ResumeEntryExtension = createAtomBlockNode({
  attrs: {
    commandName: createAttr("data-command-name", ""),
    description: createAttr("data-description", ""),
    details: createAttr("data-details", [] as string[], (value) => safeJsonParse(value, [] as string[])),
    subtitle: createAttr("data-subtitle", ""),
    tertiaryText: createAttr("data-tertiary-text", ""),
    title: createAttr("data-title", ""),
    trailingText: createAttr("data-trailing-text", ""),
  },
  htmlTag: "resume-entry",
  nodeName: "resumeEntry",
  renderText: (node) => `${node.attrs["data-title"] || ""}`,
  view: ResumeEntryNodeView,
});

const ResumeSkillRowExtension = createAtomBlockNode({
  attrs: {
    commandName: createAttr("data-command-name", "resumeSkills"),
    items: createAttr("data-items", [] as string[], (value) => safeJsonParse(value, [] as string[])),
    label: createAttr("data-label", ""),
    rawText: createAttr("data-raw-text", ""),
  },
  htmlTag: "resume-skill-row",
  nodeName: "resumeSkillRow",
  renderText: (node) => `${node.attrs["data-label"] || node.attrs["data-raw-text"] || ""}`,
  view: ResumeSkillRowNodeView,
});

const OpaqueLatexBlockExtension = createAtomBlockNode({
  attrs: {
    label: createAttr("data-label", ""),
    rawLatex: createAttr("data-raw-latex", ""),
  },
  htmlTag: "opaque-latex-block",
  nodeName: "opaqueLatexBlock",
  renderText: (node) => `${node.attrs["data-label"] || "Raw LaTeX"}`,
  view: OpaqueLatexBlockNodeView,
});

const LatexTitleBlockExtension = createAtomBlockNode({
  attrs: {
    author: createAttr("data-author", ""),
    date: createAttr("data-date", ""),
    title: createAttr("data-title", ""),
  },
  htmlTag: "latex-title-block",
  nodeName: "latexTitleBlock",
  renderText: (node) => `${node.attrs["data-title"] || ""}`,
  view: LatexTitleBlockNodeView,
});

const LatexAbstractExtension = createAtomBlockNode({
  attrs: {
    content: createAttr("data-content", ""),
  },
  htmlTag: "latex-abstract",
  nodeName: "latexAbstract",
  renderText: (node) => `${node.attrs["data-content"] || ""}`,
  view: LatexAbstractNodeView,
});

export {
  LatexAbstractExtension,
  LatexTitleBlockExtension,
  OpaqueLatexBlockExtension,
  ResumeEntryExtension,
  ResumeHeaderExtension,
  ResumeSkillRowExtension,
  ResumeSummaryExtension,
};
