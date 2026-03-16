import { schemaType } from "../gemini/client";
import type { ActiveDocumentRetrievalContext } from "./buildActiveDocumentRetrievalContext";

export const AGENT_PLANNED_ACTIONS = [
  "update_current_document",
  "create_new_document",
  "search_drive_documents",
  "prepare_drive_import",
  "general_reply",
  "ask_followup",
  "summarize_document",
  "generate_section",
  "generate_toc",
  "compare_documents",
  "extract_procedure",
  "suggest_document_updates",
] as const;

export type AgentPlannedAction = (typeof AGENT_PLANNED_ACTIONS)[number];

export interface AgentPlannerTarget {
  documentId?: string;
  documentName?: string;
  fileId?: string;
  fileName?: string;
  headingNodeId?: string;
  sectionId?: string;
}

export interface AgentPlannerArguments {
  createDocumentAfter?: boolean;
  fieldKeys?: string[];
  graphNodeIds?: string[];
  prompt?: string;
  query?: string;
  replyOutline?: string;
  targetType?: "document" | "field" | "section";
  targetSectionHint?: string;
}

export interface AgentPlannerResponse {
  action: AgentPlannedAction;
  confidence: number;
  reason: string;
  missingInformation: string[];
  target?: AgentPlannerTarget;
  arguments?: AgentPlannerArguments;
}

interface RawAgentPlannerResponse {
  action?: string;
  confidence?: number;
  reason?: string;
  missingInformation?: string[];
  target?: AgentPlannerTarget;
  arguments?: AgentPlannerArguments;
}

export interface AgentExecutionContext {
  driveReferences: Array<{
    excerpt: string;
    fileId: string;
    fileName: string;
  }>;
  httpRequest: import("node:http").IncomingMessage;
  latestUserMessage: string;
  request: import("../../../src/types/liveAgent").AgentTurnRequest;
  retrievalContext: ActiveDocumentRetrievalContext | null;
  workspaceConnected: boolean;
}

export interface AgentExecutionResult {
  availableImportTargets: Array<{
    fileId: string;
    fileName: string;
  }>;
  driveCandidates: import("../../../src/types/liveAgent").AgentDriveCandidate[];
  rawResponse: import("./turnResponse").RawAgentTurnResponse;
  telemetry?: {
    failureReason?:
      | "ambiguous_graph_target"
      | "field_match_failed"
      | "knowledge_graph_unavailable"
      | "no_graph_target"
      | "section_patch_failed";
    deterministicFallbackUsed?: boolean;
    driveAuthGateUsed?: boolean;
    executorAction: AgentPlannedAction;
  };
}

export const agentPlannerResponseSchema = {
  properties: {
    action: { type: schemaType.STRING },
    arguments: {
      properties: {
        createDocumentAfter: { type: schemaType.BOOLEAN },
        fieldKeys: {
          items: { type: schemaType.STRING },
          type: schemaType.ARRAY,
        },
        graphNodeIds: {
          items: { type: schemaType.STRING },
          type: schemaType.ARRAY,
        },
        prompt: { type: schemaType.STRING },
        query: { type: schemaType.STRING },
        replyOutline: { type: schemaType.STRING },
        targetType: { type: schemaType.STRING },
        targetSectionHint: { type: schemaType.STRING },
      },
      type: schemaType.OBJECT,
    },
    confidence: { type: schemaType.NUMBER },
    missingInformation: {
      items: { type: schemaType.STRING },
      type: schemaType.ARRAY,
    },
    reason: { type: schemaType.STRING },
    target: {
      properties: {
        documentId: { type: schemaType.STRING },
        documentName: { type: schemaType.STRING },
        fileId: { type: schemaType.STRING },
        fileName: { type: schemaType.STRING },
        headingNodeId: { type: schemaType.STRING },
        sectionId: { type: schemaType.STRING },
      },
      type: schemaType.OBJECT,
    },
  },
  required: ["action", "confidence", "reason", "missingInformation"],
  type: schemaType.OBJECT,
};

const normalizeAction = (value: string | undefined): AgentPlannedAction =>
  AGENT_PLANNED_ACTIONS.find((action) => action === value) || "ask_followup";

const normalizeConfidence = (value: number | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  if (value <= 0) {
    return 0;
  }

  if (value >= 1) {
    return 1;
  }

  return value;
};

const normalizeStringArray = (value: string[] | undefined) =>
  Array.isArray(value)
    ? value
      .map((entry) => entry?.trim())
      .filter((entry): entry is string => Boolean(entry))
    : [];

const normalizeTarget = (value: AgentPlannerTarget | undefined) => {
  if (!value) {
    return undefined;
  }

  const normalized = {
    documentId: value.documentId?.trim() || undefined,
    documentName: value.documentName?.trim() || undefined,
    fileId: value.fileId?.trim() || undefined,
    fileName: value.fileName?.trim() || undefined,
    headingNodeId: value.headingNodeId?.trim() || undefined,
    sectionId: value.sectionId?.trim() || undefined,
  };

  return Object.values(normalized).some(Boolean) ? normalized : undefined;
};

const normalizeArguments = (value: AgentPlannerArguments | undefined) => {
  if (!value) {
    return undefined;
  }

  const normalized = {
    createDocumentAfter: typeof value.createDocumentAfter === "boolean" ? value.createDocumentAfter : undefined,
    fieldKeys: Array.isArray(value.fieldKeys)
      ? value.fieldKeys.map((entry) => entry?.trim()).filter((entry): entry is string => Boolean(entry))
      : undefined,
    graphNodeIds: Array.isArray(value.graphNodeIds)
      ? value.graphNodeIds.map((entry) => entry?.trim()).filter((entry): entry is string => Boolean(entry))
      : undefined,
    prompt: value.prompt?.trim() || undefined,
    query: value.query?.trim() || undefined,
    replyOutline: value.replyOutline?.trim() || undefined,
    targetType: value.targetType === "document" || value.targetType === "field" || value.targetType === "section"
      ? value.targetType
      : undefined,
    targetSectionHint: value.targetSectionHint?.trim() || undefined,
  };

  if (normalized.fieldKeys && normalized.fieldKeys.length === 0) {
    normalized.fieldKeys = undefined;
  }

  if (normalized.graphNodeIds && normalized.graphNodeIds.length === 0) {
    normalized.graphNodeIds = undefined;
  }

  return Object.values(normalized).some(Boolean) ? normalized : undefined;
};

export const normalizePlannerResponse = (response: RawAgentPlannerResponse): AgentPlannerResponse => ({
  action: normalizeAction(response.action),
  arguments: normalizeArguments(response.arguments),
  confidence: normalizeConfidence(response.confidence),
  missingInformation: normalizeStringArray(response.missingInformation),
  reason: response.reason?.trim() || "The request needs clarification.",
  target: normalizeTarget(response.target),
});
