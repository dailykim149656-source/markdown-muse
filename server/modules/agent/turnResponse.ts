import { schemaType } from "../gemini/client";
import type {
  AgentChatMessage,
  AgentCreateDocumentKind,
  AgentCurrentDocumentDraft,
  AgentDeliveryMode,
  AgentDelegatedCapability,
  AgentDriveCandidate,
  AgentEffect,
  AgentNewDocumentDraft,
  AgentStatus,
  AgentTurnResponse,
} from "../../../src/types/liveAgent";

export interface RawAgentTurnResponse {
  agentStatus?: AgentStatus;
  assistantText?: string;
  currentDocumentDraft?: AgentCurrentDocumentDraft;
  effect?: {
    capability?: AgentDelegatedCapability;
    type?: string;
    changeSetTitle?: string;
    createDocumentAfter?: boolean;
    createDocumentKind?: AgentCreateDocumentKind;
    deliveryMode?: AgentDeliveryMode;
    objective?: string;
    prompt?: string;
    summary?: string;
    targetFileId?: string;
    targetDocumentId?: string;
    targetDocumentName?: string;
    title?: string;
    query?: string;
    fileId?: string;
    fileName?: string;
  };
  newDocumentDraft?: AgentNewDocumentDraft;
}

const effectBaseProperties = {
  capability: { type: schemaType.STRING },
  changeSetTitle: { type: schemaType.STRING },
  createDocumentAfter: { type: schemaType.BOOLEAN },
  createDocumentKind: { type: schemaType.STRING },
  deliveryMode: { type: schemaType.STRING },
  fileId: { type: schemaType.STRING },
  fileName: { type: schemaType.STRING },
  objective: { type: schemaType.STRING },
  prompt: { type: schemaType.STRING },
  query: { type: schemaType.STRING },
  summary: { type: schemaType.STRING },
  targetFileId: { type: schemaType.STRING },
  targetDocumentId: { type: schemaType.STRING },
  targetDocumentName: { type: schemaType.STRING },
  title: { type: schemaType.STRING },
  type: { type: schemaType.STRING },
};

export const agentTurnResponseSchema = {
  properties: {
    assistantText: { type: schemaType.STRING },
    currentDocumentDraft: {
      properties: {
        edits: {
          items: {
            properties: {
              kind: { type: schemaType.STRING },
              markdownBody: { type: schemaType.STRING },
              newHeading: {
                properties: {
                  level: { type: schemaType.INTEGER },
                  title: { type: schemaType.STRING },
                },
                type: schemaType.OBJECT,
              },
              rationale: { type: schemaType.STRING },
              targetHeadingNodeId: { type: schemaType.STRING },
              targetHeadingTitle: { type: schemaType.STRING },
            },
            required: ["kind", "markdownBody", "rationale"],
            type: schemaType.OBJECT,
          },
          type: schemaType.ARRAY,
        },
        kind: { type: schemaType.STRING },
      },
      type: schemaType.OBJECT,
    },
    effect: {
      properties: effectBaseProperties,
      required: ["type"],
      type: schemaType.OBJECT,
    },
    newDocumentDraft: {
      properties: {
        kind: { type: schemaType.STRING },
        markdown: { type: schemaType.STRING },
        rationale: { type: schemaType.STRING },
        title: { type: schemaType.STRING },
      },
      type: schemaType.OBJECT,
    },
  },
  required: ["assistantText", "effect"],
  type: schemaType.OBJECT,
};

const createAssistantMessage = (text: string): AgentChatMessage => ({
  createdAt: Date.now(),
  id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  role: "assistant",
  text: text.trim() || "I do not have a useful answer yet.",
});

const appendActionHint = (text: string, effect: AgentEffect) => {
  const trimmed = text.trim();

  if (effect.type === "draft_new_document") {
    const hint = "A draft preview is ready. Click Create Draft to add it as a new document.";
    return trimmed.includes(hint) ? trimmed : `${trimmed}\n\n${hint}`.trim();
  }

  if (effect.type === "ready_to_import_drive_file") {
    const hint = `Click Import to bring "${effect.fileName}" into the workspace.`;
    return trimmed.includes(hint) ? trimmed : `${trimmed}\n\n${hint}`.trim();
  }

  if (effect.type === "delegate_ai_capability" && effect.capability === "summarize_document" && effect.createDocumentAfter) {
    const hint = effect.createDocumentKind === "handover"
      ? "Review the summary card and create the handover document when ready."
      : "Review the summary card and create the summary document when ready.";
    return trimmed.includes(hint) ? trimmed : `${trimmed}\n\n${hint}`.trim();
  }

  return trimmed;
};

const normalizeEffect = (
  availableImportTargets: Array<Pick<AgentDriveCandidate, "fileId" | "fileName">>,
  effect: RawAgentTurnResponse["effect"],
  driveCandidates: AgentDriveCandidate[],
): AgentEffect => {
  switch (effect?.type) {
    case "draft_current_document":
      return {
        changeSetTitle: effect.changeSetTitle?.trim() || "Live agent patch set",
        deliveryMode: effect.deliveryMode === "direct_apply" ? "direct_apply" : "review_first",
        summary: effect.summary?.trim() || "Review the suggested document updates.",
        type: "draft_current_document",
      };
    case "draft_new_document":
      return {
        summary: effect.summary?.trim() || "Review the generated draft before creating it.",
        title: effect.title?.trim() || "Generated draft",
        type: "draft_new_document",
      };
    case "show_drive_candidates":
      return {
        query: effect.query?.trim() || "google drive document search",
        type: "show_drive_candidates",
      };
    case "ready_to_import_drive_file": {
      const matchingCandidate = availableImportTargets.find((candidate) => candidate.fileId === effect.fileId);

      if (!matchingCandidate) {
        return driveCandidates.length > 0
          ? {
            query: "google drive document search",
            type: "show_drive_candidates",
          }
          : { type: "reply_only" };
      }

      return {
        fileId: matchingCandidate.fileId,
        fileName: matchingCandidate.fileName,
        type: "ready_to_import_drive_file",
      };
    }
    case "open_google_connect":
      return { type: "open_google_connect" };
    case "delegate_ai_capability":
      return {
        capability: effect.capability || "summarize_document",
        createDocumentAfter: effect.createDocumentAfter,
        createDocumentKind: effect.createDocumentKind === "handover" || effect.createDocumentKind === "summary"
          ? effect.createDocumentKind
          : undefined,
        objective: effect.objective?.trim() || undefined,
        prompt: effect.prompt?.trim() || undefined,
        targetFileId: effect.targetFileId?.trim() || undefined,
        targetDocumentId: effect.targetDocumentId?.trim() || undefined,
        targetDocumentName: effect.targetDocumentName?.trim() || undefined,
        type: "delegate_ai_capability",
      };
    case "ask_followup":
      return { type: "ask_followup" };
    default:
      return { type: "reply_only" };
  }
};

const normalizeCurrentDocumentDraft = (
  draft: AgentCurrentDocumentDraft | undefined,
) => {
  if (!draft || draft.kind !== "current_document" || !Array.isArray(draft.edits) || draft.edits.length === 0) {
    return undefined;
  }

  const edits = draft.edits
    .map((edit) => {
      if (
        edit.kind !== "replace_document_body"
        && edit.kind !== "replace_section"
        && edit.kind !== "insert_after_section"
        && edit.kind !== "append_section"
      ) {
        return null;
      }

      if (!edit.markdownBody?.trim() || !edit.rationale?.trim()) {
        return null;
      }

      if (edit.kind === "replace_document_body") {
        return {
          ...edit,
          markdownBody: edit.markdownBody.trim(),
          rationale: edit.rationale.trim(),
        };
      }

      if (
        (edit.kind === "replace_section" || edit.kind === "insert_after_section")
        && !edit.targetHeadingNodeId?.trim()
      ) {
        return null;
      }

      if (
        (edit.kind === "insert_after_section" || edit.kind === "append_section")
        && (!edit.newHeading?.title?.trim() || ![1, 2, 3].includes(edit.newHeading.level))
      ) {
        return null;
      }

      if (
        edit.kind === "replace_section"
        && edit.newHeading
        && (!edit.newHeading.title?.trim() || ![1, 2, 3].includes(edit.newHeading.level))
      ) {
        return null;
      }

      if (edit.kind === "append_section") {
        return {
          ...edit,
          markdownBody: edit.markdownBody.trim(),
          rationale: edit.rationale.trim(),
        };
      }

      return {
        ...edit,
        markdownBody: edit.markdownBody.trim(),
        rationale: edit.rationale.trim(),
        targetHeadingNodeId: edit.targetHeadingNodeId.trim(),
        targetHeadingTitle: edit.targetHeadingTitle?.trim(),
      };
    })
    .filter((edit): edit is NonNullable<typeof edit> => Boolean(edit));

  return edits.length > 0
    ? {
      edits,
      kind: "current_document" as const,
    }
    : undefined;
};

const normalizeNewDocumentDraft = (draft: AgentNewDocumentDraft | undefined) => {
  if (!draft || draft.kind !== "new_document") {
    return undefined;
  }

  if (!draft.title?.trim() || !draft.markdown?.trim()) {
    return undefined;
  }

  return {
    ...draft,
    markdown: draft.markdown.trim(),
    rationale: draft.rationale?.trim() || "Generated from the live agent conversation.",
    title: draft.title.trim(),
  };
};

export const normalizeAgentTurnResponse = ({
  availableImportTargets,
  driveCandidates,
  response,
}: {
  availableImportTargets: Array<Pick<AgentDriveCandidate, "fileId" | "fileName">>;
  driveCandidates: AgentDriveCandidate[];
  response: RawAgentTurnResponse;
}): AgentTurnResponse => {
  const normalizedCurrentDraft = normalizeCurrentDocumentDraft(response.currentDocumentDraft);
  const normalizedNewDraft = normalizeNewDocumentDraft(response.newDocumentDraft);
  let effect = normalizeEffect(availableImportTargets, response.effect, driveCandidates);

  if (effect.type === "draft_current_document" && !normalizedCurrentDraft) {
    effect = { type: "reply_only" };
  }

  if (effect.type === "draft_new_document" && !normalizedNewDraft) {
    effect = { type: "reply_only" };
  }

  return {
    agentStatus: response.agentStatus,
    assistantMessage: createAssistantMessage(appendActionHint(response.assistantText || "", effect)),
    currentDocumentDraft: effect.type === "draft_current_document" ? normalizedCurrentDraft : undefined,
    driveCandidates: effect.type === "show_drive_candidates" ? driveCandidates : undefined,
    effect,
    newDocumentDraft: effect.type === "draft_new_document" ? normalizedNewDraft : undefined,
  };
};
