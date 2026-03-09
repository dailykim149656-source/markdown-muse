import type {
  BlockNode,
  DocumentAst,
  InlineNode,
  TableCellNode,
  TableRowNode,
} from "@/types/documentAst";

export type AstValidationSeverity = "error" | "warning";

export interface AstValidationIssue {
  code: string;
  message: string;
  nodeId?: string;
  path: string;
  severity: AstValidationSeverity;
}

export interface AstValidationResult {
  errors: AstValidationIssue[];
  valid: boolean;
  warnings: AstValidationIssue[];
}

interface NodeContext {
  path: string;
  nodeId?: string;
}

interface FootnoteReferenceEntry extends NodeContext {
  footnoteId: string;
}

interface CrossReferenceEntry extends NodeContext {
  targetLabel: string;
  targetNodeId?: string;
}

const createResult = (): AstValidationResult => ({
  errors: [],
  valid: true,
  warnings: [],
});

const pushIssue = (
  result: AstValidationResult,
  severity: AstValidationSeverity,
  code: string,
  message: string,
  context: NodeContext,
) => {
  const issue: AstValidationIssue = {
    code,
    message,
    path: context.path,
    severity,
  };

  if (context.nodeId) {
    issue.nodeId = context.nodeId;
  }

  if (severity === "error") {
    result.errors.push(issue);
    result.valid = false;
    return;
  }

  result.warnings.push(issue);
};

const registerNodeId = (
  result: AstValidationResult,
  nodeIds: Map<string, NodeContext>,
  context: NodeContext,
  nodeType: string,
) => {
  const nodeId = context.nodeId?.trim();

  if (!nodeId) {
    pushIssue(result, "error", "missing_node_id", `${nodeType} nodes must have a non-empty nodeId.`, context);
    return;
  }

  const existing = nodeIds.get(nodeId);

  if (existing) {
    pushIssue(
      result,
      "error",
      "duplicate_node_id",
      `Duplicate nodeId "${nodeId}" found at ${context.path}; first declared at ${existing.path}.`,
      context,
    );
    return;
  }

  nodeIds.set(nodeId, context);
};

const validateInlineNodes = (
  nodes: InlineNode[],
  parentPath: string,
  result: AstValidationResult,
  nodeIds: Map<string, NodeContext>,
  footnoteRefs: FootnoteReferenceEntry[],
  crossReferences: CrossReferenceEntry[],
) => {
  nodes.forEach((node, index) => {
    const path = `${parentPath}.children[${index}]`;

    switch (node.type) {
      case "text":
        break;
      case "hard_break":
        registerNodeId(result, nodeIds, { nodeId: node.nodeId, path }, node.type);
        break;
      case "math_inline":
        registerNodeId(result, nodeIds, { nodeId: node.nodeId, path }, node.type);
        if (!node.latex.trim()) {
          pushIssue(result, "error", "empty_math_latex", "math_inline nodes must have latex.", { nodeId: node.nodeId, path });
        }
        break;
      case "cross_reference":
        registerNodeId(result, nodeIds, { nodeId: node.nodeId, path }, node.type);
        crossReferences.push({
          nodeId: node.nodeId,
          path,
          targetLabel: node.targetLabel,
          targetNodeId: node.targetNodeId,
        });
        break;
      case "footnote_ref":
        registerNodeId(result, nodeIds, { nodeId: node.nodeId, path }, node.type);
        footnoteRefs.push({
          footnoteId: node.footnoteId,
          nodeId: node.nodeId,
          path,
        });
        break;
      default:
        break;
    }
  });
};

const validateTableCells = (
  cells: TableCellNode[],
  parentPath: string,
  result: AstValidationResult,
  nodeIds: Map<string, NodeContext>,
  footnoteRefs: FootnoteReferenceEntry[],
  crossReferences: CrossReferenceEntry[],
  footnoteItems: Map<string, NodeContext[]>,
  captionLabels: Map<string, NodeContext[]>,
) => {
  cells.forEach((cell, index) => {
    const path = `${parentPath}.cells[${index}]`;
    registerNodeId(result, nodeIds, { nodeId: cell.nodeId, path }, cell.type);
    validateBlocks(
      cell.blocks,
      path,
      result,
      nodeIds,
      footnoteRefs,
      crossReferences,
      footnoteItems,
      captionLabels,
    );
  });
};

const validateTableRows = (
  rows: TableRowNode[],
  parentPath: string,
  result: AstValidationResult,
  nodeIds: Map<string, NodeContext>,
  footnoteRefs: FootnoteReferenceEntry[],
  crossReferences: CrossReferenceEntry[],
  footnoteItems: Map<string, NodeContext[]>,
  captionLabels: Map<string, NodeContext[]>,
) => {
  rows.forEach((row, index) => {
    const path = `${parentPath}.rows[${index}]`;
    registerNodeId(result, nodeIds, { nodeId: row.nodeId, path }, row.type);

    if (row.cells.length === 0) {
      pushIssue(result, "error", "empty_table_row", "table_row nodes must contain one or more cells.", {
        nodeId: row.nodeId,
        path,
      });
    }

    validateTableCells(
      row.cells,
      path,
      result,
      nodeIds,
      footnoteRefs,
      crossReferences,
      footnoteItems,
      captionLabels,
    );
  });
};

const validateBlocks = (
  blocks: BlockNode[],
  parentPath: string,
  result: AstValidationResult,
  nodeIds: Map<string, NodeContext>,
  footnoteRefs: FootnoteReferenceEntry[],
  crossReferences: CrossReferenceEntry[],
  footnoteItems: Map<string, NodeContext[]>,
  captionLabels: Map<string, NodeContext[]>,
) => {
  blocks.forEach((block, index) => {
    const path = `${parentPath}.blocks[${index}]`;
    registerNodeId(result, nodeIds, { nodeId: block.nodeId, path }, block.type);

    switch (block.type) {
      case "heading":
        if (block.level !== 1 && block.level !== 2 && block.level !== 3) {
          pushIssue(result, "error", "invalid_heading_level", "heading level must be 1, 2, or 3.", {
            nodeId: block.nodeId,
            path,
          });
        }
        validateInlineNodes(block.children, path, result, nodeIds, footnoteRefs, crossReferences);
        break;
      case "paragraph":
        validateInlineNodes(block.children, path, result, nodeIds, footnoteRefs, crossReferences);
        break;
      case "figure_caption":
        if (block.label) {
          const entries = captionLabels.get(block.label) || [];
          entries.push({ nodeId: block.nodeId, path });
          captionLabels.set(block.label, entries);
        }
        validateInlineNodes(block.children, path, result, nodeIds, footnoteRefs, crossReferences);
        break;
      case "footnote_item": {
        const entries = footnoteItems.get(block.footnoteId) || [];
        entries.push({ nodeId: block.nodeId, path });
        footnoteItems.set(block.footnoteId, entries);
        validateInlineNodes(block.children, path, result, nodeIds, footnoteRefs, crossReferences);
        break;
      }
      case "blockquote":
      case "list_item":
      case "task_list_item":
      case "admonition":
        validateBlocks(
          block.blocks,
          path,
          result,
          nodeIds,
          footnoteRefs,
          crossReferences,
          footnoteItems,
          captionLabels,
        );
        break;
      case "bullet_list":
      case "ordered_list":
      case "task_list":
        validateBlocks(
          block.items,
          path,
          result,
          nodeIds,
          footnoteRefs,
          crossReferences,
          footnoteItems,
          captionLabels,
        );
        break;
      case "table":
        validateTableRows(
          block.rows,
          path,
          result,
          nodeIds,
          footnoteRefs,
          crossReferences,
          footnoteItems,
          captionLabels,
        );
        break;
      case "image":
        if (!block.src.trim()) {
          pushIssue(result, "error", "missing_image_src", "image nodes must have src.", {
            nodeId: block.nodeId,
            path,
          });
        }
        break;
      case "math_block":
        if (!block.latex.trim()) {
          pushIssue(result, "error", "empty_math_latex", "math_block nodes must have latex.", {
            nodeId: block.nodeId,
            path,
          });
        }
        break;
      case "mermaid_block":
        if (!block.code.trim()) {
          pushIssue(result, "error", "empty_mermaid_code", "mermaid_block nodes must have code.", {
            nodeId: block.nodeId,
            path,
          });
        }
        break;
      case "code_block":
      case "horizontal_rule":
      case "table_of_contents":
        break;
      default:
        break;
    }
  });
};

export const validateDocumentAst = (document: DocumentAst): AstValidationResult => {
  const result = createResult();
  const nodeIds = new Map<string, NodeContext>();
  const footnoteRefs: FootnoteReferenceEntry[] = [];
  const crossReferences: CrossReferenceEntry[] = [];
  const footnoteItems = new Map<string, NodeContext[]>();
  const captionLabels = new Map<string, NodeContext[]>();

  if (document.type !== "document") {
    pushIssue(result, "error", "invalid_root_type", 'root type must be "document".', {
      nodeId: document.nodeId,
      path: "document",
    });
  }

  registerNodeId(result, nodeIds, { nodeId: document.nodeId, path: "document" }, "document");
  validateBlocks(
    document.blocks,
    "document",
    result,
    nodeIds,
    footnoteRefs,
    crossReferences,
    footnoteItems,
    captionLabels,
  );

  for (const [label, entries] of captionLabels.entries()) {
    if (entries.length > 1) {
      entries.forEach((entry) => {
        pushIssue(
          result,
          "warning",
          "duplicate_figure_caption_label",
          `figure_caption label "${label}" is duplicated.`,
          entry,
        );
      });
    }
  }

  for (const crossReference of crossReferences) {
    if (crossReference.targetNodeId && !nodeIds.has(crossReference.targetNodeId)) {
      pushIssue(
        result,
        "error",
        "unresolved_cross_reference_target",
        `cross_reference targetNodeId "${crossReference.targetNodeId}" could not be resolved.`,
        crossReference,
      );
    }

    if (!crossReference.targetNodeId && crossReference.targetLabel && !captionLabels.has(crossReference.targetLabel)) {
      pushIssue(
        result,
        "warning",
        "unresolved_cross_reference_label",
        `cross_reference label "${crossReference.targetLabel}" could not be resolved.`,
        crossReference,
      );
    }
  }

  for (const footnoteRef of footnoteRefs) {
    const matchingItems = footnoteItems.get(footnoteRef.footnoteId) || [];

    if (matchingItems.length !== 1) {
      pushIssue(
        result,
        "error",
        "invalid_footnote_resolution",
        `footnote_ref "${footnoteRef.footnoteId}" must resolve to exactly one footnote_item.`,
        footnoteRef,
      );
    }

    if (matchingItems.length === 0) {
      pushIssue(
        result,
        "warning",
        "footnote_ref_without_item",
        `footnote_ref "${footnoteRef.footnoteId}" does not have a matching footnote_item.`,
        footnoteRef,
      );
    }
  }

  for (const [footnoteId, entries] of footnoteItems.entries()) {
    const hasReference = footnoteRefs.some((footnoteRef) => footnoteRef.footnoteId === footnoteId);

    if (!hasReference) {
      entries.forEach((entry) => {
        pushIssue(
          result,
          "warning",
          "footnote_item_without_ref",
          `footnote_item "${footnoteId}" is not referenced.`,
          entry,
        );
      });
    }
  }

  return result;
};
