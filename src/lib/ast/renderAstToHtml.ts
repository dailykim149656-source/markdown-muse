import type {
  BlockNode,
  DocumentAst,
  InlineNode,
  Mark,
  TableCellNode,
} from "@/types/documentAst";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const escapeAttribute = (value: string) => escapeHtml(value);

const compactAttributeEntries = (entries: Array<[string, string | number | undefined]>) =>
  entries.filter(([, value]) => value !== undefined && value !== "");

const renderAttributes = (entries: Array<[string, string | number | undefined]>) => {
  const resolvedEntries = compactAttributeEntries(entries);

  if (resolvedEntries.length === 0) {
    return "";
  }

  return ` ${resolvedEntries.map(([key, value]) => `${key}="${escapeAttribute(String(value))}"`).join(" ")}`;
};

const wrapWithMarks = (content: string, marks?: Mark[]) => {
  if (!marks?.length) {
    return content;
  }

  return marks.reduce((accumulator, mark) => {
    switch (mark.type) {
      case "bold":
        return `<strong>${accumulator}</strong>`;
      case "italic":
        return `<em>${accumulator}</em>`;
      case "underline":
        return `<u>${accumulator}</u>`;
      case "strike":
        return `<s>${accumulator}</s>`;
      case "code":
        return `<code>${accumulator}</code>`;
      case "highlight":
        return `<mark>${accumulator}</mark>`;
      case "subscript":
        return `<sub>${accumulator}</sub>`;
      case "superscript":
        return `<sup>${accumulator}</sup>`;
      case "link":
        return `<a${renderAttributes([["href", mark.href], ["title", mark.title]])}>${accumulator}</a>`;
      case "text_style": {
        const styles = [
          mark.color ? `color: ${mark.color}` : undefined,
          mark.fontFamily ? `font-family: ${mark.fontFamily}` : undefined,
          mark.fontSize ? `font-size: ${mark.fontSize}` : undefined,
        ].filter(Boolean);

        return styles.length > 0 ? `<span style="${escapeAttribute(styles.join("; "))}">${accumulator}</span>` : accumulator;
      }
      default:
        return accumulator;
    }
  }, content);
};

const buildFootnoteMap = (document: DocumentAst) => {
  const map = new Map<string, string>();

  const visitBlock = (block: BlockNode) => {
    if (block.type === "footnote_item") {
      map.set(
        block.footnoteId,
        block.children
          .map((child) => (child.type === "text" ? child.text : child.type === "hard_break" ? "\n" : ""))
          .join("")
      );
    }

    switch (block.type) {
      case "blockquote":
      case "admonition":
      case "list_item":
      case "task_list_item":
        block.blocks.forEach(visitBlock);
        break;
      case "bullet_list":
      case "ordered_list":
      case "task_list":
        block.items.forEach(visitBlock);
        break;
      case "table":
        block.rows.forEach((row) => row.cells.forEach((cell) => cell.blocks.forEach(visitBlock)));
        break;
      default:
        break;
    }
  };

  document.blocks.forEach(visitBlock);
  return map;
};

const renderInlineNodes = (nodes: InlineNode[], footnoteMap: Map<string, string>): string =>
  nodes
    .map((node) => {
      switch (node.type) {
        case "text":
          return wrapWithMarks(escapeHtml(node.text), node.marks);
        case "hard_break":
          return "<br />";
        case "math_inline":
          return `<span${renderAttributes([
            ["data-type", "mathInline"],
            ["data-latex", node.latex],
            ["data-node-id", node.nodeId],
          ])}>${escapeHtml(node.latex)}</span>`;
        case "cross_reference":
          return `<span${renderAttributes([
            ["data-type", "cross-ref"],
            ["data-target", node.targetLabel],
            ["data-target-node-id", node.targetNodeId],
            ["data-node-id", node.nodeId],
          ])}>${escapeHtml(node.targetLabel)}</span>`;
        case "footnote_ref":
          return `<span${renderAttributes([
            ["data-type", "footnote-ref"],
            ["data-footnote-id", node.footnoteId],
            ["data-note", footnoteMap.get(node.footnoteId)],
            ["data-node-id", node.nodeId],
          ])}>[*]</span>`;
        default:
          return "";
      }
    })
    .join("");

const renderBlockChildren = (blocks: BlockNode[], footnoteMap: Map<string, string>) =>
  blocks.map((block) => renderBlockNode(block, footnoteMap)).join("");

const renderTableCell = (cell: TableCellNode, footnoteMap: Map<string, string>) => {
  const tagName = cell.role === "header" ? "th" : "td";

  return `<${tagName}${renderAttributes([
    ["data-node-id", cell.nodeId],
    ["style", cell.align ? `text-align: ${cell.align}` : undefined],
  ])}>${renderBlockChildren(cell.blocks, footnoteMap)}</${tagName}>`;
};

const renderBlockNode = (node: BlockNode, footnoteMap: Map<string, string>): string => {
  switch (node.type) {
    case "paragraph":
      return `<p${renderAttributes([
        ["data-node-id", node.nodeId],
        ["style", node.align ? `text-align: ${node.align}` : undefined],
      ])}>${renderInlineNodes(node.children, footnoteMap)}</p>`;
    case "heading":
      return `<h${node.level}${renderAttributes([
        ["data-node-id", node.nodeId],
        ["style", node.align ? `text-align: ${node.align}` : undefined],
      ])}>${renderInlineNodes(node.children, footnoteMap)}</h${node.level}>`;
    case "blockquote":
      return `<blockquote${renderAttributes([["data-node-id", node.nodeId]])}>${renderBlockChildren(node.blocks, footnoteMap)}</blockquote>`;
    case "code_block":
      return `<pre${renderAttributes([["data-node-id", node.nodeId]])}><code${renderAttributes([
        ["class", node.language ? `language-${node.language}` : undefined],
      ])}>${escapeHtml(node.code)}</code></pre>`;
    case "bullet_list":
      return `<ul${renderAttributes([["data-node-id", node.nodeId]])}>${node.items.map((item) => renderBlockNode(item, footnoteMap)).join("")}</ul>`;
    case "ordered_list":
      return `<ol${renderAttributes([
        ["data-node-id", node.nodeId],
        ["start", node.start],
      ])}>${node.items.map((item) => renderBlockNode(item, footnoteMap)).join("")}</ol>`;
    case "task_list":
      return `<ul${renderAttributes([
        ["data-node-id", node.nodeId],
        ["data-type", "taskList"],
      ])}>${node.items.map((item) => renderBlockNode(item, footnoteMap)).join("")}</ul>`;
    case "list_item":
      return `<li${renderAttributes([["data-node-id", node.nodeId]])}>${renderBlockChildren(node.blocks, footnoteMap)}</li>`;
    case "task_list_item":
      return `<li${renderAttributes([
        ["data-node-id", node.nodeId],
        ["data-checked", node.checked ? "true" : "false"],
      ])}>${renderBlockChildren(node.blocks, footnoteMap)}</li>`;
    case "horizontal_rule":
      return `<hr${renderAttributes([["data-node-id", node.nodeId]])} />`;
    case "image": {
      const style = node.align === "center"
        ? "display: block; margin-left: auto; margin-right: auto;"
        : node.align === "right"
          ? "display: block; margin-left: auto;"
          : undefined;

      return `<img${renderAttributes([
        ["src", node.src],
        ["alt", node.alt],
        ["title", node.title],
        ["width", node.width],
        ["height", node.height],
        ["style", style],
        ["data-node-id", node.nodeId],
      ])} />`;
    }
    case "figure_caption": {
      const captionLabel = node.captionType === "table" ? "Table" : "Figure";
      const captionText = renderInlineNodes(node.children, footnoteMap).replace(/<\/?[^>]+>/g, "");

      return `<div${renderAttributes([
        ["data-type", "figure-caption"],
        ["data-caption-type", node.captionType],
        ["data-label", node.label],
        ["data-target-node-id", node.targetNodeId],
        ["data-node-id", node.nodeId],
      ])}>${escapeHtml(`${captionLabel}: ${captionText}`)}</div>`;
    }
    case "table":
      return `<table${renderAttributes([["data-node-id", node.nodeId]])}>${node.rows.map((row) =>
        `<tr${renderAttributes([["data-node-id", row.nodeId]])}>${row.cells.map((cell) => renderTableCell(cell, footnoteMap)).join("")}</tr>`
      ).join("")}</table>`;
    case "math_block":
      return `<div${renderAttributes([
        ["data-type", "mathBlock"],
        ["data-latex", node.latex],
        ["data-node-id", node.nodeId],
      ])}>$$${escapeHtml(node.latex)}$$</div>`;
    case "mermaid_block":
      return `<div${renderAttributes([
        ["data-type", "mermaid"],
        ["code", node.code],
        ["data-node-id", node.nodeId],
      ])}></div>`;
    case "admonition":
      return `<div${renderAttributes([
        ["data-type", "admonition"],
        ["data-admonition-type", node.admonitionType],
        ["data-admonition-color", node.color],
        ["data-admonition-icon", node.icon],
        ["title", node.title],
        ["data-node-id", node.nodeId],
      ])}>${renderBlockChildren(node.blocks, footnoteMap)}</div>`;
    case "opaque_latex_block":
      return `<div${renderAttributes([
        ["data-type", "opaque-latex-block"],
        ["data-label", node.label],
        ["data-raw-latex", node.rawLatex],
        ["data-node-id", node.nodeId],
      ])}><pre><code>${escapeHtml(node.rawLatex)}</code></pre></div>`;
    case "resume_header":
      return `<div${renderAttributes([
        ["data-type", "resume-header"],
        ["data-name", node.name],
        ["data-primary-link-label", node.primaryLinkLabel],
        ["data-primary-link-url", node.primaryLinkUrl],
        ["data-right-primary", node.rightPrimary],
        ["data-secondary-link-label", node.secondaryLinkLabel],
        ["data-secondary-link-url", node.secondaryLinkUrl],
        ["data-email", node.email],
        ["data-phone", node.phone],
        ["data-tertiary-right", node.tertiaryRight],
        ["data-node-id", node.nodeId],
      ])}><strong>${escapeHtml(node.name)}</strong></div>`;
    case "resume_summary":
      return `<div${renderAttributes([
        ["data-type", "resume-summary"],
        ["data-summary", node.summary],
        ["data-node-id", node.nodeId],
      ])}><p>${escapeHtml(node.summary)}</p></div>`;
    case "resume_entry":
      return `<div${renderAttributes([
        ["data-type", "resume-entry"],
        ["data-command-name", node.commandName],
        ["data-title", node.title],
        ["data-trailing-text", node.trailingText],
        ["data-subtitle", node.subtitle],
        ["data-tertiary-text", node.tertiaryText],
        ["data-description", node.description],
        ["data-details", JSON.stringify(node.details)],
        ["data-node-id", node.nodeId],
      ])}><strong>${escapeHtml(node.title)}</strong></div>`;
    case "resume_skill_row":
      return `<div${renderAttributes([
        ["data-type", "resume-skill-row"],
        ["data-command-name", node.commandName],
        ["data-label", node.label],
        ["data-items", JSON.stringify(node.items)],
        ["data-raw-text", node.rawText],
        ["data-node-id", node.nodeId],
      ])}><strong>${escapeHtml(node.label || "Skills")}</strong></div>`;
    case "latex_title_block":
      return `<div${renderAttributes([
        ["data-type", "latex-title-block"],
        ["data-title", node.title],
        ["data-author", node.author],
        ["data-date", node.date],
        ["data-node-id", node.nodeId],
      ])}><strong>${escapeHtml(node.title)}</strong></div>`;
    case "latex_abstract":
      return `<div${renderAttributes([
        ["data-type", "latex-abstract"],
        ["data-content", node.content],
        ["data-node-id", node.nodeId],
      ])}><p>${escapeHtml(node.content)}</p></div>`;
    case "table_of_contents":
      return `<div${renderAttributes([
        ["data-type", "toc"],
        ["data-max-depth", node.maxDepth ?? 3],
        ["data-node-id", node.nodeId],
      ])}>Table of Contents</div>`;
    case "footnote_item":
      return `<div${renderAttributes([
        ["data-type", "footnote-item"],
        ["data-footnote-id", node.footnoteId],
        ["data-node-id", node.nodeId],
      ])}>${renderInlineNodes(node.children, footnoteMap)}</div>`;
    default:
      return "";
  }
};

export const renderAstToHtml = (document: DocumentAst) => {
  const footnoteMap = buildFootnoteMap(document);
  return document.blocks.map((block) => renderBlockNode(block, footnoteMap)).join("");
};
