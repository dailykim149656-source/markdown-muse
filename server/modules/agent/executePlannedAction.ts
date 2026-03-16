import type { Locale } from "../../../src/i18n/types";
import type {
  AgentAvailableTargetDocument,
  AgentCreateDocumentKind,
  AgentDelegatedCapability,
  AgentDriveCandidate,
  AgentTurnRequest,
} from "../../../src/types/liveAgent";
import { generateMultimodalStructuredJson, generateStructuredJson, schemaType } from "../gemini/client";
import { searchDriveDocuments } from "../workspace/searchDriveDocuments";
import {
  buildCurrentDocumentDraftPrompt,
  buildNewDraftFallbackPrompt,
  findLatestSummaryRequestInConversation,
  hasHandoverDocumentRequestInConversation,
} from "./buildTurnPrompt";
import type {
  ActiveDocumentRetrievalContext,
  RetrievalSectionRange,
} from "./buildActiveDocumentRetrievalContext";
import { buildDeterministicCurrentDocumentDraftResponse } from "./currentDocumentFallback";
import {
  normalizeFieldKey,
  parseRequestedFieldAssignments,
  type DocumentFieldCandidate,
} from "./extractFieldCandidates";
import { buildAgentPreRouteHints } from "./preRouteAgentTurn";
import type {
  AgentExecutionContext,
  AgentExecutionResult,
  AgentPlannerResponse,
  AgentPlannedAction,
} from "./plannerResponse";
import { normalizeAgentTurnResponse, type RawAgentTurnResponse, agentTurnResponseSchema } from "./turnResponse";

const FIELD_LINE_UPDATE_PATTERN = /^(?<prefix>\s*(?:[-*]\s*(?:\[[ xX]\]\s*)?)?)(?<label>[^:：\-\n|]+?)\s*(?<separator>:|：|-|\uC740|\uB294|\uC774|\uAC00)\s*(?<value>.+?)\s*$/u;

const newDocumentDraftSchema = {
  properties: {
    markdown: { type: schemaType.STRING },
    rationale: { type: schemaType.STRING },
    title: { type: schemaType.STRING },
  },
  required: ["title", "markdown", "rationale"],
  type: schemaType.OBJECT,
};

const generalReplySchema = {
  properties: {
    assistantText: { type: schemaType.STRING },
  },
  required: ["assistantText"],
  type: schemaType.OBJECT,
};

const DELEGATED_AI_ACTIONS = new Set<AgentPlannedAction>([
  "summarize_document",
  "generate_section",
  "compare_documents",
  "extract_procedure",
  "generate_toc",
  "suggest_document_updates",
]);

const isDelegatedAiAction = (action: AgentPlannedAction): action is AgentDelegatedCapability =>
  DELEGATED_AI_ACTIONS.has(action);

const getRequestImages = (request: AgentTurnRequest) => {
  if (!request.screenshot?.dataBase64?.trim() || !request.screenshot.mimeType?.trim()) {
    return [];
  }

  return [{
    dataBase64: request.screenshot.dataBase64.trim(),
    mimeType: request.screenshot.mimeType.trim(),
  }];
};

const buildAssistantText = ({
  locale,
  en,
  ko,
}: {
  locale?: Locale;
  en: string;
  ko: string;
}) => (locale === "ko" ? ko : en);

const createAskFollowupResponse = ({
  locale,
  missingInformation,
  reason,
}: {
  locale?: Locale;
  missingInformation?: string[];
  reason?: string;
}): RawAgentTurnResponse => {
  const cleanedMissingInformation = (missingInformation || []).filter(Boolean);

  if (cleanedMissingInformation.length > 0) {
    return {
      assistantText: buildAssistantText({
        en: `I need a bit more detail before I can continue: ${cleanedMissingInformation.join(", ")}.`,
        ko: `\uACC4\uC18D \uC9C4\uD589\uD558\uB824\uBA74 \uB2E4\uC74C \uC815\uBCF4\uAC00 \uB354 \uD544\uC694\uD569\uB2C8\uB2E4: ${cleanedMissingInformation.join(", ")}.`,
        locale,
      }),
      effect: {
        type: "ask_followup",
      },
    };
  }

  return {
    assistantText: reason?.trim() || buildAssistantText({
      en: "I need a bit more detail before I can continue.",
      ko: "\uACC4\uC18D \uC9C4\uD589\uD558\uB824\uBA74 \uC870\uAE08 \uB354 \uAD6C\uCCB4\uC801\uC778 \uC815\uBCF4\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4.",
      locale,
    }),
    effect: {
      type: "ask_followup",
    },
  };
};

const createOpenGoogleConnectResponse = (locale?: Locale): RawAgentTurnResponse => ({
  assistantText: buildAssistantText({
    en: "Google Workspace access is required before I can search or import Google Docs. Open the connection dialog first.",
    ko: "Google Docs\uB97C \uAC80\uC0C9\uD558\uAC70\uB098 \uAC00\uC838\uC624\uB824\uBA74 \uBA3C\uC800 Google Workspace \uC5F0\uACB0\uC774 \uD544\uC694\uD569\uB2C8\uB2E4. \uC5F0\uACB0 \uCC3D\uC744 \uC5F4\uC5B4 \uC8FC\uC138\uC694.",
    locale,
  }),
  effect: {
    type: "open_google_connect",
  },
});

const createReplyOnlyResponse = ({
  locale,
  messageEn,
  messageKo,
}: {
  locale?: Locale;
  messageEn: string;
  messageKo: string;
}): RawAgentTurnResponse => ({
  assistantText: buildAssistantText({
    en: messageEn,
    ko: messageKo,
    locale,
  }),
  effect: {
    type: "reply_only",
  },
});

const SUMMARY_DOCUMENT_REQUEST_PATTERN = /(summary document|separate summary|document the summary|요약 문서|문서화|따로 문서|별도 문서)/i;

const resolveDelegatedTargetDocument = ({
  latestUserMessage,
  planner,
  request,
}: {
  latestUserMessage: string;
  planner: AgentPlannerResponse;
  request: AgentTurnRequest;
}): AgentAvailableTargetDocument | null => {
  const availableTargets = request.availableTargetDocuments || [];

  if (availableTargets.length === 0) {
    return null;
  }

  if (planner.target?.documentId) {
    return availableTargets.find((document) => document.documentId === planner.target?.documentId) || null;
  }

  const normalizedMessage = latestUserMessage.trim().toLowerCase();
  const exactNameMatches = availableTargets.filter((document) =>
    normalizedMessage.includes(document.fileName.trim().toLowerCase()),
  );

  if (exactNameMatches.length === 1) {
    return exactNameMatches[0];
  }

  if (planner.target?.documentName) {
    const normalizedTargetName = planner.target.documentName.trim().toLowerCase();
    const targetNameMatches = availableTargets.filter((document) =>
      document.fileName.trim().toLowerCase() === normalizedTargetName,
    );

    if (targetNameMatches.length === 1) {
      return targetNameMatches[0];
    }
  }

  return availableTargets.length === 1 ? availableTargets[0] : null;
};

const createDelegatedCapabilityResponse = ({
  capability,
  context,
  createDocumentAfter,
  createDocumentKind,
  objective,
  prompt,
  targetFileId,
  targetDocument,
  targetDocumentName,
}: {
  capability: AgentDelegatedCapability;
  context: AgentExecutionContext;
  createDocumentAfter?: boolean;
  createDocumentKind?: AgentCreateDocumentKind;
  objective?: string;
  prompt?: string;
  targetFileId?: string;
  targetDocument?: AgentAvailableTargetDocument | null;
  targetDocumentName?: string;
}): RawAgentTurnResponse => ({
  assistantText: (() => {
    if (capability === "compare_documents" && !targetDocument) {
      return buildAssistantText({
        en: "Choose a document to compare against.",
        ko: "비교할 문서를 선택해 주세요.",
        locale: context.request.locale,
      });
    }

    if (capability === "suggest_document_updates" && !targetDocument) {
      return buildAssistantText({
        en: "Choose a reference document to generate update suggestions.",
        ko: "업데이트 제안을 생성할 기준 문서를 선택해 주세요.",
        locale: context.request.locale,
      });
    }

    if (capability === "summarize_document") {
      return buildAssistantText({
        en: createDocumentAfter
          ? (
            createDocumentKind === "handover"
              ? "I prepared a summary request and a handover document can be created after review."
              : "I prepared a summary request and a summary document can be created after review."
          )
          : "I prepared a summary request for the current document.",
        ko: createDocumentAfter
          ? "현재 문서의 요약을 준비했습니다. 검토 후 요약 문서를 만들 수 있습니다."
          : "현재 문서 요약을 준비했습니다.",
        locale: context.request.locale,
      });
    }

    if (capability === "generate_section") {
      return buildAssistantText({
        en: "I prepared a section-generation request for the current document.",
        ko: "현재 문서에 대한 섹션 생성 요청을 준비했습니다.",
        locale: context.request.locale,
      });
    }

    if (capability === "generate_toc") {
      return buildAssistantText({
        en: "I prepared a TOC suggestion request for the current document.",
        ko: "현재 문서에 대한 목차 제안 요청을 준비했습니다.",
        locale: context.request.locale,
      });
    }

    if (capability === "extract_procedure") {
      return buildAssistantText({
        en: "I prepared a procedure extraction request for the current document.",
        ko: "현재 문서에 대한 절차 추출 요청을 준비했습니다.",
        locale: context.request.locale,
      });
    }

    return buildAssistantText({
      en: `I prepared a ${targetDocument ? `targeted ` : ""}${capability} request${targetDocument ? ` using "${targetDocument.fileName}"` : ""}.`,
      ko: `${targetDocument ? `"${targetDocument.fileName}" 문서를 기준으로 ` : ""}${capability} 요청을 준비했습니다.`,
      locale: context.request.locale,
    });
  })(),
  effect: {
    capability,
    createDocumentAfter,
    createDocumentKind,
    objective,
    prompt,
    targetFileId,
    targetDocumentId: targetDocument?.documentId,
    targetDocumentName: targetDocument?.fileName || targetDocumentName,
    type: "delegate_ai_capability",
  },
});

const createReadyToImportResponse = ({
  fileId,
  fileName,
  locale,
}: {
  fileId: string;
  fileName: string;
  locale?: Locale;
}): RawAgentTurnResponse => ({
  assistantText: buildAssistantText({
    en: `I found the Google Doc to import: "${fileName}".`,
    ko: `\uAC00\uC838\uC62C Google \uBB38\uC11C\uB97C \uCC3E\uC558\uC2B5\uB2C8\uB2E4: "${fileName}".`,
    locale,
  }),
  effect: {
    fileId,
    fileName,
    type: "ready_to_import_drive_file",
  },
});

const buildDraftNewDocumentResponse = ({
  generatedDraft,
  locale,
}: {
  generatedDraft: {
    markdown: string;
    rationale: string;
    title: string;
  };
  locale?: Locale;
}): RawAgentTurnResponse => ({
  assistantText: buildAssistantText({
    en: "A new draft is ready. Review the preview below and create it as a new document when ready.",
    ko: "\uC0C8 \uCD08\uC548\uC774 \uC900\uBE44\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uC544\uB798 \uBBF8\uB9AC\uBCF4\uAE30\uB97C \uD655\uC778\uD55C \uB4A4 \uC0C8 \uBB38\uC11C\uB85C \uCD94\uAC00\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.",
    locale,
  }),
  effect: {
    summary: generatedDraft.rationale,
    title: generatedDraft.title,
    type: "draft_new_document",
  },
  newDocumentDraft: {
    kind: "new_document",
    markdown: generatedDraft.markdown,
    rationale: generatedDraft.rationale,
    title: generatedDraft.title,
  },
});

const buildGeneralReplyPrompt = ({
  planner,
  request,
}: {
  planner: AgentPlannerResponse;
  request: AgentTurnRequest;
}) => `
You are the live conversational reply generator for Docsy.
Return strict JSON matching the provided schema.
${request.locale === "ko" ? "Respond in Korean." : "Respond in English."}

Rules:
- Reply directly to the user's latest message.
- Do not claim that a document was changed, imported, or created.
- Do not mention internal actions, schemas, or routing.
- Keep the answer concise and helpful.

Planner reason:
${planner.reason}

Conversation:
${JSON.stringify(request.messages, null, 2)}

Current active document:
${JSON.stringify(request.activeDocument ? {
  documentId: request.activeDocument.documentId,
  fileName: request.activeDocument.fileName,
  mode: request.activeDocument.mode,
} : null, null, 2)}
`.trim();

const buildAvailableImportTargets = ({
  driveCandidates,
  driveReferences,
}: {
  driveCandidates: AgentDriveCandidate[];
  driveReferences: AgentExecutionContext["driveReferences"];
}) => Array.from(new Map<string, { fileId: string; fileName: string }>([
  ...driveCandidates.map((candidate): [string, { fileId: string; fileName: string }] => [candidate.fileId, {
    fileId: candidate.fileId,
    fileName: candidate.fileName,
  }]),
  ...driveReferences.map((reference): [string, { fileId: string; fileName: string }] => [reference.fileId, {
    fileId: reference.fileId,
    fileName: reference.fileName,
  }]),
]).values());

const buildCurrentDocumentFollowupReason = ({
  failureReason,
  locale,
}: {
  failureReason?: "ambiguous_target" | "field_match_failed" | "no_retrieval_match" | "section_patch_failed";
  locale?: Locale;
}) => {
  switch (failureReason) {
    case "ambiguous_target":
      return buildAssistantText({
        en: "I found more than one possible edit target. Please point me to the section or field you want changed.",
        ko: "\uBC14\uAFC0 \uC218 \uC788\uB294 \uC704\uCE58\uAC00 \uC5EC\uB7EC \uAC1C\uB85C \uBCF4\uC785\uB2C8\uB2E4. \uBCC0\uACBD\uD560 \uC139\uC158 \uB610\uB294 \uD544\uB4DC\uB97C \uC9D1\uC5B4 \uC8FC\uC138\uC694.",
        locale,
      });
    case "field_match_failed":
      return buildAssistantText({
        en: "I understood the field update, but I could not map it to a stable place in the document. Please point me to the exact field or section.",
        ko: "\uD544\uB4DC \uBCC0\uACBD \uC758\uB3C4\uB294 \uD30C\uC545\uD588\uC9C0\uB9CC \uBB38\uC11C \uC548\uC758 \uC548\uC815\uC801\uC778 \uC704\uCE58\uB85C \uB9E4\uD551\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uD574\uB2F9 \uD544\uB4DC\uB098 \uC139\uC158\uC744 \uC815\uD655\uD788 \uC9D1\uC5B4 \uC8FC\uC138\uC694.",
        locale,
      });
    case "section_patch_failed":
      return buildAssistantText({
        en: "I found the likely section, but I could not produce a stable reviewable patch yet. Please describe the wording or target section more specifically.",
        ko: "\uAD00\uB828 \uC139\uC158\uC740 \uCC3E\uC558\uC9C0\uB9CC \uC548\uC815\uC801\uC778 \uAC80\uD1A0\uC6A9 patch\uB97C \uC544\uC9C1 \uB9CC\uB4E4\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uBC14\uAFB8\uB824\uB294 \uBB38\uAD6C\uB098 \uB300\uC0C1 \uC139\uC158\uC744 \uB354 \uAD6C\uCCB4\uC801\uC73C\uB85C \uC54C\uB824 \uC8FC\uC138\uC694.",
        locale,
      });
    case "no_retrieval_match":
    default:
      return buildAssistantText({
        en: "I could not confidently identify where in the document this change should be applied. Please point me to the section or field you want changed.",
        ko: "\uC774 \uBCC0\uACBD\uC744 \uBB38\uC11C \uC5B4\uB514\uC5D0 \uC801\uC6A9\uD574\uC57C \uD560\uC9C0 \uC790\uC2E0 \uC788\uAC8C \uD310\uB2E8\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uBC14\uAFC0 \uC139\uC158 \uB610\uB294 \uD544\uB4DC\uB97C \uC9D1\uC5B4 \uC8FC\uC138\uC694.",
        locale,
      });
  }
};

const getRequestQuery = (planner: AgentPlannerResponse, latestUserMessage: string) =>
  planner.arguments?.query || latestUserMessage;

const resolveTargetSectionRange = ({
  planner,
  retrievalContext,
}: {
  planner: AgentPlannerResponse;
  retrievalContext: ActiveDocumentRetrievalContext | null;
}) => {
  if (!retrievalContext) {
    return null;
  }

  if (planner.target?.headingNodeId) {
    return retrievalContext.sectionRanges.find((range) => range.headingNodeId === planner.target?.headingNodeId) || null;
  }

  if (planner.target?.sectionId) {
    return retrievalContext.sectionRanges.find((range) => range.sectionId === planner.target?.sectionId) || null;
  }

  const topTarget = retrievalContext.topSectionTargets.find((target) => target.headingNodeId);

  if (!topTarget?.headingNodeId) {
    return null;
  }

  return retrievalContext.sectionRanges.find((range) => range.headingNodeId === topTarget.headingNodeId) || null;
};

const matchPlannerFieldCandidates = ({
  planner,
  retrievalContext,
}: {
  planner: AgentPlannerResponse;
  retrievalContext: ActiveDocumentRetrievalContext | null;
}) => {
  if (!retrievalContext) {
    return [];
  }

  const normalizedFieldKeys = planner.arguments?.fieldKeys?.length
    ? planner.arguments.fieldKeys.map(normalizeFieldKey)
    : retrievalContext.topFieldTargets.slice(0, 1).map((candidate) => candidate.fieldKey);

  if (normalizedFieldKeys.length === 0) {
    return [];
  }

  return retrievalContext.fieldCandidates.filter((candidate) => {
    if (!normalizedFieldKeys.includes(candidate.fieldKey)) {
      return false;
    }

    if (planner.target?.headingNodeId && candidate.headingNodeId !== planner.target.headingNodeId) {
      return false;
    }

    if (planner.target?.sectionId && candidate.sectionId !== planner.target.sectionId) {
      return false;
    }

    return true;
  });
};

const replaceKeyValueLine = ({
  assignmentValue,
  line,
}: {
  assignmentValue: string;
  line: string;
}) => {
  const lineMatch = line.match(FIELD_LINE_UPDATE_PATTERN);

  if (!lineMatch?.groups?.label) {
    return line;
  }

  const prefix = lineMatch.groups.prefix || "";
  const label = lineMatch.groups.label.trim();
  return `${prefix}${label}: ${assignmentValue}`;
};

const replaceTableCell = ({
  assignmentValue,
  candidate,
  line,
}: {
  assignmentValue: string;
  candidate: DocumentFieldCandidate;
  line: string;
}) => {
  const trimmed = line.trim();

  if (!trimmed.startsWith("|") || !trimmed.endsWith("|") || typeof candidate.tableColumnIndex !== "number") {
    return line;
  }

  const cells = trimmed
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());

  if (candidate.tableColumnIndex < 0 || candidate.tableColumnIndex >= cells.length) {
    return line;
  }

  cells[candidate.tableColumnIndex] = assignmentValue;
  return `| ${cells.join(" | ")} |`;
};

const buildSectionDraftFromUpdatedMarkdown = ({
  locale,
  range,
  updatedMarkdown,
}: {
  locale?: Locale;
  range: RetrievalSectionRange;
  updatedMarkdown: string;
}): RawAgentTurnResponse | null => {
  const lines = updatedMarkdown.split(/\r?\n/);
  const sectionBody = lines
    .slice(range.bodyStartLineIndex, range.endLineIndex + 1)
    .join("\n")
    .trim();

  if (!sectionBody) {
    return null;
  }

  return {
    assistantText: buildAssistantText({
      en: `I prepared a reviewable update for the "${range.headingTitle}" section.`,
      ko: `\"${range.headingTitle}\" \uC139\uC158\uC5D0 \uB300\uD55C \uAC80\uD1A0\uC6A9 \uBCC0\uACBD\uC548\uC744 \uC900\uBE44\uD588\uC2B5\uB2C8\uB2E4.`,
      locale,
    }),
    currentDocumentDraft: {
      edits: [{
        kind: "replace_section",
        markdownBody: sectionBody,
        rationale: buildAssistantText({
          en: `Apply the requested updates inside the "${range.headingTitle}" section.`,
          ko: `\"${range.headingTitle}\" \uC139\uC158 \uC548\uC5D0 \uC694\uCCAD\uD55C \uBCC0\uACBD\uC744 \uBC18\uC601\uD569\uB2C8\uB2E4.`,
          locale,
        }),
        targetHeadingNodeId: range.headingNodeId,
        targetHeadingTitle: range.headingTitle,
      }],
      kind: "current_document",
    },
    effect: {
      changeSetTitle: buildAssistantText({
        en: `Update section: ${range.headingTitle}`,
        ko: `\uC139\uC158 \uC5C5\uB370\uC774\uD2B8: ${range.headingTitle}`,
        locale,
      }),
      deliveryMode: "direct_apply",
      summary: buildAssistantText({
        en: `Review the requested field changes in "${range.headingTitle}".`,
        ko: `\"${range.headingTitle}\" \uC139\uC158\uC758 \uD544\uB4DC \uBCC0\uACBD\uC744 \uAC80\uD1A0\uD558\uC138\uC694.`,
        locale,
      }),
      type: "draft_current_document",
    },
  };
};

const applyFieldCandidateUpdates = ({
  context,
  planner,
}: {
  context: AgentExecutionContext;
  planner: AgentPlannerResponse;
}) => {
  const retrievalContext = context.retrievalContext;

  if (!context.request.activeDocument || !retrievalContext) {
    return { failureReason: "field_match_failed" as const };
  }

  const assignments = parseRequestedFieldAssignments(context.latestUserMessage);
  const candidates = matchPlannerFieldCandidates({
    planner,
    retrievalContext,
  });

  if (assignments.length === 0 || candidates.length === 0) {
    return { failureReason: "field_match_failed" as const };
  }

  const lines = context.request.activeDocument.markdown.split(/\r?\n/);
  const candidatesByFieldKey = new Map<string, DocumentFieldCandidate[]>();

  candidates.forEach((candidate) => {
    const current = candidatesByFieldKey.get(candidate.fieldKey) || [];
    current.push(candidate);
    candidatesByFieldKey.set(candidate.fieldKey, current);
  });

  const matchedCandidates: DocumentFieldCandidate[] = [];

  for (const assignment of assignments) {
    const matchingCandidates = candidatesByFieldKey.get(assignment.fieldKey) || [];

    if (matchingCandidates.length === 0) {
      continue;
    }

    if (matchingCandidates.length > 1) {
      return { failureReason: "ambiguous_target" as const };
    }

    const candidate = matchingCandidates[0];
    const originalLine = lines[candidate.lineIndex];

    lines[candidate.lineIndex] = candidate.kind === "table_cell"
      ? replaceTableCell({
        assignmentValue: assignment.value,
        candidate,
        line: originalLine,
      })
      : replaceKeyValueLine({
        assignmentValue: assignment.value,
        line: originalLine,
      });

    matchedCandidates.push(candidate);
  }

  if (matchedCandidates.length === 0) {
    return { failureReason: "field_match_failed" as const };
  }

  const updatedMarkdown = lines.join("\n");
  const affectedHeadingNodeIds = Array.from(new Set(
    matchedCandidates.map((candidate) => candidate.headingNodeId).filter((value): value is string => Boolean(value)),
  ));

  if (affectedHeadingNodeIds.length === 1) {
    const range = retrievalContext.sectionRanges.find((sectionRange) => sectionRange.headingNodeId === affectedHeadingNodeIds[0]);

    if (range) {
      const rawResponse = buildSectionDraftFromUpdatedMarkdown({
        locale: context.request.locale,
        range,
        updatedMarkdown,
      });

      if (rawResponse) {
        return { rawResponse };
      }
    }
  }

  if (affectedHeadingNodeIds.length === 0) {
    const headinglessFallback = buildDeterministicCurrentDocumentDraftResponse({
      latestUserMessage: context.latestUserMessage,
      locale: context.request.locale,
      request: {
        ...context.request,
        activeDocument: {
          ...context.request.activeDocument,
          markdown: updatedMarkdown,
        },
      },
    });

    if (headinglessFallback) {
      return { rawResponse: headinglessFallback };
    }
  }

  return {
    failureReason: affectedHeadingNodeIds.length > 1
      ? "ambiguous_target" as const
      : "field_match_failed" as const,
  };
};

const generateCurrentDocumentDraft = async ({
  context,
  planner,
}: {
  context: AgentExecutionContext;
  planner: AgentPlannerResponse;
}) => {
  const rawResponse = await generateMultimodalStructuredJson<RawAgentTurnResponse>({
    images: getRequestImages(context.request),
    prompt: buildCurrentDocumentDraftPrompt({
      latestUserMessage: context.latestUserMessage,
      planner,
      recentUserMessages: (context.request.messages || [])
        .filter((message) => message.role === "user")
        .map((message) => message.text)
        .slice(-6),
      retrievalContext: context.retrievalContext,
      request: context.request,
    }),
    responseSchema: agentTurnResponseSchema,
  });

  const normalized = normalizeAgentTurnResponse({
    availableImportTargets: [],
    driveCandidates: [],
    response: rawResponse,
  });

  if (normalized.effect.type === "draft_current_document") {
    return {
      deterministicFallbackUsed: false,
      rawResponse,
    };
  }

  return {
    deterministicFallbackUsed: false,
    failureReason: "section_patch_failed" as const,
  };
};

const executeCreateNewDocument = async (context: AgentExecutionContext): Promise<AgentExecutionResult> => {
  const generatedDraft = await generateMultimodalStructuredJson<{
    markdown: string;
    rationale: string;
    title: string;
  }>({
    images: getRequestImages(context.request),
    prompt: buildNewDraftFallbackPrompt({
      latestUserMessage: context.latestUserMessage,
      recentUserMessages: (context.request.messages || [])
        .filter((message) => message.role === "user")
        .map((message) => message.text)
        .slice(-6),
      request: context.request,
    }),
    responseSchema: newDocumentDraftSchema,
  });

  return {
    availableImportTargets: [],
    driveCandidates: [],
    rawResponse: buildDraftNewDocumentResponse({
      generatedDraft,
      locale: context.request.locale,
    }),
    telemetry: {
      executorAction: "create_new_document",
    },
  };
};

const executeUpdateCurrentDocument = async (
  context: AgentExecutionContext,
  planner: AgentPlannerResponse,
): Promise<AgentExecutionResult> => {
  if (!context.request.activeDocument) {
    return {
      availableImportTargets: [],
      driveCandidates: [],
      rawResponse: createAskFollowupResponse({
        locale: context.request.locale,
        reason: buildAssistantText({
          en: "There is no active document to update right now.",
          ko: "\uC9C0\uAE08\uC740 \uC218\uC815\uD560 \uD65C\uC131 \uBB38\uC11C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.",
          locale: context.request.locale,
        }),
      }),
      telemetry: {
        executorAction: "update_current_document",
        failureReason: "no_graph_target",
      },
    };
  }

  const fieldUpdateResult = applyFieldCandidateUpdates({
    context,
    planner,
  });

  if (fieldUpdateResult.rawResponse) {
    return {
      availableImportTargets: [],
      driveCandidates: [],
      rawResponse: fieldUpdateResult.rawResponse,
      telemetry: {
        deterministicFallbackUsed: false,
        executorAction: "update_current_document",
      },
    };
  }

  const targetSectionRange = resolveTargetSectionRange({
    planner,
    retrievalContext: context.retrievalContext,
  });

  if (targetSectionRange) {
    const sectionDraft = await generateCurrentDocumentDraft({
      context,
      planner: {
        ...planner,
        target: {
          ...planner.target,
          headingNodeId: targetSectionRange.headingNodeId,
          sectionId: targetSectionRange.sectionId,
        },
      },
    });

    if (sectionDraft.rawResponse) {
      return {
        availableImportTargets: [],
        driveCandidates: [],
        rawResponse: sectionDraft.rawResponse,
        telemetry: {
          deterministicFallbackUsed: sectionDraft.deterministicFallbackUsed,
          executorAction: "update_current_document",
        },
      };
    }

    return {
      availableImportTargets: [],
      driveCandidates: [],
      rawResponse: createAskFollowupResponse({
        locale: context.request.locale,
        reason: buildCurrentDocumentFollowupReason({
          failureReason: sectionDraft.failureReason,
          locale: context.request.locale,
        }),
      }),
      telemetry: {
        deterministicFallbackUsed: false,
        executorAction: "update_current_document",
        failureReason: sectionDraft.failureReason || "section_patch_failed",
      },
    };
  }

  const deterministicFallback = buildDeterministicCurrentDocumentDraftResponse({
    latestUserMessage: context.latestUserMessage,
    locale: context.request.locale,
    request: context.request,
  });

  if (deterministicFallback) {
    return {
      availableImportTargets: [],
      driveCandidates: [],
      rawResponse: deterministicFallback,
      telemetry: {
        deterministicFallbackUsed: true,
        executorAction: "update_current_document",
      },
    };
  }

  if (context.request.activeDocument) {
    try {
      const fullDocumentDraft = await generateCurrentDocumentDraft({
        context,
        planner: {
          ...planner,
          target: {
            ...planner.target,
            headingNodeId: undefined,
            sectionId: undefined,
          },
        },
      });

      if (fullDocumentDraft.rawResponse) {
        return {
          availableImportTargets: [],
          driveCandidates: [],
          rawResponse: fullDocumentDraft.rawResponse,
          telemetry: {
            deterministicFallbackUsed: false,
            executorAction: "update_current_document",
          },
        };
      }
    } catch {
      // AI fallback failed, continue to ask_followup
    }
  }

  return {
    availableImportTargets: [],
    driveCandidates: [],
    rawResponse: createAskFollowupResponse({
      locale: context.request.locale,
      reason: buildCurrentDocumentFollowupReason({
        failureReason: fieldUpdateResult.failureReason || "no_retrieval_match",
        locale: context.request.locale,
      }),
    }),
    telemetry: {
      deterministicFallbackUsed: false,
      executorAction: "update_current_document",
      failureReason: fieldUpdateResult.failureReason === "ambiguous_target"
        ? "ambiguous_graph_target"
        : context.retrievalContext
          ? "field_match_failed"
          : "knowledge_graph_unavailable",
    },
  };
};

const executeSearchDriveDocuments = async (context: AgentExecutionContext, planner: AgentPlannerResponse): Promise<AgentExecutionResult> => {
  if (!context.workspaceConnected) {
    return {
      availableImportTargets: buildAvailableImportTargets({
        driveCandidates: [],
        driveReferences: context.driveReferences,
      }),
      driveCandidates: [],
      rawResponse: createOpenGoogleConnectResponse(context.request.locale),
      telemetry: {
        driveAuthGateUsed: true,
        executorAction: "search_drive_documents",
      },
    };
  }

  const query = getRequestQuery(planner, context.latestUserMessage);
  const driveCandidates = await searchDriveDocuments({
    latestUserMessage: query,
    request: context.httpRequest,
  });

  if (driveCandidates.length === 0) {
    return {
      availableImportTargets: buildAvailableImportTargets({
        driveCandidates,
        driveReferences: context.driveReferences,
      }),
      driveCandidates,
      rawResponse: createReplyOnlyResponse({
        locale: context.request.locale,
        messageEn: "I could not find a strong Google Docs match for that request. Try a more specific title, topic, or workflow phrase.",
        messageKo: "\uC694\uCCAD\uACFC \uC798 \uB9DE\uB294 Google Docs \uBB38\uC11C\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uC81C\uBAA9\uC774\uB098 \uC8FC\uC81C\uB97C \uB354 \uAD6C\uCCB4\uC801\uC73C\uB85C \uC54C\uB824 \uC8FC\uC138\uC694.",
      }),
      telemetry: {
        executorAction: "search_drive_documents",
      },
    };
  }

  return {
    availableImportTargets: buildAvailableImportTargets({
      driveCandidates,
      driveReferences: context.driveReferences,
    }),
    driveCandidates,
    rawResponse: {
      assistantText: buildAssistantText({
        en: "I found matching Google Docs candidates.",
        ko: "\uAD00\uB828 Google Docs \uD6C4\uBCF4\uB97C \uCC3E\uC558\uC2B5\uB2C8\uB2E4.",
        locale: context.request.locale,
      }),
      effect: {
        query,
        type: "show_drive_candidates",
      },
    },
    telemetry: {
      executorAction: "search_drive_documents",
    },
  };
};

const executePrepareDriveImport = async (context: AgentExecutionContext, planner: AgentPlannerResponse): Promise<AgentExecutionResult> => {
  if (!context.workspaceConnected) {
    return {
      availableImportTargets: buildAvailableImportTargets({
        driveCandidates: [],
        driveReferences: context.driveReferences,
      }),
      driveCandidates: [],
      rawResponse: createOpenGoogleConnectResponse(context.request.locale),
      telemetry: {
        driveAuthGateUsed: true,
        executorAction: "prepare_drive_import",
      },
    };
  }

  const selectedReferenceMatch = planner.target?.fileId
    ? context.driveReferences.find((reference) => reference.fileId === planner.target?.fileId)
    : context.driveReferences.length === 1
      ? context.driveReferences[0]
      : undefined;

  if (selectedReferenceMatch) {
    return {
      availableImportTargets: buildAvailableImportTargets({
        driveCandidates: [],
        driveReferences: context.driveReferences,
      }),
      driveCandidates: [],
      rawResponse: createReadyToImportResponse({
        fileId: selectedReferenceMatch.fileId,
        fileName: selectedReferenceMatch.fileName,
        locale: context.request.locale,
      }),
      telemetry: {
        executorAction: "prepare_drive_import",
      },
    };
  }

  const query = getRequestQuery(planner, context.latestUserMessage);
  const driveCandidates = await searchDriveDocuments({
    latestUserMessage: query,
    request: context.httpRequest,
  });

  const exactMatch = driveCandidates.find((candidate) =>
    (planner.target?.fileId && candidate.fileId === planner.target.fileId)
    || (planner.target?.fileName && candidate.fileName.toLowerCase() === planner.target.fileName.toLowerCase()),
  );

  if (exactMatch || driveCandidates.length === 1) {
    const candidate = exactMatch || driveCandidates[0];

    return {
      availableImportTargets: buildAvailableImportTargets({
        driveCandidates,
        driveReferences: context.driveReferences,
      }),
      driveCandidates,
      rawResponse: createReadyToImportResponse({
        fileId: candidate.fileId,
        fileName: candidate.fileName,
        locale: context.request.locale,
      }),
      telemetry: {
        executorAction: "prepare_drive_import",
      },
    };
  }

  if (driveCandidates.length === 0) {
    return {
      availableImportTargets: [],
      driveCandidates: [],
      rawResponse: createAskFollowupResponse({
        locale: context.request.locale,
        reason: buildAssistantText({
          en: "I could not identify which Google Doc to import. Please name the document more specifically.",
          ko: "\uC5B4\uB5A4 Google Docs \uBB38\uC11C\uB97C \uAC00\uC838\uC624\uB824\uB294\uC9C0 \uD655\uC2E4\uD788 \uD310\uB2E8\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uBB38\uC11C \uC81C\uBAA9\uC744 \uB354 \uAD6C\uCCB4\uC801\uC73C\uB85C \uC54C\uB824 \uC8FC\uC138\uC694.",
          locale: context.request.locale,
        }),
      }),
      telemetry: {
        executorAction: "prepare_drive_import",
      },
    };
  }

  return {
    availableImportTargets: buildAvailableImportTargets({
      driveCandidates,
      driveReferences: context.driveReferences,
    }),
    driveCandidates,
    rawResponse: {
      assistantText: buildAssistantText({
        en: "I found several Google Docs candidates. Choose one to import.",
        ko: "\uAC00\uC838\uC62C \uC218 \uC788\uB294 Google Docs \uD6C4\uBCF4\uAC00 \uC5EC\uB7EC \uAC1C \uC788\uC2B5\uB2C8\uB2E4. \uD558\uB098\uB97C \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.",
        locale: context.request.locale,
      }),
      effect: {
        query,
        type: "show_drive_candidates",
      },
    },
    telemetry: {
      executorAction: "prepare_drive_import",
    },
  };
};

const executeGeneralReply = async (context: AgentExecutionContext, planner: AgentPlannerResponse): Promise<AgentExecutionResult> => {
  const response = await generateStructuredJson<{ assistantText: string }>({
    prompt: buildGeneralReplyPrompt({
      planner,
      request: context.request,
    }),
    responseSchema: generalReplySchema,
  });

  return {
    availableImportTargets: buildAvailableImportTargets({
      driveCandidates: [],
      driveReferences: context.driveReferences,
    }),
    driveCandidates: [],
    rawResponse: {
      assistantText: response.assistantText,
      effect: {
        type: "reply_only",
      },
    },
    telemetry: {
      executorAction: "general_reply",
    },
  };
};

const executeDelegatedAction = (
  context: AgentExecutionContext,
  planner: AgentPlannerResponse & { action: AgentDelegatedCapability },
): Promise<AgentExecutionResult> | AgentExecutionResult => {
  const preRouteHints = buildAgentPreRouteHints({
    driveReferences: context.driveReferences,
    latestUserMessage: context.latestUserMessage,
    request: context.request,
  });
  const delegatedTarget = planner.action === "compare_documents" || planner.action === "suggest_document_updates"
    ? (
      planner.target?.documentId
        ? (context.request.availableTargetDocuments || []).find((document) => document.documentId === planner.target?.documentId) || null
        : preRouteHints.localTarget
    )
    : null;
  const messages = context.request.messages || [];
  const latestSummaryObjective = findLatestSummaryRequestInConversation(messages);
  const objective = planner.action === "summarize_document"
    ? planner.arguments?.prompt?.trim() || latestSummaryObjective || context.latestUserMessage.trim()
    : planner.arguments?.prompt?.trim() || context.latestUserMessage.trim();
  const createDocumentKind = planner.action === "summarize_document"
    ? (hasHandoverDocumentRequestInConversation(messages) ? "handover" : "summary")
    : undefined;
  const createDocumentAfter = planner.action === "summarize_document"
    ? Boolean(planner.arguments?.createDocumentAfter)
      || SUMMARY_DOCUMENT_REQUEST_PATTERN.test(context.latestUserMessage)
      || createDocumentKind === "handover"
    : undefined;

  if (
    (planner.action === "compare_documents" || planner.action === "suggest_document_updates")
    && !delegatedTarget
  ) {
    if (preRouteHints.ambiguousLocalTargets.length > 0) {
      return {
        availableImportTargets: [],
        driveCandidates: [],
        rawResponse: createDelegatedCapabilityResponse({
          capability: planner.action,
          context,
          createDocumentKind,
          objective,
          prompt: objective,
          targetDocument: null,
        }),
        telemetry: {
          executorAction: planner.action,
        },
      };
    }

    const delegatedDriveReference = planner.target?.fileId
      ? context.driveReferences.find((reference) => reference.fileId === planner.target?.fileId) || null
      : preRouteHints.driveReferenceTarget;

    if (delegatedDriveReference) {
      return {
        availableImportTargets: [],
        driveCandidates: [],
        rawResponse: createDelegatedCapabilityResponse({
          capability: planner.action,
          context,
          createDocumentKind,
          objective,
          prompt: objective,
          targetDocument: null,
          targetFileId: delegatedDriveReference.fileId,
          targetDocumentName: delegatedDriveReference.fileName,
        }),
        telemetry: {
          executorAction: planner.action,
        },
      };
    }

    if (context.workspaceConnected) {
      return searchDriveDocuments({
        latestUserMessage: objective,
        request: context.httpRequest,
      }).then((driveCandidates) => {
        const driveHints = buildAgentPreRouteHints({
          driveReferences: driveCandidates,
          latestUserMessage: context.latestUserMessage,
          request: context.request,
        });

        if (driveHints.driveReferenceTarget) {
          return {
            availableImportTargets: [],
            driveCandidates,
            rawResponse: createDelegatedCapabilityResponse({
              capability: planner.action,
              context,
              createDocumentKind,
              objective,
              prompt: objective,
              targetDocument: null,
              targetFileId: driveHints.driveReferenceTarget.fileId,
              targetDocumentName: driveHints.driveReferenceTarget.fileName,
            }),
            telemetry: {
              executorAction: planner.action,
            },
          };
        }

        if (driveCandidates.length > 0) {
          return {
            availableImportTargets: buildAvailableImportTargets({
              driveCandidates,
              driveReferences: context.driveReferences,
            }),
            driveCandidates,
            rawResponse: {
              assistantText: buildAssistantText({
                en: "I found Drive candidates that may help with this request. Import one to continue.",
                ko: "\uC774 \uC694\uCCAD\uC5D0 \uC4F8 \uC218 \uC788\uB294 Drive \uD6C4\uBCF4\uB97C \uCC3E\uC558\uC2B5\uB2C8\uB2E4. \uD558\uB098\uB97C \uAC00\uC838\uC640 \uACC4\uC18D\uD558\uC138\uC694.",
                locale: context.request.locale,
              }),
              effect: {
                query: objective,
                type: "show_drive_candidates",
              },
            },
            telemetry: {
              executorAction: planner.action,
            },
          };
        }

        return {
          availableImportTargets: [],
          driveCandidates: [],
          rawResponse: createDelegatedCapabilityResponse({
            capability: planner.action,
            context,
            createDocumentKind,
            objective,
            prompt: objective,
            targetDocument: null,
          }),
          telemetry: {
            executorAction: planner.action,
          },
        };
      });
    }
  }

  return {
    availableImportTargets: [],
    driveCandidates: [],
    rawResponse: createDelegatedCapabilityResponse({
      capability: planner.action as AgentDelegatedCapability,
      context,
      createDocumentAfter,
      createDocumentKind,
      objective,
      prompt: objective,
      targetDocument: delegatedTarget,
    }),
    telemetry: {
      executorAction: planner.action,
    },
  };
};

export const executePlannedAction = async (
  context: AgentExecutionContext,
  planner: AgentPlannerResponse,
): Promise<AgentExecutionResult> => {
  if (isDelegatedAiAction(planner.action)) {
    return executeDelegatedAction(context, planner as AgentPlannerResponse & { action: AgentDelegatedCapability });
  }

  switch (planner.action) {
    case "update_current_document":
      return executeUpdateCurrentDocument(context, planner);
    case "create_new_document":
      return executeCreateNewDocument(context);
    case "search_drive_documents":
      return executeSearchDriveDocuments(context, planner);
    case "prepare_drive_import":
      return executePrepareDriveImport(context, planner);
    case "general_reply":
      return executeGeneralReply(context, planner);
    case "ask_followup":
    default:
      return {
        availableImportTargets: buildAvailableImportTargets({
          driveCandidates: [],
          driveReferences: context.driveReferences,
        }),
        driveCandidates: [],
        rawResponse: createAskFollowupResponse({
          locale: context.request.locale,
          missingInformation: planner.missingInformation,
          reason: planner.reason,
        }),
        telemetry: {
          executorAction: planner.action,
        },
      };
  }
};
