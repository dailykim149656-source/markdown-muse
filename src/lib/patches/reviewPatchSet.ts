import type { InlineNode } from "@/types/documentAst";
import type {
  DocumentPatch,
  DocumentPatchSet,
  PatchAstNode,
  PatchDecision,
} from "@/types/documentPatch";

export interface PatchDecisionWarning {
  patchId: string;
  message: string;
}

export interface PatchDecisionResult {
  patchSet: DocumentPatchSet;
  warnings: PatchDecisionWarning[];
}

const clonePatchSet = (patchSet: DocumentPatchSet): DocumentPatchSet => structuredClone(patchSet);

const createTextChildren = (text: string): InlineNode[] => [{ type: "text", text }];

const rewritePatchNodeText = (node: PatchAstNode, text: string): PatchAstNode | null => {
  if ("kind" in node && node.kind === "inline") {
    switch (node.type) {
      case "math_inline":
        return { ...node, latex: text };
      case "cross_reference":
        return { ...node, targetLabel: text };
      case "footnote_ref":
        return { ...node, footnoteId: text };
      default:
        return null;
    }
  }

  if ("kind" in node && node.kind === "block") {
    switch (node.type) {
      case "paragraph":
      case "heading":
      case "figure_caption":
      case "footnote_item":
        return { ...node, children: createTextChildren(text) };
      case "code_block":
        return { ...node, code: text };
      case "math_block":
        return { ...node, latex: text };
      case "mermaid_block":
        return { ...node, code: text };
      default:
        return null;
    }
  }

  return null;
};

export const canApplyEditedSuggestedText = (patch: DocumentPatch) => {
  if (!patch.payload) {
    return false;
  }

  switch (patch.payload.kind) {
    case "replace_text":
    case "update_attribute":
      return true;
    case "replace_node":
      return rewritePatchNodeText(patch.payload.node, patch.suggestedText || "") !== null;
    case "insert_nodes":
      return patch.payload.nodes.length === 1 && rewritePatchNodeText(patch.payload.nodes[0], patch.suggestedText || "") !== null;
    default:
      return false;
  }
};

const applyEditedSuggestedTextToPatch = (patch: DocumentPatch, editedSuggestedText: string): PatchDecisionWarning[] => {
  const warnings: PatchDecisionWarning[] = [];
  patch.suggestedText = editedSuggestedText;

  if (!patch.payload) {
    return warnings;
  }

  switch (patch.payload.kind) {
    case "replace_text":
      patch.payload.text = editedSuggestedText;
      return warnings;
    case "update_attribute":
      patch.payload.value = editedSuggestedText;
      return warnings;
    case "replace_node": {
      const rewrittenNode = rewritePatchNodeText(patch.payload.node, editedSuggestedText);

      if (!rewrittenNode) {
        warnings.push({
          patchId: patch.patchId,
          message: "Edited suggestion was saved as preview text only; payload node shape could not be rewritten automatically.",
        });
        return warnings;
      }

      patch.payload.node = rewrittenNode;
      return warnings;
    }
    case "insert_nodes": {
      if (patch.payload.nodes.length !== 1) {
        warnings.push({
          patchId: patch.patchId,
          message: "Edited suggestion was saved as preview text only; multi-node insert payloads cannot be rewritten automatically.",
        });
        return warnings;
      }

      const rewrittenNode = rewritePatchNodeText(patch.payload.nodes[0], editedSuggestedText);

      if (!rewrittenNode) {
        warnings.push({
          patchId: patch.patchId,
          message: "Edited suggestion was saved as preview text only; insert payload node shape could not be rewritten automatically.",
        });
        return warnings;
      }

      patch.payload.nodes = [rewrittenNode];
      return warnings;
    }
    default:
      return warnings;
  }
};

export const applyPatchDecision = (
  patchSet: DocumentPatchSet,
  decision: PatchDecision,
): PatchDecisionResult => {
  const nextPatchSet = clonePatchSet(patchSet);
  const patch = nextPatchSet.patches.find((candidatePatch) => candidatePatch.patchId === decision.patchId);

  if (!patch) {
    return {
      patchSet: nextPatchSet,
      warnings: [{
        patchId: decision.patchId,
        message: "Patch decision referenced an unknown patch id.",
      }],
    };
  }

  patch.status = decision.decision;
  const warnings: PatchDecisionWarning[] = [];

  if (decision.decision === "edited") {
    warnings.push(...applyEditedSuggestedTextToPatch(patch, decision.editedSuggestedText || patch.suggestedText || ""));
  }

  return {
    patchSet: nextPatchSet,
    warnings,
  };
};

export const applyPatchDecisions = (
  patchSet: DocumentPatchSet,
  decisions: PatchDecision[],
): PatchDecisionResult => {
  let nextPatchSet = clonePatchSet(patchSet);
  const warnings: PatchDecisionWarning[] = [];

  for (const decision of decisions) {
    const result = applyPatchDecision(nextPatchSet, decision);
    nextPatchSet = result.patchSet;
    warnings.push(...result.warnings);
  }

  return {
    patchSet: nextPatchSet,
    warnings,
  };
};
