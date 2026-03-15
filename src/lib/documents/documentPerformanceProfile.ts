import type { JSONContent } from "@tiptap/core";
import type { DocumentData, DocumentPerformanceProfile, DocumentPerformanceProfileKind } from "@/types/document";
import type { BlockNode, DocumentAst, TableCellNode, TableRowNode } from "@/types/documentAst";

const NORMAL_CHAR_LIMIT = 25_000;
const LARGE_CHAR_LIMIT = 100_000;
const NORMAL_BLOCK_LIMIT = 150;
const LARGE_BLOCK_LIMIT = 500;
const NORMAL_IMAGE_LIMIT = 10;
const LARGE_IMAGE_LIMIT = 40;

const countTableBlocks = (rows: TableRowNode[]) =>
  rows.reduce((count, row) => count + row.cells.reduce((cellCount, cell: TableCellNode) => (
    cellCount + countBlockNodes(cell.blocks)
  ), 0), 0);

const countBlockNodes = (blocks: BlockNode[]): number =>
  blocks.reduce((count, block) => {
    switch (block.type) {
      case "blockquote":
        return count + 1 + countBlockNodes(block.blocks);
      case "bullet_list":
      case "ordered_list":
      case "task_list":
        return count + 1 + block.items.reduce((itemCount, item) => (
          itemCount + 1 + countBlockNodes(item.blocks)
        ), 0);
      case "table":
        return count + 1 + countTableBlocks(block.rows);
      default:
        return count + 1;
    }
  }, 0);

const countAstImages = (blocks: BlockNode[]): number =>
  blocks.reduce((count, block) => {
    switch (block.type) {
      case "image":
        return count + 1;
      case "blockquote":
        return count + countAstImages(block.blocks);
      case "bullet_list":
      case "ordered_list":
      case "task_list":
        return count + block.items.reduce((itemCount, item) => itemCount + countAstImages(item.blocks), 0);
      case "table":
        return count + block.rows.reduce((rowCount, row) => (
          rowCount + row.cells.reduce((cellCount, cell) => cellCount + countAstImages(cell.blocks), 0)
        ), 0);
      default:
        return count;
    }
  }, 0);

const getAstMetrics = (ast: DocumentAst | null | undefined) => {
  if (!ast) {
    return null;
  }

  return {
    blockCount: countBlockNodes(ast.blocks),
    imageCount: countAstImages(ast.blocks),
  };
};

const countTipTapNodes = (
  node: JSONContent | null | undefined,
  metrics = { blockCount: 0, imageCount: 0 },
) => {
  if (!node || typeof node !== "object") {
    return metrics;
  }

  const type = typeof node.type === "string" ? node.type : "";

  if (type && type !== "doc" && type !== "text") {
    metrics.blockCount += 1;
  }

  if (type === "image") {
    metrics.imageCount += 1;
  }

  for (const child of node.content || []) {
    countTipTapNodes(child, metrics);
  }

  return metrics;
};

const getTipTapMetrics = (document: JSONContent | null | undefined) => {
  if (!document) {
    return null;
  }

  return countTipTapNodes(document);
};

const estimateMarkdownBlocks = (content: string) => {
  const sections = content
    .split(/\n\s*\n/)
    .map((section) => section.trim())
    .filter(Boolean).length;
  const structuralLines = (content.match(/^(#{1,6}|\s*[-*+]\s+|\s*\d+[.)]\s+|>\s+|```|---|\|)/gm) || []).length;
  return Math.max(sections, structuralLines, 1);
};

const estimateMarkdownImages = (content: string) =>
  (content.match(/!\[[^\]]*\]\([^)]+\)/g) || []).length;

const estimateHtmlBlocks = (content: string) =>
  Math.max((content.match(/<(p|h[1-6]|li|blockquote|pre|table|tr|section|article|figure|figcaption|div)\b/gi) || []).length, 1);

const estimateHtmlImages = (content: string) =>
  (content.match(/<img\b/gi) || []).length;

const estimateLatexBlocks = (content: string) =>
  Math.max((content.match(/\\(section|subsection|subsubsection|paragraph|subparagraph|item|begin\{(?:figure|table|itemize|enumerate|quote|verbatim|lstlisting|align|equation)\})/g) || []).length, 1);

const estimateLatexImages = (content: string) =>
  (content.match(/\\includegraphics(?:\[[^\]]*\])?\{[^}]+\}/g) || []).length;

const estimateStructuredBlocks = (content: string) =>
  Math.max(content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).length, 1);

const estimateMetricsFromContent = (document: DocumentData, primaryContent: string) => {
  switch (document.mode) {
    case "markdown":
      return {
        blockCount: estimateMarkdownBlocks(primaryContent),
        imageCount: estimateMarkdownImages(primaryContent),
      };
    case "html":
      return {
        blockCount: estimateHtmlBlocks(primaryContent),
        imageCount: estimateHtmlImages(primaryContent),
      };
    case "latex":
      return {
        blockCount: estimateLatexBlocks(primaryContent),
        imageCount: estimateLatexImages(primaryContent),
      };
    case "json":
    case "yaml":
    default:
      return {
        blockCount: estimateStructuredBlocks(primaryContent),
        imageCount: 0,
      };
  }
};

const getPrimaryContent = (document: DocumentData) =>
  document.sourceSnapshots?.[document.mode]
  || document.content
  || document.sourceSnapshots?.markdown
  || document.sourceSnapshots?.html
  || document.sourceSnapshots?.latex
  || "";

export const resolveDocumentPerformanceProfileKind = ({
  blockCount,
  charCount,
  imageCount,
}: Pick<DocumentPerformanceProfile, "blockCount" | "charCount" | "imageCount">): DocumentPerformanceProfileKind => {
  if (charCount > LARGE_CHAR_LIMIT || blockCount > LARGE_BLOCK_LIMIT || imageCount > LARGE_IMAGE_LIMIT) {
    return "heavy";
  }

  if (charCount >= NORMAL_CHAR_LIMIT || blockCount >= NORMAL_BLOCK_LIMIT || imageCount >= NORMAL_IMAGE_LIMIT) {
    return "large";
  }

  return "normal";
};

export const buildDocumentPerformanceProfile = (document: DocumentData): DocumentPerformanceProfile => {
  const primaryContent = getPrimaryContent(document);
  const astMetrics = getAstMetrics(document.ast);
  const tiptapMetrics = getTipTapMetrics(document.tiptapJson || null);
  const contentMetrics = estimateMetricsFromContent(document, primaryContent);
  const blockCount = astMetrics?.blockCount ?? tiptapMetrics?.blockCount ?? contentMetrics.blockCount;
  const imageCount = astMetrics?.imageCount ?? tiptapMetrics?.imageCount ?? contentMetrics.imageCount;
  const charCount = primaryContent.length;

  return {
    blockCount,
    charCount,
    imageCount,
    kind: resolveDocumentPerformanceProfileKind({
      blockCount,
      charCount,
      imageCount,
    }),
  };
};

export const isHeavyDocumentProfile = (profile: DocumentPerformanceProfile) => profile.kind === "heavy";

export const isLargeDocumentProfile = (profile: DocumentPerformanceProfile) =>
  profile.kind === "large" || profile.kind === "heavy";
