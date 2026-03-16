import type {
  BlockNode,
  InlineNode,
  PatchOperation,
  PatchPrecondition,
  PatchTarget,
  TableCellNode,
  TableRowNode,
} from "./documentAst";

export type PatchAuthor = "ai" | "user" | "system";
export type PatchStatus = "pending" | "accepted" | "rejected" | "edited";
export type PatchSetStatus = "draft" | "in_review" | "completed";

export interface PatchSourceAttribution {
  sourceId: string;
  chunkId?: string;
  sectionId?: string;
  excerpt?: string;
}

export type PatchAstNode = BlockNode | InlineNode | TableRowNode | TableCellNode;

export interface InsertNodesPatchPayload {
  kind: "insert_nodes";
  nodes: PatchAstNode[];
}

export interface ReplaceNodePatchPayload {
  kind: "replace_node";
  node: PatchAstNode;
}

export interface ReplaceTextPatchPayload {
  kind: "replace_text";
  text: string;
}

export interface UpdateAttributePatchPayload {
  kind: "update_attribute";
  value: unknown;
}

export type PatchPayload =
  | InsertNodesPatchPayload
  | ReplaceNodePatchPayload
  | ReplaceTextPatchPayload
  | UpdateAttributePatchPayload;

export interface DocumentPatch {
  patchId: string;
  title: string;
  summary?: string;
  operation: PatchOperation;
  target: PatchTarget;
  originalText?: string;
  suggestedText?: string;
  reason?: string;
  confidence?: number;
  author: PatchAuthor;
  status: PatchStatus;
  payload?: PatchPayload;
  precondition?: PatchPrecondition;
  sources?: PatchSourceAttribution[];
  metadata?: Record<string, string>;
}

export interface DocumentPatchSet {
  patchSetId: string;
  documentId: string;
  title: string;
  description?: string;
  author: PatchAuthor;
  status: PatchSetStatus;
  createdAt: number;
  patches: DocumentPatch[];
}

export interface PatchDecision {
  patchId: string;
  decision: Extract<PatchStatus, "accepted" | "rejected" | "edited">;
  editedSuggestedText?: string;
  decidedAt: number;
}

export interface PatchApplyReportFailure {
  patchId?: string;
  patchTitle?: string;
  message: string;
}

export interface PatchApplyReport {
  appliedPatchIds: string[];
  attemptedAt: number;
  failures: PatchApplyReportFailure[];
  phase: "rich_text" | "document_text" | "structured";
  scope: "preflight" | "apply";
  warnings: string[];
}
