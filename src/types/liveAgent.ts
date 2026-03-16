import type { AiAssistantScreenshotPayload } from "@/types/aiAssistant";
import type { SummarizeDocumentResponse } from "@/types/aiAssistant";
import type { Locale } from "@/i18n/types";
import type { ProcedureExtractionResult } from "@/lib/ai/procedureExtraction";
import type { DocumentPatchSet } from "@/types/documentPatch";

export type AgentRole = "assistant" | "user";

export interface AgentChatMessage {
  id: string;
  role: AgentRole;
  text: string;
  createdAt: number;
}

export interface AgentHeadingContext {
  level: number;
  nodeId: string;
  text: string;
}

export interface AgentDocumentContext {
  documentId: string;
  fileName: string;
  mode: "html" | "latex" | "markdown";
  markdown: string;
  existingHeadings: AgentHeadingContext[];
}

export interface AgentLocalReference extends AgentDocumentContext {
  source: "local";
}

export interface AgentSelectedDriveReference {
  fileId: string;
  fileName: string;
}

export interface AgentAvailableTargetDocument {
  documentId: string;
  fileName: string;
  mode: "html" | "latex" | "markdown";
}

export interface AgentEvidence {
  sourceId: string;
  sourceKind: "drive" | "local";
  fileName?: string;
  chunkId?: string;
  sectionId?: string;
  excerpt?: string;
}

export type AgentDeliveryMode = "direct_apply" | "review_first";

export interface AgentResolvedReference {
  autoInferred?: boolean;
  documentId?: string;
  fileId?: string;
  kind: "active_document" | "drive_document" | "local_document";
  label: string;
}

export type AgentCreateDocumentKind = "summary" | "handover";

export type AgentSectionEdit =
  | {
      kind: "replace_document_body";
      markdownBody: string;
      rationale: string;
      sources?: AgentEvidence[];
    }
  | {
      kind: "replace_section";
      targetHeadingNodeId: string;
      targetHeadingTitle?: string;
      newHeading?: { level: 1 | 2 | 3; title: string };
      markdownBody: string;
      rationale: string;
      sources?: AgentEvidence[];
    }
  | {
      kind: "insert_after_section";
      targetHeadingNodeId: string;
      targetHeadingTitle?: string;
      newHeading: { level: 1 | 2 | 3; title: string };
      markdownBody: string;
      rationale: string;
      sources?: AgentEvidence[];
    }
  | {
      kind: "append_section";
      newHeading: { level: 1 | 2 | 3; title: string };
      markdownBody: string;
      rationale: string;
      sources?: AgentEvidence[];
    };

export interface AgentCurrentDocumentDraft {
  kind: "current_document";
  edits: AgentSectionEdit[];
}

export interface AgentNewDocumentDraft {
  kind: "new_document";
  title: string;
  markdown: string;
  rationale: string;
  sources?: AgentEvidence[];
}

export interface AgentDriveCandidate {
  fileId: string;
  fileName: string;
  modifiedTime?: string;
  excerpt: string;
  relevanceReason: string;
  webViewLink?: string;
}

export type AgentStatusKind =
  | "gemini_misconfigured"
  | "gemini_rate_limited"
  | "gemini_unavailable";

export interface AgentStatus {
  kind: AgentStatusKind;
  message: string;
}

export interface AgentWorkspaceGraphHintDocument {
  documentId: string;
  name: string;
  recommendationScore: number;
  relationKinds: Array<"duplicate" | "referenced_by" | "references" | "similar">;
}

export interface AgentWorkspaceGraphHintIssue {
  id: string;
  kind: string;
  message: string;
  relatedDocumentIds: string[];
  severity: "info" | "warning";
}

export interface AgentWorkspaceGraphHints {
  impactSummary: {
    impactedDocumentCount: number;
    inboundReferenceCount: number;
    issueCount: number;
    outboundReferenceCount: number;
  };
  issues: AgentWorkspaceGraphHintIssue[];
  relatedDocuments: AgentWorkspaceGraphHintDocument[];
}

export interface AgentGraphContext {
  workspaceHints?: AgentWorkspaceGraphHints | null;
}

export type AgentDelegatedCapability =
  | "compare_documents"
  | "extract_procedure"
  | "generate_section"
  | "generate_toc"
  | "suggest_document_updates"
  | "summarize_document";

export interface AgentTurnRequest {
  threadId: string;
  messages: AgentChatMessage[];
  activeDocument: AgentDocumentContext | null;
  availableTargetDocuments: AgentAvailableTargetDocument[];
  targetDefault: "active_document";
  localReferences: AgentLocalReference[];
  driveReferenceFileIds: string[];
  graphContext?: AgentGraphContext;
  locale?: Locale;
  screenshot?: AiAssistantScreenshotPayload;
}

export interface AgentTurnResponse {
  agentStatus?: AgentStatus;
  assistantMessage: AgentChatMessage;
  effect: AgentEffect;
  currentDocumentDraft?: AgentCurrentDocumentDraft;
  newDocumentDraft?: AgentNewDocumentDraft;
  driveCandidates?: AgentDriveCandidate[];
}

export type AgentEffect =
  | { type: "reply_only" }
  | { type: "ask_followup" }
  | { type: "draft_current_document"; changeSetTitle: string; deliveryMode: AgentDeliveryMode; summary: string }
  | { type: "draft_new_document"; title: string; summary: string }
  | { type: "show_drive_candidates"; query: string }
  | { type: "ready_to_import_drive_file"; fileId: string; fileName: string }
  | { type: "open_google_connect" }
  | {
      type: "delegate_ai_capability";
      capability: AgentDelegatedCapability;
      createDocumentAfter?: boolean;
      createDocumentKind?: AgentCreateDocumentKind;
      objective?: string;
      prompt?: string;
      targetFileId?: string;
      targetDocumentId?: string;
      targetDocumentName?: string;
    };

export type AgentArtifact =
  | {
      id: string;
      kind: "compare_preview";
      patchCount: number;
      patchSet: DocumentPatchSet | null;
      patchSetTitle: string;
      targetDocumentId: string;
      targetDocumentName: string;
      comparisonCounts: {
        added: number;
        changed: number;
        inconsistent: number;
        removed: number;
      };
      resolvedReferences: AgentResolvedReference[];
    }
  | {
      id: string;
      kind: "draft_preview";
      draft: AgentCurrentDocumentDraft | AgentNewDocumentDraft;
      resolvedReferences: AgentResolvedReference[];
    }
  | {
      id: string;
      kind: "document_target";
      capability: Extract<AgentDelegatedCapability, "compare_documents" | "suggest_document_updates">;
      candidates: AgentAvailableTargetDocument[];
      prompt: string;
      resolvedReferences: AgentResolvedReference[];
    }
  | {
      id: string;
      kind: "drive_candidates";
      candidates: AgentDriveCandidate[];
      query?: string;
      resolvedReferences: AgentResolvedReference[];
    }
  | {
      id: string;
      kind: "patch_result";
      capability: Extract<AgentDelegatedCapability, "generate_section" | "suggest_document_updates"> | "update_current_document";
      deliveryMode: AgentDeliveryMode;
      directApplySucceeded?: boolean;
      patchCount: number;
      patchSet: DocumentPatchSet | null;
      patchSetTitle: string;
      resolvedReferences: AgentResolvedReference[];
      reviewOpened: boolean;
      targetDocumentId?: string;
      targetDocumentName?: string;
    }
  | {
      id: string;
      kind: "procedure";
      result: ProcedureExtractionResult;
      resolvedReferences: AgentResolvedReference[];
    }
  | {
      id: string;
      kind: "summary";
      createDocumentAfter?: boolean;
      createDocumentKind?: AgentCreateDocumentKind;
      documentCreated?: boolean;
      objective: string;
      result: SummarizeDocumentResponse;
      resolvedReferences: AgentResolvedReference[];
      sourceDocumentId: string;
      sourceDocumentName: string;
    }
  | {
      id: string;
      kind: "toc_preview";
      entries: Array<{
        level: 1 | 2 | 3;
        title: string;
      }>;
      maxDepth: 1 | 2 | 3;
      patchCount: number;
      patchSet: DocumentPatchSet | null;
      patchSetTitle: string;
      rationale: string;
      resolvedReferences: AgentResolvedReference[];
    };
