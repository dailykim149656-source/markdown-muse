import type {
  BlockNode,
  DocumentAst,
  InlineNode,
  Mark,
  TableCellNode,
} from "@/types/documentAst";

const escapeMarkdownText = (value: string) =>
  value
    .replaceAll("\\", "\\\\")
    .replaceAll("*", "\\*")
    .replaceAll("_", "\\_")
    .replaceAll("[", "\\[")
    .replaceAll("]", "\\]")
    .replaceAll("`", "\\`");

const wrapWithMarks = (content: string, marks?: Mark[]) => {
  if (!marks?.length) {
    return content;
  }

  return marks.reduce((accumulator, mark) => {
    switch (mark.type) {
      case "bold":
        return `**${accumulator}**`;
      case "italic":
        return `*${accumulator}*`;
      case "underline":
        return `<u>${accumulator}</u>`;
      case "strike":
        return `~~${accumulator}~~`;
      case "code":
        return `\`${accumulator}\``;
      case "highlight":
        return `==${accumulator}==`;
      case "subscript":
        return `<sub>${accumulator}</sub>`;
      case "superscript":
        return `<sup>${accumulator}</sup>`;
      case "link":
        return `[${accumulator}](${mark.href})`;
      case "text_style":
        return accumulator;
      default:
        return accumulator;
    }
  }, content);
};

const renderInlineNode = (node: InlineNode): string => {
  switch (node.type) {
    case "text":
      return wrapWithMarks(escapeMarkdownText(node.text), node.marks);
    case "hard_break":
      return "  \n";
    case "math_inline":
      return `$${node.latex}$`;
    case "cross_reference":
      return `[@${node.targetLabel}]`;
    case "footnote_ref":
      return `[^${node.footnoteId}]`;
    default:
      return "";
  }
};

const renderInlineNodes = (nodes: InlineNode[]) => nodes.map(renderInlineNode).join("");

const indentLines = (value: string, prefix: string) =>
  value
    .split("\n")
    .map((line) => `${prefix}${line}`.trimEnd())
    .join("\n");

const normalizeTocMaxDepth = (value: number | undefined) => {
  if (value === 1 || value === 2) {
    return value;
  }

  return 3;
};

const formatTocPlaceholder = (maxDepth: number | undefined) => {
  const resolvedDepth = normalizeTocMaxDepth(maxDepth);
  return resolvedDepth === 3 ? "[[toc]]" : `[[toc:${resolvedDepth}]]`;
};

const renderBlocks = (blocks: BlockNode[], depth = 0): string =>
  blocks.map((block) => renderBlockNode(block, depth)).filter(Boolean).join("\n\n");

const renderTableCell = (cell: TableCellNode) =>
  cell.blocks
    .map((block) => renderBlockNode(block).replace(/\n+/g, " ").trim())
    .join(" ")
    .trim();

const renderBlockNode = (node: BlockNode, depth = 0): string => {
  switch (node.type) {
    case "heading":
      return `${"#".repeat(node.level)} ${renderInlineNodes(node.children)}`;
    case "paragraph":
      return renderInlineNodes(node.children);
    case "blockquote":
      return indentLines(renderBlocks(node.blocks, depth + 1), "> ");
    case "code_block":
      return `\`\`\`${node.language || ""}\n${node.code}\n\`\`\``;
    case "bullet_list":
      return node.items
        .map((item) => {
          const rendered = renderBlocks(item.blocks, depth + 1).split("\n");
          return [`${"  ".repeat(depth)}- ${rendered[0]}`, ...rendered.slice(1).map((line) => `${"  ".repeat(depth + 1)}${line}`)].join("\n");
        })
        .join("\n");
    case "ordered_list":
      return node.items
        .map((item, index) => {
          const rendered = renderBlocks(item.blocks, depth + 1).split("\n");
          const ordinal = (node.start || 1) + index;
          return [`${"  ".repeat(depth)}${ordinal}. ${rendered[0]}`, ...rendered.slice(1).map((line) => `${"  ".repeat(depth + 1)}${line}`)].join("\n");
        })
        .join("\n");
    case "task_list":
      return node.items
        .map((item) => {
          const rendered = renderBlocks(item.blocks, depth + 1).split("\n");
          const marker = item.checked ? "[x]" : "[ ]";
          return [`${"  ".repeat(depth)}- ${marker} ${rendered[0]}`, ...rendered.slice(1).map((line) => `${"  ".repeat(depth + 1)}${line}`)].join("\n");
        })
        .join("\n");
    case "list_item":
    case "task_list_item":
      return renderBlocks(node.blocks, depth + 1);
    case "horizontal_rule":
      return "---";
    case "image":
      return `![${node.alt || ""}](${node.src})`;
    case "figure_caption": {
      const text = renderInlineNodes(node.children);
      const labelSuffix = node.label ? ` {#${node.label}}` : "";
      const prefix = node.captionType === "table" ? "Table" : "Figure";
      return `*${prefix}: ${text}*${labelSuffix}`;
    }
    case "table": {
      const [headerRow, ...bodyRows] = node.rows;
      const headerCells = headerRow?.cells.map(renderTableCell) || [];
      const separator = headerCells.map(() => "---");
      const body = bodyRows.map((row) => row.cells.map(renderTableCell));
      const rows = [headerCells, separator, ...body]
        .map((cells) => `| ${cells.join(" | ")} |`)
        .join("\n");
      return rows;
    }
    case "math_block":
      return `$$\n${node.latex}\n$$`;
    case "mermaid_block":
      return `\`\`\`mermaid\n${node.code}\n\`\`\``;
    case "admonition": {
      const title = node.title ? ` ${node.title}` : "";
      const body = renderBlocks(node.blocks, depth + 1)
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
      return `> [!${node.admonitionType.toUpperCase()}${title}]\n${body}`;
    }
    case "opaque_latex_block":
      return `\`\`\`latex\n${node.rawLatex}\n\`\`\``;
    case "resume_header":
      return [
        `# ${node.name}`,
        node.primaryLinkUrl ? `[${node.primaryLinkLabel || node.primaryLinkUrl}](${node.primaryLinkUrl})` : "",
        node.rightPrimary || "",
        node.secondaryLinkUrl ? `[${node.secondaryLinkLabel || node.secondaryLinkUrl}](${node.secondaryLinkUrl})` : "",
        node.email ? `Email: ${node.email}` : "",
        node.phone ? `Phone: ${node.phone}` : "",
        node.tertiaryRight || "",
      ].filter(Boolean).join("\n\n");
    case "resume_summary":
      return node.summary;
    case "resume_entry":
      return [
        `### ${node.title}${node.trailingText ? ` | ${node.trailingText}` : ""}`,
        node.subtitle || node.tertiaryText ? `${node.subtitle || ""}${node.tertiaryText ? ` | ${node.tertiaryText}` : ""}` : "",
        node.description || "",
        ...node.details.map((detail) => `- ${detail}`),
      ].filter(Boolean).join("\n");
    case "resume_skill_row":
      return `- ${node.label ? `**${node.label}**: ` : ""}${node.items.join(", ") || node.rawText}`;
    case "latex_title_block":
      return [
        `# ${node.title}`,
        node.author ? `Author: ${node.author}` : "",
        node.date ? `Date: ${node.date}` : "",
      ].filter(Boolean).join("\n");
    case "latex_abstract":
      return `> **Abstract**\n> ${node.content.replace(/\n/g, "\n> ")}`;
    case "table_of_contents":
      return formatTocPlaceholder(node.maxDepth);
    case "footnote_item":
      return `[^${node.footnoteId}]: ${renderInlineNodes(node.children)}`;
    default:
      return "";
  }
};

export const renderAstToMarkdown = (document: DocumentAst) => `${renderBlocks(document.blocks).trim()}\n`;
