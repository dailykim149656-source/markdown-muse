import type { JSONContent } from "@tiptap/core";
import type {
  AdmonitionNode,
  BlockNode,
  BlockQuoteNode,
  BulletListNode,
  CodeBlockNode,
  CrossReferenceNode,
  DocumentAst,
  FigureCaptionNode,
  FootnoteItemNode,
  FootnoteRefNode,
  HardBreakNode,
  HeadingLevel,
  HeadingNode,
  HorizontalRuleNode,
  LatexAbstractNode,
  LatexTitleBlockNode,
  ImageNode,
  InlineNode,
  LinkMark,
  ListItemNode,
  Mark,
  MathBlockNode,
  MathInlineNode,
  MermaidBlockNode,
  OrderedListNode,
  OpaqueLatexBlockNode,
  ParagraphNode,
  ResumeEntryNode,
  ResumeHeaderNode,
  ResumeSkillRowNode,
  ResumeSummaryNode,
  TableCellNode,
  TableNode,
  TableOfContentsNode,
  TableRowNode,
  TaskListItemNode,
  TaskListNode,
  TextNode,
  TextStyleMark,
  TextAlign,
} from "@/types/documentAst";

interface SerializeOptions {
  documentNodeId?: string;
  throwOnUnsupported?: boolean;
}

type TiptapMark = NonNullable<JSONContent["marks"]>[number];

const DEFAULT_SERIALIZE_OPTIONS: Required<SerializeOptions> = {
  documentNodeId: "doc_root",
  throwOnUnsupported: true,
};

const clampHeadingLevel = (level: number | undefined): HeadingLevel => {
  if (level === 1 || level === 2 || level === 3) {
    return level;
  }

  return 1;
};

const createFallbackNodeId = (prefix: string, path: number[]) => {
  if (path.length === 0) {
    return `${prefix}_root`;
  }

  return `${prefix}_${path.join("_")}`;
};

const resolveNodeId = (node: JSONContent, prefix: string, path: number[]) => {
  const nodeId = typeof node.attrs?.nodeId === "string" ? node.attrs.nodeId : undefined;
  return nodeId || createFallbackNodeId(prefix, path);
};

const getTextAlign = (node: JSONContent): TextAlign | undefined => {
  const textAlign = node.attrs?.textAlign;

  if (textAlign === "left" || textAlign === "center" || textAlign === "right" || textAlign === "justify") {
    return textAlign;
  }

  return undefined;
};

const toPlainText = (nodes: InlineNode[]) =>
  nodes
    .map((node) => {
      if (node.type === "text") {
        return node.text;
      }

      if (node.type === "hard_break") {
        return "\n";
      }

      if (node.type === "math_inline") {
        return node.latex;
      }

      if (node.type === "cross_reference") {
        return node.targetLabel;
      }

      if (node.type === "footnote_ref") {
        return node.footnoteId;
      }

      return "";
    })
    .join("");

const serializeMarks = (marks: JSONContent["marks"]): Mark[] | undefined => {
  if (!marks?.length) {
    return undefined;
  }

  const result: Mark[] = [];

  for (const mark of marks) {
    if (!mark?.type) {
      continue;
    }

    switch (mark.type) {
      case "bold":
      case "italic":
      case "underline":
      case "strike":
      case "code":
      case "highlight":
      case "subscript":
      case "superscript":
        result.push({ type: mark.type });
        break;
      case "link":
        result.push({
          type: "link",
          href: String(mark.attrs?.href || ""),
          title: typeof mark.attrs?.title === "string" ? mark.attrs.title : undefined,
        } satisfies LinkMark);
        break;
      case "textStyle":
        result.push({
          type: "text_style",
          color: typeof mark.attrs?.color === "string" ? mark.attrs.color : undefined,
          fontFamily: typeof mark.attrs?.fontFamily === "string" ? mark.attrs.fontFamily : undefined,
          fontSize: typeof mark.attrs?.fontSize === "string" ? mark.attrs.fontSize : undefined,
        } satisfies TextStyleMark);
        break;
      default:
        break;
    }
  }

  return result.length ? result : undefined;
};

const hydrateMarks = (marks?: Mark[]): TiptapMark[] | undefined => {
  if (!marks?.length) {
    return undefined;
  }

  const result: TiptapMark[] = [];

  for (const mark of marks) {
    switch (mark.type) {
      case "bold":
      case "italic":
      case "underline":
      case "strike":
      case "code":
      case "highlight":
      case "subscript":
      case "superscript":
        result.push({ type: mark.type });
        break;
      case "link":
        result.push({ type: "link", attrs: { href: mark.href, title: mark.title } });
        break;
      case "text_style":
        result.push({
          type: "textStyle",
          attrs: {
            color: mark.color,
            fontFamily: mark.fontFamily,
            fontSize: mark.fontSize,
          },
        });
        break;
      default:
        break;
    }
  }

  return result.length ? result : undefined;
};

const withNodeIdAttr = (attrs: Record<string, unknown> | undefined, nodeId: string) => ({
  ...(attrs || {}),
  nodeId,
});

const serializeInlineNode = (
  node: JSONContent,
  path: number[],
  throwOnUnsupported: boolean
): InlineNode | null => {
  if (node.type === "text") {
    return {
      type: "text",
      text: node.text || "",
      marks: serializeMarks(node.marks),
    } satisfies TextNode;
  }

  switch (node.type) {
    case "hardBreak":
      return {
        type: "hard_break",
        kind: "inline",
        nodeId: resolveNodeId(node, "inl", path),
      } satisfies HardBreakNode;
    case "math":
      return {
        type: "math_inline",
        kind: "inline",
        nodeId: resolveNodeId(node, "inl", path),
        latex: String(node.attrs?.latex || ""),
      } satisfies MathInlineNode;
    case "crossReference":
      return {
        type: "cross_reference",
        kind: "inline",
        nodeId: resolveNodeId(node, "inl", path),
        targetLabel: String(node.attrs?.targetLabel || ""),
        targetNodeId: typeof node.attrs?.targetNodeId === "string" ? node.attrs.targetNodeId : undefined,
        referenceKind: typeof node.attrs?.referenceKind === "string" ? node.attrs.referenceKind : undefined,
      } satisfies CrossReferenceNode;
    case "footnoteRef":
      return {
        type: "footnote_ref",
        kind: "inline",
        nodeId: resolveNodeId(node, "inl", path),
        footnoteId: String(node.attrs?.id || ""),
      } satisfies FootnoteRefNode;
    default:
      if (throwOnUnsupported) {
        throw new Error(`Unsupported inline node type: ${node.type || "unknown"}`);
      }

      return null;
  }
};

const serializeInlineNodes = (
  content: JSONContent[] | undefined,
  parentPath: number[],
  throwOnUnsupported: boolean
): InlineNode[] => {
  if (!content?.length) {
    return [];
  }

  return content
    .map((node, index) => serializeInlineNode(node, [...parentPath, index], throwOnUnsupported))
    .filter((node): node is InlineNode => Boolean(node));
};

const serializeTableRows = (
  content: JSONContent[] | undefined,
  parentPath: number[],
  throwOnUnsupported: boolean
): TableRowNode[] => {
  if (!content?.length) {
    return [];
  }

  return content
    .filter((row) => row.type === "tableRow")
    .map((row, rowIndex) => ({
      type: "table_row",
      nodeId: resolveNodeId(row, "row", [...parentPath, rowIndex]),
      cells: (row.content || [])
        .filter((cell) => cell.type === "tableCell" || cell.type === "tableHeader")
        .map((cell, cellIndex) => ({
          type: "table_cell",
          nodeId: resolveNodeId(cell, "cell", [...parentPath, rowIndex, cellIndex]),
          role: cell.type === "tableHeader" ? "header" : "body",
          align: typeof cell.attrs?.textAlign === "string" ? cell.attrs.textAlign : undefined,
          blocks: serializeBlockNodes(cell.content, [...parentPath, rowIndex, cellIndex], throwOnUnsupported),
        } satisfies TableCellNode)),
    } satisfies TableRowNode));
};

const serializeBlockNode = (
  node: JSONContent,
  path: number[],
  throwOnUnsupported: boolean
): BlockNode | null => {
  switch (node.type) {
    case "paragraph":
      return {
        type: "paragraph",
        kind: "block",
        nodeId: resolveNodeId(node, "blk", path),
        align: getTextAlign(node),
        children: serializeInlineNodes(node.content, path, throwOnUnsupported),
      } satisfies ParagraphNode;
    case "heading":
      return {
        type: "heading",
        kind: "block",
        nodeId: resolveNodeId(node, "blk", path),
        level: clampHeadingLevel(Number(node.attrs?.level)),
        align: getTextAlign(node),
        children: serializeInlineNodes(node.content, path, throwOnUnsupported),
      } satisfies HeadingNode;
    case "blockquote":
      return {
        type: "blockquote",
        kind: "block",
        nodeId: resolveNodeId(node, "blk", path),
        blocks: serializeBlockNodes(node.content, path, throwOnUnsupported),
      } satisfies BlockQuoteNode;
    case "codeBlock":
      return {
        type: "code_block",
        kind: "block",
        nodeId: resolveNodeId(node, "blk", path),
        language: typeof node.attrs?.language === "string" ? node.attrs.language : undefined,
        code: node.content?.map((child) => child.text || "").join("") || "",
      } satisfies CodeBlockNode;
    case "bulletList":
      return {
        type: "bullet_list",
        kind: "block",
        nodeId: resolveNodeId(node, "blk", path),
        items: serializeBlockNodes(node.content, path, throwOnUnsupported) as ListItemNode[],
      } satisfies BulletListNode;
    case "orderedList":
      return {
        type: "ordered_list",
        kind: "block",
        nodeId: resolveNodeId(node, "blk", path),
        start: typeof node.attrs?.start === "number" ? node.attrs.start : undefined,
        items: serializeBlockNodes(node.content, path, throwOnUnsupported) as ListItemNode[],
      } satisfies OrderedListNode;
    case "taskList":
      return {
        type: "task_list",
        kind: "block",
        nodeId: resolveNodeId(node, "blk", path),
        items: serializeBlockNodes(node.content, path, throwOnUnsupported) as TaskListItemNode[],
      } satisfies TaskListNode;
    case "listItem":
      return {
        type: "list_item",
        kind: "block",
        nodeId: resolveNodeId(node, "blk", path),
        blocks: serializeBlockNodes(node.content, path, throwOnUnsupported),
      } satisfies ListItemNode;
    case "taskItem":
      return {
        type: "task_list_item",
        kind: "block",
        nodeId: resolveNodeId(node, "blk", path),
        checked: Boolean(node.attrs?.checked),
        blocks: serializeBlockNodes(node.content, path, throwOnUnsupported),
      } satisfies TaskListItemNode;
    case "horizontalRule":
      return {
        type: "horizontal_rule",
        kind: "block",
        nodeId: resolveNodeId(node, "blk", path),
      } satisfies HorizontalRuleNode;
    case "image":
      return {
        type: "image",
        kind: "block",
        nodeId: resolveNodeId(node, "blk", path),
        src: String(node.attrs?.src || ""),
        alt: typeof node.attrs?.alt === "string" ? node.attrs.alt : undefined,
        title: typeof node.attrs?.title === "string" ? node.attrs.title : undefined,
        width: typeof node.attrs?.width === "number" ? node.attrs.width : undefined,
        height: typeof node.attrs?.height === "number" ? node.attrs.height : undefined,
        align: typeof node.attrs?.align === "string" ? node.attrs.align : undefined,
      } satisfies ImageNode;
    case "figureCaption":
      return {
        type: "figure_caption",
        kind: "block",
        nodeId: resolveNodeId(node, "blk", path),
        captionType: node.attrs?.captionType === "table" ? "table" : "figure",
        label: typeof node.attrs?.label === "string" ? node.attrs.label : undefined,
        targetNodeId: typeof node.attrs?.targetNodeId === "string" ? node.attrs.targetNodeId : undefined,
        children: [{
          type: "text",
          text: String(node.attrs?.captionText || ""),
        }],
      } satisfies FigureCaptionNode;
    case "table":
      return {
        type: "table",
        kind: "block",
        nodeId: resolveNodeId(node, "blk", path),
        rows: serializeTableRows(node.content, path, throwOnUnsupported),
      } satisfies TableNode;
    case "mathBlock":
      return {
        type: "math_block",
        kind: "block",
        nodeId: resolveNodeId(node, "blk", path),
        latex: String(node.attrs?.latex || ""),
      } satisfies MathBlockNode;
    case "mermaidBlock":
      return {
        type: "mermaid_block",
        kind: "block",
        nodeId: resolveNodeId(node, "blk", path),
        code: String(node.attrs?.code || ""),
      } satisfies MermaidBlockNode;
    case "admonition":
      return {
        type: "admonition",
        kind: "block",
        nodeId: resolveNodeId(node, "blk", path),
        admonitionType:
          node.attrs?.type === "warning" || node.attrs?.type === "tip" || node.attrs?.type === "danger" || node.attrs?.type === "custom"
            ? node.attrs.type
            : "note",
        title: typeof node.attrs?.title === "string" ? node.attrs.title : undefined,
        icon: typeof node.attrs?.icon === "string" ? node.attrs.icon : undefined,
        color: typeof node.attrs?.color === "string" ? node.attrs.color : undefined,
        blocks: serializeBlockNodes(node.content, path, throwOnUnsupported),
      } satisfies AdmonitionNode;
    case "opaqueLatexBlock":
      return {
        type: "opaque_latex_block",
        kind: "block",
        nodeId: resolveNodeId(node, "blk", path),
        label: typeof node.attrs?.label === "string" ? node.attrs.label : undefined,
        rawLatex: String(node.attrs?.rawLatex || ""),
      } satisfies OpaqueLatexBlockNode;
    case "resumeHeader":
      return {
        type: "resume_header",
        kind: "block",
        nodeId: resolveNodeId(node, "blk", path),
        email: typeof node.attrs?.email === "string" ? node.attrs.email : undefined,
        name: String(node.attrs?.name || ""),
        phone: typeof node.attrs?.phone === "string" ? node.attrs.phone : undefined,
        primaryLinkLabel: typeof node.attrs?.primaryLinkLabel === "string" ? node.attrs.primaryLinkLabel : undefined,
        primaryLinkUrl: typeof node.attrs?.primaryLinkUrl === "string" ? node.attrs.primaryLinkUrl : undefined,
        rightPrimary: typeof node.attrs?.rightPrimary === "string" ? node.attrs.rightPrimary : undefined,
        secondaryLinkLabel: typeof node.attrs?.secondaryLinkLabel === "string" ? node.attrs.secondaryLinkLabel : undefined,
        secondaryLinkUrl: typeof node.attrs?.secondaryLinkUrl === "string" ? node.attrs.secondaryLinkUrl : undefined,
        tertiaryRight: typeof node.attrs?.tertiaryRight === "string" ? node.attrs.tertiaryRight : undefined,
      } satisfies ResumeHeaderNode;
    case "resumeSummary":
      return {
        type: "resume_summary",
        kind: "block",
        nodeId: resolveNodeId(node, "blk", path),
        summary: String(node.attrs?.summary || ""),
      } satisfies ResumeSummaryNode;
    case "resumeEntry":
      return {
        type: "resume_entry",
        kind: "block",
        nodeId: resolveNodeId(node, "blk", path),
        commandName: (node.attrs?.commandName || "resumeEmployment") as ResumeEntryNode["commandName"],
        description: typeof node.attrs?.description === "string" ? node.attrs.description : undefined,
        details: Array.isArray(node.attrs?.details) ? node.attrs.details.map((entry: unknown) => String(entry)) : [],
        subtitle: typeof node.attrs?.subtitle === "string" ? node.attrs.subtitle : undefined,
        tertiaryText: typeof node.attrs?.tertiaryText === "string" ? node.attrs.tertiaryText : undefined,
        title: String(node.attrs?.title || ""),
        trailingText: typeof node.attrs?.trailingText === "string" ? node.attrs.trailingText : undefined,
      } satisfies ResumeEntryNode;
    case "resumeSkillRow":
      return {
        type: "resume_skill_row",
        kind: "block",
        nodeId: resolveNodeId(node, "blk", path),
        commandName: "resumeSkills",
        items: Array.isArray(node.attrs?.items) ? node.attrs.items.map((entry: unknown) => String(entry)) : [],
        label: typeof node.attrs?.label === "string" ? node.attrs.label : undefined,
        rawText: String(node.attrs?.rawText || ""),
      } satisfies ResumeSkillRowNode;
    case "latexTitleBlock":
      return {
        type: "latex_title_block",
        kind: "block",
        nodeId: resolveNodeId(node, "blk", path),
        author: typeof node.attrs?.author === "string" ? node.attrs.author : undefined,
        date: typeof node.attrs?.date === "string" ? node.attrs.date : undefined,
        title: String(node.attrs?.title || ""),
      } satisfies LatexTitleBlockNode;
    case "latexAbstract":
      return {
        type: "latex_abstract",
        kind: "block",
        nodeId: resolveNodeId(node, "blk", path),
        content: String(node.attrs?.content || ""),
      } satisfies LatexAbstractNode;
    case "tableOfContents":
      return {
        type: "table_of_contents",
        kind: "block",
        nodeId: resolveNodeId(node, "blk", path),
        maxDepth: typeof node.attrs?.maxDepth === "number" ? clampHeadingLevel(node.attrs.maxDepth) : undefined,
      } satisfies TableOfContentsNode;
    case "footnoteItem":
      return {
        type: "footnote_item",
        kind: "block",
        nodeId: resolveNodeId(node, "blk", path),
        footnoteId: String(node.attrs?.id || ""),
        children: [{
          type: "text",
          text: String(node.attrs?.text || ""),
        }],
      } satisfies FootnoteItemNode;
    default:
      if (throwOnUnsupported) {
        throw new Error(`Unsupported block node type: ${node.type || "unknown"}`);
      }

      return null;
  }
};

const serializeBlockNodes = (
  content: JSONContent[] | undefined,
  parentPath: number[],
  throwOnUnsupported: boolean
): BlockNode[] => {
  if (!content?.length) {
    return [];
  }

  return content
    .map((node, index) => serializeBlockNode(node, [...parentPath, index], throwOnUnsupported))
    .filter((node): node is BlockNode => Boolean(node));
};

export const serializeTiptapToAst = (document: JSONContent, options: SerializeOptions = {}): DocumentAst => {
  const resolvedOptions = { ...DEFAULT_SERIALIZE_OPTIONS, ...options };

  if (document.type !== "doc") {
    throw new Error(`Expected TipTap root node type "doc", received "${document.type || "unknown"}".`);
  }

  return {
    type: "document",
    nodeId: resolvedOptions.documentNodeId,
    blocks: serializeBlockNodes(document.content, [], resolvedOptions.throwOnUnsupported),
  };
};

const hydrateInlineNode = (node: InlineNode): JSONContent => {
  switch (node.type) {
    case "text":
      return {
        type: "text",
        text: node.text,
        marks: hydrateMarks(node.marks),
      };
    case "hard_break":
      return { type: "hardBreak" };
    case "math_inline":
      return { type: "math", attrs: withNodeIdAttr({ latex: node.latex, display: "inline" }, node.nodeId) };
    case "cross_reference":
      return {
        type: "crossReference",
        attrs: withNodeIdAttr({
          targetLabel: node.targetLabel,
          targetNodeId: node.targetNodeId,
          referenceKind: node.referenceKind,
        }, node.nodeId),
      };
    case "footnote_ref":
      return {
        type: "footnoteRef",
        attrs: withNodeIdAttr({ id: node.footnoteId }, node.nodeId),
      };
    default:
      throw new Error(`Unsupported AST inline node type: ${(node as InlineNode).type}`);
  }
};

const hydrateBlockNode = (node: BlockNode): JSONContent => {
  switch (node.type) {
    case "paragraph":
      return {
        type: "paragraph",
        attrs: withNodeIdAttr({ textAlign: node.align }, node.nodeId),
        content: node.children.map(hydrateInlineNode),
      };
    case "heading":
      return {
        type: "heading",
        attrs: withNodeIdAttr({ level: node.level, textAlign: node.align }, node.nodeId),
        content: node.children.map(hydrateInlineNode),
      };
    case "blockquote":
      return {
        type: "blockquote",
        attrs: withNodeIdAttr(undefined, node.nodeId),
        content: node.blocks.map(hydrateBlockNode),
      };
    case "code_block":
      return {
        type: "codeBlock",
        attrs: withNodeIdAttr({ language: node.language }, node.nodeId),
        content: node.code ? [{ type: "text", text: node.code }] : [],
      };
    case "bullet_list":
      return {
        type: "bulletList",
        attrs: withNodeIdAttr(undefined, node.nodeId),
        content: node.items.map(hydrateBlockNode),
      };
    case "ordered_list":
      return {
        type: "orderedList",
        attrs: withNodeIdAttr({ start: node.start }, node.nodeId),
        content: node.items.map(hydrateBlockNode),
      };
    case "task_list":
      return {
        type: "taskList",
        attrs: withNodeIdAttr(undefined, node.nodeId),
        content: node.items.map(hydrateBlockNode),
      };
    case "list_item":
      return {
        type: "listItem",
        attrs: withNodeIdAttr(undefined, node.nodeId),
        content: node.blocks.map(hydrateBlockNode),
      };
    case "task_list_item":
      return {
        type: "taskItem",
        attrs: withNodeIdAttr({ checked: node.checked }, node.nodeId),
        content: node.blocks.map(hydrateBlockNode),
      };
    case "horizontal_rule":
      return { type: "horizontalRule", attrs: withNodeIdAttr(undefined, node.nodeId) };
    case "image":
      return {
        type: "image",
        attrs: withNodeIdAttr({
          src: node.src,
          alt: node.alt,
          title: node.title,
          width: node.width,
          height: node.height,
          align: node.align,
        }, node.nodeId),
      };
    case "figure_caption":
      return {
        type: "figureCaption",
        attrs: withNodeIdAttr({
          captionType: node.captionType,
          label: node.label,
          targetNodeId: node.targetNodeId,
          captionText: toPlainText(node.children),
        }, node.nodeId),
      };
    case "table":
      return {
        type: "table",
        content: node.rows.map((row) => ({
          type: "tableRow",
          attrs: withNodeIdAttr(undefined, row.nodeId),
          content: row.cells.map((cell) => ({
            type: cell.role === "header" ? "tableHeader" : "tableCell",
            attrs: withNodeIdAttr({ textAlign: cell.align }, cell.nodeId),
            content: cell.blocks.map(hydrateBlockNode),
          })),
        })),
        attrs: withNodeIdAttr(undefined, node.nodeId),
      };
    case "math_block":
      return {
        type: "mathBlock",
        attrs: withNodeIdAttr({ latex: node.latex, display: "block" }, node.nodeId),
      };
    case "mermaid_block":
      return {
        type: "mermaidBlock",
        attrs: withNodeIdAttr({ code: node.code }, node.nodeId),
      };
    case "admonition":
      return {
        type: "admonition",
        attrs: withNodeIdAttr({
          type: node.admonitionType,
          title: node.title,
          icon: node.icon,
          color: node.color,
        }, node.nodeId),
        content: node.blocks.map(hydrateBlockNode),
      };
    case "table_of_contents":
      return {
        type: "tableOfContents",
        attrs: withNodeIdAttr({ maxDepth: node.maxDepth }, node.nodeId),
      };
    case "footnote_item":
      return {
        type: "footnoteItem",
        attrs: withNodeIdAttr({
          id: node.footnoteId,
          text: toPlainText(node.children),
        }, node.nodeId),
      };
    default:
      throw new Error(`Unsupported AST block node type: ${(node as BlockNode).type}`);
  }
};

export const hydrateAstToTiptap = (document: DocumentAst): JSONContent => ({
  type: "doc",
  content: document.blocks.map(hydrateBlockNode),
});

export const normalizeAstForComparison = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(normalizeAstForComparison);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([key]) => key !== "nodeId")
    .map(([key, child]) => [key, normalizeAstForComparison(child)]);

  return Object.fromEntries(entries);
};
