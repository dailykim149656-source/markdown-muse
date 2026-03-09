import type {
  BlockNode,
  DerivedDocumentIndex,
  DocumentAst,
  InlineNode,
} from "@/types/documentAst";

const collectInlineText = (nodes: InlineNode[]): string =>
  nodes
    .map((node) => {
      switch (node.type) {
        case "text":
          return node.text;
        case "hard_break":
          return "\n";
        case "math_inline":
          return node.latex;
        case "cross_reference":
          return node.targetLabel;
        case "footnote_ref":
          return `[${node.footnoteId}]`;
        default:
          return "";
      }
    })
    .join("");

const visitBlocks = (blocks: BlockNode[], visit: (node: BlockNode) => void) => {
  for (const block of blocks) {
    visit(block);

    switch (block.type) {
      case "blockquote":
        visitBlocks(block.blocks, visit);
        break;
      case "bullet_list":
      case "ordered_list":
        for (const item of block.items) {
          visit(item);
          visitBlocks(item.blocks, visit);
        }
        break;
      case "task_list":
        for (const item of block.items) {
          visit(item);
          visitBlocks(item.blocks, visit);
        }
        break;
      case "list_item":
      case "task_list_item":
      case "admonition":
        visitBlocks(block.blocks, visit);
        break;
      case "table":
        for (const row of block.rows) {
          for (const cell of row.cells) {
            visitBlocks(cell.blocks, visit);
          }
        }
        break;
      default:
        break;
    }
  }
};

export const buildDerivedDocumentIndex = (document: DocumentAst): DerivedDocumentIndex => {
  const headings: DerivedDocumentIndex["headings"] = [];
  const labels: DerivedDocumentIndex["labels"] = {};
  const footnotes: DerivedDocumentIndex["footnotes"] = {};

  visitBlocks(document.blocks, (node) => {
    switch (node.type) {
      case "heading":
        headings.push({
          nodeId: node.nodeId,
          level: node.level,
          text: collectInlineText(node.children),
        });
        break;
      case "figure_caption":
        if (node.label) {
          labels[node.label] = node.targetNodeId || node.nodeId;
        }
        break;
      case "footnote_item":
        footnotes[node.footnoteId] = node.nodeId;
        break;
      default:
        break;
    }
  });

  return {
    headings,
    labels,
    footnotes,
  };
};
