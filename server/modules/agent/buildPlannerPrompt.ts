import type { AgentTurnRequest } from "../../../src/types/liveAgent";
import type { Locale } from "../../../src/i18n/types";
import type { ActiveDocumentRetrievalContext } from "./buildActiveDocumentRetrievalContext";
import type { AgentPlannerResponse } from "./plannerResponse";

const localePromptSuffix = (locale: Locale) => (locale === "ko" ? "Respond in Korean." : "Respond in English.");

const summarizeActiveDocument = (request: AgentTurnRequest) => {
  if (!request.activeDocument) {
    return null;
  }

  return {
    documentId: request.activeDocument.documentId,
    existingHeadings: request.activeDocument.existingHeadings,
    fileName: request.activeDocument.fileName,
    mode: request.activeDocument.mode,
  };
};

const summarizeLocalReferences = (request: AgentTurnRequest) =>
  request.localReferences.map((reference) => ({
    documentId: reference.documentId,
    existingHeadings: reference.existingHeadings,
    fileName: reference.fileName,
  }));

const summarizeDriveReferences = (
  driveReferences: Array<{
    excerpt: string;
    fileId: string;
    fileName: string;
  }>,
) => driveReferences.map((reference) => ({
  excerpt: reference.excerpt,
  fileId: reference.fileId,
  fileName: reference.fileName,
}));

const summarizeAvailableTargetDocuments = (request: AgentTurnRequest) =>
  request.availableTargetDocuments.map((document) => ({
    documentId: document.documentId,
    fileName: document.fileName,
    mode: document.mode,
  }));

const summarizeRetrievalContext = (retrievalContext: ActiveDocumentRetrievalContext | null) => {
  if (!retrievalContext) {
    return null;
  }

  return {
    activeDocumentGraphSummary: {
      edgeCount: retrievalContext.activeDocumentGraph.edges.length,
      nodeCount: retrievalContext.activeDocumentGraph.nodes.length,
    },
    documentSummary: retrievalContext.documentSummary,
    headingLookup: retrievalContext.headingLookup,
    topFieldTargets: retrievalContext.topFieldTargets.map((candidate) => ({
      fieldKey: candidate.fieldKey,
      fieldLabel: candidate.fieldLabel,
      graphNodeId: candidate.graphNodeId,
      graphScore: candidate.graphScore,
      headingNodeId: candidate.headingNodeId || null,
      headingTitle: candidate.headingTitle || null,
      kind: candidate.kind,
      lineIndex: candidate.lineIndex,
      lineText: candidate.lineText,
      matchedTerms: candidate.matchedTerms,
      retrievalScore: candidate.retrievalScore,
      score: candidate.score,
      sectionId: candidate.sectionId || null,
    })),
    topSectionTargets: retrievalContext.topSectionTargets.map((target) => ({
      graphNodeId: target.graphNodeId,
      graphScore: target.graphScore,
      headingNodeId: target.headingNodeId,
      headingTitle: target.headingTitle,
      level: target.level,
      matchedTerms: target.matchedTerms,
      retrievalScore: target.retrievalScore,
      score: target.score,
      sectionId: target.sectionId || null,
    })),
    workspaceGraphHints: retrievalContext.workspaceGraphHints,
  };
};

export const buildPlannerPrompt = ({
  driveReferences,
  retrievalContext,
  request,
  workspaceConnected,
}: {
  driveReferences: Array<{
    excerpt: string;
    fileId: string;
    fileName: string;
  }>;
  retrievalContext: ActiveDocumentRetrievalContext | null;
  request: AgentTurnRequest;
  workspaceConnected: boolean;
}) => `
You are the planner for Docsy Live Agent.
Return strict JSON matching the provided schema.
${localePromptSuffix(request.locale === "ko" ? "ko" : "en")}

Choose exactly one action from this catalog:
- update_current_document
- create_new_document
- search_drive_documents
- prepare_drive_import
- general_reply
- ask_followup
- summarize_document
- generate_section
- generate_toc
- compare_documents
- extract_procedure
- suggest_document_updates

Rules:
- You are deciding the next action only, not executing it.
- Prefer update_current_document when the user wants the current active document revised.
- Prefer create_new_document only when the user explicitly asks for a new draft, template, or fresh document.
- Prefer summarize_document when the user asks for a summary, recap, synopsis, executive summary, or summary document for the active document.
- Prefer generate_section when the user asks to add a new section to the active document instead of revising an existing section in place.
- Prefer search_drive_documents or prepare_drive_import only for explicit Google Drive or Google Docs requests.
- Do not infer Google Drive intent from generic words like "document", "content", or "apply".
- If the request is ambiguous or missing essential data, choose ask_followup and fill missingInformation.
- Use general_reply only for conversational questions that do not require a draft or Google action.
- You may choose summarize_document, generate_section, generate_toc, compare_documents, extract_procedure, or suggest_document_updates when the user explicitly asks for those capabilities.
- Keep reason concise and factual.
- Confidence must be between 0 and 1.
- arguments.createDocumentAfter should be true only when the user explicitly asks for a separate summary document after summarizing.
- arguments.query should hold the best search query for drive actions when available.
- arguments.prompt should hold the best generation instruction for summarize_document or generate_section when available.
- arguments.fieldKeys should list the most relevant field labels when the request is about field/value updates.
- arguments.graphNodeIds may list the selected graph nodes that explain the target.
- arguments.targetType should be one of section, field, or document when a target is known.
- target.documentId must match the active document id when you refer to the current document.
- target.documentId may be set to one of the available target documents for compare_documents or suggest_document_updates.
- target.sectionId should be set when one section is the clear target.
- target.headingNodeId should be set when one exact heading node is the clear target.
- target.fileId may only be used when a selected Drive reference already gives you that exact file id.
- Use top section targets, top field targets, and workspace graph hints as the primary evidence for deciding where the user wants to edit.
- If retrieval matches are empty for a current-document edit, choose ask_followup unless the request clearly asks for a brand-new document.
- When compare_documents or suggest_document_updates is clearly requested but the target document is not clear, still choose that action and leave target.documentId empty instead of falling back to ask_followup. The client can present a target picker.

Execution note:
- Only these actions are currently executable right away: update_current_document, create_new_document, search_drive_documents, prepare_drive_import, general_reply, ask_followup.
- summarize_document, generate_section, generate_toc, compare_documents, extract_procedure, and suggest_document_updates are delegated to the client runtime after planning.

Workspace connection:
${JSON.stringify({ connected: workspaceConnected }, null, 2)}

Current active document:
${JSON.stringify(summarizeActiveDocument(request), null, 2)}

Active document retrieval context:
${JSON.stringify(summarizeRetrievalContext(retrievalContext), null, 2)}

Selected local references:
${JSON.stringify(summarizeLocalReferences(request), null, 2)}

Available target documents:
${JSON.stringify(summarizeAvailableTargetDocuments(request), null, 2)}

Selected Drive references:
${JSON.stringify(summarizeDriveReferences(driveReferences), null, 2)}

Recent conversation:
${JSON.stringify(request.messages, null, 2)}
`.trim();

export const plannerNeedsFollowup = (
  planner: AgentPlannerResponse,
  minimumConfidence: number,
) => planner.action === "ask_followup"
  || planner.confidence < minimumConfidence
  || (
    planner.missingInformation.length > 0
    && planner.action !== "compare_documents"
    && planner.action !== "suggest_document_updates"
  );
