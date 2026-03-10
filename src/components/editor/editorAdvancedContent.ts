import type { JSONContent } from "@tiptap/core";
import type { DocumentAst } from "@/types/documentAst";

const ADVANCED_TIPTAP_NODE_TYPES = new Set(["math", "mathBlock", "mermaidBlock"]);
const ADVANCED_AST_NODE_TYPES = new Set(["math_inline", "math_block", "mermaid_block"]);
const DOCUMENT_TIPTAP_NODE_TYPES = new Set([
  "admonition",
  "codeBlock",
  "crossReference",
  "figureCaption",
  "footnoteItem",
  "footnoteRef",
  "horizontalRule",
  "image",
  "table",
  "tableCell",
  "tableHeader",
  "tableOfContents",
  "tableRow",
]);
const DOCUMENT_AST_NODE_TYPES = new Set([
  "admonition",
  "code_block",
  "cross_reference",
  "figure_caption",
  "footnote_item",
  "footnote_ref",
  "horizontal_rule",
  "image",
  "table",
  "table_of_contents",
]);

const walkTiptapContent = (node: JSONContent | null | undefined): boolean => {
  if (!node) {
    return false;
  }

  if (node.type && ADVANCED_TIPTAP_NODE_TYPES.has(node.type)) {
    return true;
  }

  return Array.isArray(node.content)
    ? node.content.some((child) => walkTiptapContent(child))
    : false;
};

const walkTiptapContentWithSet = (
  node: JSONContent | null | undefined,
  nodeTypes: Set<string>,
): boolean => {
  if (!node) {
    return false;
  }

  if (node.type && nodeTypes.has(node.type)) {
    return true;
  }

  return Array.isArray(node.content)
    ? node.content.some((child) => walkTiptapContentWithSet(child, nodeTypes))
    : false;
};

const walkDocumentAst = (value: unknown): boolean => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;

  if (typeof record.type === "string" && ADVANCED_AST_NODE_TYPES.has(record.type)) {
    return true;
  }

  return Object.values(record).some((child) => {
    if (Array.isArray(child)) {
      return child.some((entry) => walkDocumentAst(entry));
    }

    return walkDocumentAst(child);
  });
};

const walkDocumentAstWithSet = (value: unknown, nodeTypes: Set<string>): boolean => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;

  if (typeof record.type === "string" && nodeTypes.has(record.type)) {
    return true;
  }

  return Object.values(record).some((child) => {
    if (Array.isArray(child)) {
      return child.some((entry) => walkDocumentAstWithSet(entry, nodeTypes));
    }

    return walkDocumentAstWithSet(child, nodeTypes);
  });
};

export const tiptapDocumentHasAdvancedContent = (document: JSONContent | null | undefined) =>
  walkTiptapContent(document);

export const tiptapDocumentHasDocumentContent = (document: JSONContent | null | undefined) =>
  walkTiptapContentWithSet(document, DOCUMENT_TIPTAP_NODE_TYPES);

export const documentAstHasAdvancedContent = (document: DocumentAst | null | undefined) =>
  walkDocumentAst(document);

export const documentAstHasDocumentContent = (document: DocumentAst | null | undefined) =>
  walkDocumentAstWithSet(document, DOCUMENT_AST_NODE_TYPES);

export const htmlHasAdvancedContent = (html: string) =>
  /data-type="(?:math|math-block|mermaid)"/.test(html);

export const htmlHasDocumentContent = (html: string) =>
  /data-type="(?:admonition|cross-ref|figure-caption|footnote-item|footnote-ref|toc)"/.test(html)
  || /<(?:img|table|pre|hr)\b/i.test(html);

export const markdownHasAdvancedContent = (markdown: string) =>
  /```mermaid[\s\S]*?```/.test(markdown)
  || /^\$\$[\s\S]+?\$\$/m.test(markdown)
  || /(^|[^\w\\])\$[^$\n]+?\$/.test(markdown);

export const markdownHasDocumentContent = (markdown: string) =>
  /^\|.+\|$/m.test(markdown)
  || /!\[[^\]]*\]\([^)]+\)/.test(markdown)
  || /(^|\n)---(\n|$)/.test(markdown)
  || /(^|\n)\[\^[^\]]+\]:/.test(markdown);
