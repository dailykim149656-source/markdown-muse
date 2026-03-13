import type {
  BlockNode,
  DocumentAst,
  InlineNode,
  TableCellNode,
  TableRowNode,
} from "@/types/documentAst";
import type {
  DocumentPatch,
  DocumentPatchSet,
  PatchAstNode,
  PatchPayload,
} from "@/types/documentPatch";
import { validateDocumentAst } from "@/lib/ast/validateDocumentAst";

type AstContainerNode = DocumentAst | BlockNode | TableRowNode | TableCellNode;
type AstNode = PatchAstNode;
type AstSiblingArray = AstNode[];

interface NodeLocation<TNode extends AstNode = AstNode> {
  node: TNode;
  siblings: AstSiblingArray;
  index: number;
  parent: AstContainerNode;
}

interface ApplyPatchSetOptions {
  includePending?: boolean;
  stopOnError?: boolean;
}

export interface PatchApplicationFailure {
  patchId: string;
  message: string;
}

export interface PatchSetApplicationResult {
  appliedPatchIds: string[];
  document: DocumentAst;
  failures: PatchApplicationFailure[];
  warnings: string[];
}

export class PatchApplicationError extends Error {
  patchId: string;

  constructor(patchId: string, message: string) {
    super(message);
    this.name = "PatchApplicationError";
    this.patchId = patchId;
  }
}

const cloneDocumentAst = (document: DocumentAst): DocumentAst => structuredClone(document);

const isBlockNode = (node: AstNode): node is BlockNode => "kind" in node && node.kind === "block";
const isInlineNode = (node: AstNode): node is InlineNode => "kind" in node && node.kind === "inline";
const isTableRowNode = (node: AstNode): node is TableRowNode => node.type === "table_row";
const isTableCellNode = (node: AstNode): node is TableCellNode => node.type === "table_cell";

const getNodeArrayKind = (node: AstNode) => {
  if (isBlockNode(node)) {
    return "block";
  }

  if (isInlineNode(node)) {
    return "inline";
  }

  if (isTableRowNode(node)) {
    return "table_row";
  }

  return "table_cell";
};

const assertPayloadKind = <TPayload extends PatchPayload>(
  patch: DocumentPatch,
  expectedKind: TPayload["kind"],
): TPayload => {
  if (!patch.payload || patch.payload.kind !== expectedKind) {
    throw new PatchApplicationError(
      patch.patchId,
      `Patch "${patch.patchId}" requires payload kind "${expectedKind}".`,
    );
  }

  return patch.payload as TPayload;
};

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (!value || typeof value !== "object") {
    return JSON.stringify(value);
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([leftKey], [rightKey]) =>
    leftKey.localeCompare(rightKey),
  );

  return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`).join(",")}}`;
};

export const computePatchNodeHash = (node: AstNode) => {
  const source = stableStringify(node);
  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) - hash) + source.charCodeAt(index);
    hash |= 0;
  }

  return `h${Math.abs(hash)}`;
};

const extractInlineText = (node: InlineNode): string => {
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
      return node.footnoteId;
    default:
      return "";
  }
};

export const extractAstNodeText = (node: AstNode): string => {
  if (isInlineNode(node)) {
    return extractInlineText(node);
  }

  if (isTableRowNode(node)) {
    return node.cells.map((cell) => extractAstNodeText(cell)).join(" ");
  }

  if (isTableCellNode(node)) {
    return node.blocks.map((block) => extractAstNodeText(block)).join("\n");
  }

  switch (node.type) {
    case "paragraph":
    case "heading":
    case "figure_caption":
    case "footnote_item":
      return node.children.map((child) => extractInlineText(child)).join("");
    case "blockquote":
    case "list_item":
    case "task_list_item":
    case "admonition":
      return node.blocks.map((block) => extractAstNodeText(block)).join("\n");
    case "bullet_list":
    case "ordered_list":
    case "task_list":
      return node.items.map((item) => extractAstNodeText(item)).join("\n");
    case "code_block":
      return node.code;
    case "math_block":
      return node.latex;
    case "mermaid_block":
      return node.code;
    case "table":
      return node.rows.map((row) => extractAstNodeText(row)).join("\n");
    case "image":
      return node.alt || node.src;
    default:
      return "";
  }
};

const findInlineLocation = (
  nodes: InlineNode[],
  parent: AstContainerNode,
  nodeId: string,
): NodeLocation | null => {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];

    if (node.nodeId === nodeId) {
      return {
        index,
        node,
        parent,
        siblings: nodes as AstSiblingArray,
      };
    }
  }

  return null;
};

const findTableCellLocation = (
  cells: TableCellNode[],
  parent: AstContainerNode,
  nodeId: string,
): NodeLocation | null => {
  for (let index = 0; index < cells.length; index += 1) {
    const cell = cells[index];

    if (cell.nodeId === nodeId) {
      return {
        index,
        node: cell,
        parent,
        siblings: cells as AstSiblingArray,
      };
    }

    const nestedBlockLocation = findBlockLocation(cell.blocks, cell, nodeId);

    if (nestedBlockLocation) {
      return nestedBlockLocation;
    }
  }

  return null;
};

const findTableRowLocation = (
  rows: TableRowNode[],
  parent: AstContainerNode,
  nodeId: string,
): NodeLocation | null => {
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];

    if (row.nodeId === nodeId) {
      return {
        index,
        node: row,
        parent,
        siblings: rows as AstSiblingArray,
      };
    }

    const nestedCellLocation = findTableCellLocation(row.cells, row, nodeId);

    if (nestedCellLocation) {
      return nestedCellLocation;
    }
  }

  return null;
};

const findBlockLocation = (
  blocks: BlockNode[],
  parent: AstContainerNode,
  nodeId: string,
): NodeLocation | null => {
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];

    if (block.nodeId === nodeId) {
      return {
        index,
        node: block,
        parent,
        siblings: blocks as AstSiblingArray,
      };
    }

    switch (block.type) {
      case "paragraph":
      case "heading":
      case "figure_caption":
      case "footnote_item": {
        const inlineLocation = findInlineLocation(block.children, block, nodeId);

        if (inlineLocation) {
          return inlineLocation;
        }
        break;
      }
      case "blockquote":
      case "list_item":
      case "task_list_item":
      case "admonition": {
        const nestedBlockLocation = findBlockLocation(block.blocks, block, nodeId);

        if (nestedBlockLocation) {
          return nestedBlockLocation;
        }
        break;
      }
      case "bullet_list":
      case "ordered_list":
      case "task_list": {
        const nestedListLocation = findBlockLocation(block.items, block, nodeId);

        if (nestedListLocation) {
          return nestedListLocation;
        }
        break;
      }
      case "table": {
        const rowLocation = findTableRowLocation(block.rows, block, nodeId);

        if (rowLocation) {
          return rowLocation;
        }
        break;
      }
      default:
        break;
    }
  }

  return null;
};

const findNodeLocation = (document: DocumentAst, nodeId: string) =>
  findBlockLocation(document.blocks, document, nodeId);

const assertCompatibleNodes = (patch: DocumentPatch, targetNode: AstNode, candidateNodes: PatchAstNode[]) => {
  const expectedKind = getNodeArrayKind(targetNode);

  for (const candidateNode of candidateNodes) {
    if (getNodeArrayKind(candidateNode) !== expectedKind) {
      throw new PatchApplicationError(
        patch.patchId,
        `Patch "${patch.patchId}" contains incompatible node kinds for "${patch.operation}".`,
      );
    }
  }
};

const normalizeTextNodes = (nodes: InlineNode[]): InlineNode[] => {
  const normalized: InlineNode[] = [];

  for (const node of nodes) {
    if (node.type === "text" && node.text.length === 0) {
      continue;
    }

    const previousNode = normalized[normalized.length - 1];

    if (
      node.type === "text" &&
      previousNode?.type === "text" &&
      JSON.stringify(previousNode.marks || []) === JSON.stringify(node.marks || [])
    ) {
      previousNode.text += node.text;
      continue;
    }

    normalized.push(node);
  }

  return normalized;
};

const replaceInlineTextRange = (
  nodes: InlineNode[],
  startOffset: number,
  endOffset: number,
  replacementText: string,
  patchId: string,
) => {
  if (startOffset > endOffset) {
    throw new PatchApplicationError(patchId, "Text range startOffset must be <= endOffset.");
  }

  const updatedNodes: InlineNode[] = [];
  let cursor = 0;
  let insertedReplacement = false;

  const maybeInsertReplacement = () => {
    if (!insertedReplacement && replacementText.length > 0) {
      updatedNodes.push({ type: "text", text: replacementText });
    }
    insertedReplacement = true;
  };

  for (const node of nodes) {
    const nodeText = extractInlineText(node);
    const nodeLength = nodeText.length;
    const segmentStart = cursor;
    const segmentEnd = cursor + nodeLength;
    const overlaps = startOffset < segmentEnd && endOffset > segmentStart;

    if (segmentStart === startOffset && endOffset === startOffset && !insertedReplacement) {
      maybeInsertReplacement();
    }

    if (node.type !== "text") {
      if (overlaps) {
        throw new PatchApplicationError(
          patchId,
          "Text range patch intersects an inline atom and cannot be auto-applied.",
        );
      }

      updatedNodes.push(node);
      cursor = segmentEnd;
      continue;
    }

    if (!overlaps) {
      updatedNodes.push(node);
      cursor = segmentEnd;
      continue;
    }

    const localStart = Math.max(0, startOffset - segmentStart);
    const localEnd = Math.min(node.text.length, endOffset - segmentStart);
    const beforeText = node.text.slice(0, localStart);
    const afterText = node.text.slice(localEnd);

    if (beforeText.length > 0) {
      updatedNodes.push({
        ...node,
        text: beforeText,
      });
    }

    if (!insertedReplacement) {
      maybeInsertReplacement();
    }

    if (afterText.length > 0) {
      updatedNodes.push({
        ...node,
        text: afterText,
      });
    }

    cursor = segmentEnd;
  }

  if (!insertedReplacement && startOffset === cursor && endOffset === cursor) {
    maybeInsertReplacement();
  }

  return normalizeTextNodes(updatedNodes);
};

const setValueAtPath = (target: Record<string, unknown>, attributePath: string, value: unknown, patchId: string) => {
  if (attributePath.trim().length === 0) {
    throw new PatchApplicationError(patchId, "Attribute patch requires a non-empty attributePath.");
  }

  if (attributePath === "nodeId" || attributePath.startsWith("nodeId.")) {
    throw new PatchApplicationError(patchId, "nodeId cannot be changed by attribute patches.");
  }

  const parts = attributePath
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean);

  let cursor: unknown = target;

  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];

    if (cursor === null || typeof cursor !== "object" || !(part in (cursor as Record<string, unknown>))) {
      throw new PatchApplicationError(
        patchId,
        `Attribute path "${attributePath}" could not be resolved.`,
      );
    }

    cursor = (cursor as Record<string, unknown>)[part];
  }

  const finalPart = parts[parts.length - 1];

  if (cursor === null || typeof cursor !== "object") {
    throw new PatchApplicationError(
      patchId,
      `Attribute path "${attributePath}" could not be resolved.`,
    );
  }

  (cursor as Record<string, unknown>)[finalPart] = value;
};

const assertPatchPrecondition = (patch: DocumentPatch, node: AstNode) => {
  if (!patch.precondition) {
    return;
  }

  if (
    patch.precondition.expectedText !== undefined &&
    extractAstNodeText(node) !== patch.precondition.expectedText
  ) {
    throw new PatchApplicationError(
      patch.patchId,
      `Patch "${patch.patchId}" failed expectedText precondition.`,
    );
  }

  if (
    patch.precondition.expectedNodeHash !== undefined &&
    computePatchNodeHash(node) !== patch.precondition.expectedNodeHash
  ) {
    throw new PatchApplicationError(
      patch.patchId,
      `Patch "${patch.patchId}" failed expectedNodeHash precondition.`,
    );
  }
};

const applyTextRangePatch = (patch: DocumentPatch, location: NodeLocation, replacementText: string) => {
  if (patch.target.targetType !== "text_range") {
    throw new PatchApplicationError(
      patch.patchId,
      `Patch "${patch.patchId}" must target "text_range" for "${patch.operation}".`,
    );
  }

  const { startOffset, endOffset } = patch.target;
  const targetNode = location.node;

  if (isBlockNode(targetNode)) {
    switch (targetNode.type) {
      case "paragraph":
      case "heading":
      case "figure_caption":
      case "footnote_item":
        targetNode.children = replaceInlineTextRange(
          targetNode.children,
          startOffset,
          endOffset,
          replacementText,
          patch.patchId,
        ) as typeof targetNode.children;
        return;
      case "code_block":
        targetNode.code = `${targetNode.code.slice(0, startOffset)}${replacementText}${targetNode.code.slice(endOffset)}`;
        return;
      case "math_block":
        targetNode.latex = `${targetNode.latex.slice(0, startOffset)}${replacementText}${targetNode.latex.slice(endOffset)}`;
        return;
      case "mermaid_block":
        targetNode.code = `${targetNode.code.slice(0, startOffset)}${replacementText}${targetNode.code.slice(endOffset)}`;
        return;
      default:
        break;
    }
  }

  if (isInlineNode(targetNode)) {
    switch (targetNode.type) {
      case "math_inline":
        targetNode.latex = `${targetNode.latex.slice(0, startOffset)}${replacementText}${targetNode.latex.slice(endOffset)}`;
        return;
      case "cross_reference":
        targetNode.targetLabel = `${targetNode.targetLabel.slice(0, startOffset)}${replacementText}${targetNode.targetLabel.slice(endOffset)}`;
        return;
      case "footnote_ref":
        targetNode.footnoteId = `${targetNode.footnoteId.slice(0, startOffset)}${replacementText}${targetNode.footnoteId.slice(endOffset)}`;
        return;
      default:
        break;
    }
  }

  throw new PatchApplicationError(
    patch.patchId,
    `Patch "${patch.patchId}" cannot apply text range replacement to node type "${targetNode.type}".`,
  );
};

export const applyDocumentPatch = (document: DocumentAst, patch: DocumentPatch): DocumentAst => {
  const nextDocument = cloneDocumentAst(document);

  if (patch.target.targetType === "structured_path" || patch.target.targetType === "document_text") {
    throw new PatchApplicationError(
      patch.patchId,
      `Patch "${patch.patchId}" targets ${patch.target.targetType}, which is not supported by the rich-text AST engine.`,
    );
  }

  const location = findNodeLocation(nextDocument, patch.target.nodeId);

  if (!location) {
    throw new PatchApplicationError(
      patch.patchId,
      `Patch "${patch.patchId}" could not find target node "${patch.target.nodeId}".`,
    );
  }

  assertPatchPrecondition(patch, location.node);

  switch (patch.operation) {
    case "insert_before": {
      if (patch.target.targetType !== "node") {
        throw new PatchApplicationError(patch.patchId, `Patch "${patch.patchId}" must target "node" for insert_before.`);
      }

      const payload = assertPayloadKind(patch, "insert_nodes");
      assertCompatibleNodes(patch, location.node, payload.nodes);
      location.siblings.splice(location.index, 0, ...structuredClone(payload.nodes));
      return nextDocument;
    }
    case "insert_after": {
      if (patch.target.targetType !== "node") {
        throw new PatchApplicationError(patch.patchId, `Patch "${patch.patchId}" must target "node" for insert_after.`);
      }

      const payload = assertPayloadKind(patch, "insert_nodes");
      assertCompatibleNodes(patch, location.node, payload.nodes);
      location.siblings.splice(location.index + 1, 0, ...structuredClone(payload.nodes));
      return nextDocument;
    }
    case "replace_node": {
      if (patch.target.targetType !== "node") {
        throw new PatchApplicationError(patch.patchId, `Patch "${patch.patchId}" must target "node" for replace_node.`);
      }

      const payload = assertPayloadKind(patch, "replace_node");
      assertCompatibleNodes(patch, location.node, [payload.node]);
      location.siblings.splice(location.index, 1, structuredClone(payload.node));
      return nextDocument;
    }
    case "delete_node": {
      if (patch.target.targetType !== "node") {
        throw new PatchApplicationError(patch.patchId, `Patch "${patch.patchId}" must target "node" for delete_node.`);
      }

      location.siblings.splice(location.index, 1);
      return nextDocument;
    }
    case "replace_text_range": {
      const payload = assertPayloadKind(patch, "replace_text");
      applyTextRangePatch(patch, location, payload.text);
      return nextDocument;
    }
    case "update_attribute": {
      if (patch.target.targetType !== "attribute") {
        throw new PatchApplicationError(patch.patchId, `Patch "${patch.patchId}" must target "attribute" for update_attribute.`);
      }

      const payload = assertPayloadKind(patch, "update_attribute");
      setValueAtPath(location.node as Record<string, unknown>, patch.target.attributePath, payload.value, patch.patchId);
      return nextDocument;
    }
    default:
      throw new PatchApplicationError(
        patch.patchId,
        `Patch "${patch.patchId}" uses unsupported operation "${patch.operation}".`,
      );
  }
};

export const applyDocumentPatchSet = (
  document: DocumentAst,
  patchSet: DocumentPatchSet,
  options: ApplyPatchSetOptions = {},
): PatchSetApplicationResult => {
  const includePending = options.includePending ?? false;
  const applicableStatuses = includePending ? new Set(["pending", "accepted", "edited"]) : new Set(["accepted", "edited"]);
  const applicablePatches = patchSet.patches.filter((patch) => applicableStatuses.has(patch.status));
  const failures: PatchApplicationFailure[] = [];
  const warnings: string[] = [];
  const appliedPatchIds: string[] = [];
  let currentDocument = cloneDocumentAst(document);

  for (const patch of applicablePatches) {
    try {
      const candidateDocument = applyDocumentPatch(currentDocument, patch);
      const validation = validateDocumentAst(candidateDocument);

      if (validation.errors.length > 0) {
        throw new PatchApplicationError(
          patch.patchId,
          `Patch "${patch.patchId}" produced an invalid AST: ${validation.errors
            .map((issue) => `${issue.code} at ${issue.path}`)
            .join("; ")}`,
        );
      }

      warnings.push(...validation.warnings.map((issue) => `${patch.patchId}: ${issue.code} at ${issue.path}`));
      currentDocument = candidateDocument;
      appliedPatchIds.push(patch.patchId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown patch application error.";
      failures.push({ patchId: patch.patchId, message });

      if (options.stopOnError) {
        break;
      }
    }
  }

  return {
    appliedPatchIds,
    document: currentDocument,
    failures,
    warnings,
  };
};
