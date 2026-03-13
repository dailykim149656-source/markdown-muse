import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { EditorState, Transaction } from "@tiptap/pm/state";

const NODE_ID_PREFIX = "node";

const ELIGIBLE_NODE_TYPES = [
  "paragraph",
  "heading",
  "blockquote",
  "codeBlock",
  "bulletList",
  "orderedList",
  "taskList",
  "listItem",
  "taskItem",
  "horizontalRule",
  "image",
  "figureCaption",
  "table",
  "tableRow",
  "tableHeader",
  "tableCell",
  "mathBlock",
  "mermaidBlock",
  "admonition",
  "resumeHeader",
  "resumeSummary",
  "resumeEntry",
  "resumeSkillRow",
  "latexTitleBlock",
  "latexAbstract",
  "opaqueLatexBlock",
  "tableOfContents",
  "footnoteItem",
  "math",
  "crossReference",
  "footnoteRef",
];

const ELIGIBLE_NODE_TYPE_SET = new Set(ELIGIBLE_NODE_TYPES);

const toKebabCase = (value: string) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

const buildTypePrefix = (typeName: string) => `${NODE_ID_PREFIX}-${toKebabCase(typeName)}`;

const isEligibleNodeType = (typeName: string) => ELIGIBLE_NODE_TYPE_SET.has(typeName);

const getExistingSequence = (nodeId: string, typeName: string) => {
  const match = nodeId.match(new RegExp(`^${buildTypePrefix(typeName)}-(\\d+)$`));

  if (!match) {
    return null;
  }

  return Number.parseInt(match[1], 10);
};

const buildMissingNodeIdTransaction = (state: EditorState): Transaction | null => {
  const usedIds = new Set<string>();
  const nextSequenceByType = new Map<string, number>();
  const missingNodes: Array<{ attrs: Record<string, unknown>; marks: ProseMirrorNode["marks"]; pos: number; typeName: string }> = [];

  state.doc.descendants((node, pos) => {
    if (!isEligibleNodeType(node.type.name)) {
      return true;
    }

    const currentNodeId = typeof node.attrs.nodeId === "string" && node.attrs.nodeId.trim().length > 0
      ? node.attrs.nodeId
      : null;

    if (currentNodeId) {
      usedIds.add(currentNodeId);
      const existingSequence = getExistingSequence(currentNodeId, node.type.name);

      if (existingSequence !== null) {
        const currentNextSequence = nextSequenceByType.get(node.type.name) ?? 1;
        nextSequenceByType.set(node.type.name, Math.max(currentNextSequence, existingSequence + 1));
      }

      return true;
    }

    missingNodes.push({
      attrs: node.attrs,
      marks: node.marks,
      pos,
      typeName: node.type.name,
    });

    return true;
  });

  if (missingNodes.length === 0) {
    return null;
  }

  const transaction = state.tr;

  for (const missingNode of missingNodes) {
    const typePrefix = buildTypePrefix(missingNode.typeName);
    let nextSequence = nextSequenceByType.get(missingNode.typeName) ?? 1;
    let nextNodeId = `${typePrefix}-${nextSequence}`;

    while (usedIds.has(nextNodeId)) {
      nextSequence += 1;
      nextNodeId = `${typePrefix}-${nextSequence}`;
    }

    usedIds.add(nextNodeId);
    nextSequenceByType.set(missingNode.typeName, nextSequence + 1);
    transaction.setNodeMarkup(
      missingNode.pos,
      undefined,
      { ...missingNode.attrs, nodeId: nextNodeId },
      missingNode.marks,
    );
  }

  return transaction.steps.length > 0 ? transaction : null;
};

const NodeIdExtension = Extension.create({
  name: "nodeId",

  addGlobalAttributes() {
    return [
      {
        types: ELIGIBLE_NODE_TYPES,
        attributes: {
          nodeId: {
            default: null,
            parseHTML: (element: HTMLElement) => element.getAttribute("data-node-id"),
            renderHTML: (attributes: Record<string, unknown>) => {
              if (typeof attributes.nodeId !== "string" || attributes.nodeId.length === 0) {
                return {};
              }

              return { "data-node-id": attributes.nodeId };
            },
          },
        },
      },
    ];
  },

  onCreate() {
    queueMicrotask(() => {
      const transaction = buildMissingNodeIdTransaction(this.editor.state);

      if (!transaction) {
        return;
      }

      this.editor.view.dispatch(transaction);
    });
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction: (transactions, _oldState, newState) => {
          if (!transactions.some((transaction) => transaction.docChanged)) {
            return null;
          }

          return buildMissingNodeIdTransaction(newState);
        },
      }),
    ];
  },
});

export {
  ELIGIBLE_NODE_TYPES,
  buildMissingNodeIdTransaction,
  isEligibleNodeType,
};

export default NodeIdExtension;
