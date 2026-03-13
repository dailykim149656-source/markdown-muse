import type { AiAssistantScreenshotPayload } from "@/types/aiAssistant";
import type { Locale } from "@/i18n/types";

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

export interface AgentEvidence {
  sourceId: string;
  sourceKind: "drive" | "local";
  fileName?: string;
  chunkId?: string;
  sectionId?: string;
  excerpt?: string;
}

export type AgentEffect =
  | { type: "reply_only" }
  | { type: "ask_followup" }
  | { type: "draft_current_document"; changeSetTitle: string; summary: string }
  | { type: "draft_new_document"; title: string; summary: string }
  | { type: "show_drive_candidates"; query: string }
  | { type: "ready_to_import_drive_file"; fileId: string; fileName: string }
  | { type: "open_google_connect" };

export type AgentSectionEdit =
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

export interface AgentTurnRequest {
  threadId: string;
  messages: AgentChatMessage[];
  activeDocument: AgentDocumentContext | null;
  targetDefault: "active_document";
  localReferences: AgentLocalReference[];
  driveReferenceFileIds: string[];
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
