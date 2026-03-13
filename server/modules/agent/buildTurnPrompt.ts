import type {
  AgentDriveCandidate,
  AgentDocumentContext,
  AgentLocalReference,
  AgentSelectedDriveReference,
  AgentTurnRequest,
} from "../../../src/types/liveAgent";
import type { Locale } from "../../../src/i18n/types";

const localePromptSuffix = (locale: Locale) => (locale === "ko" ? "Respond in Korean." : "Respond in English.");

const ENGLISH_NEW_DRAFT_PATTERN = /\b(cover letter|new document|new draft|outline|resume|self-introduction|statement of purpose|template)\b/i;
const KOREAN_NEW_DRAFT_PATTERN = /(?:\uC790\uAE30\uC18C\uAC1C\uC11C|\uC774\uB825\uC11C|\uC591\uC2DD|\uD15C\uD50C\uB9BF|\uCD08\uC548|\uC0C8\s*\uBB38\uC11C|\uC0C8\s*\uCD08\uC548|\uB9CC\uB4E4\uC5B4\s*\uC918|\uC791\uC131(?:\uD574)?\s*\uC918|\uC0DD\uC131)/u;

const trimText = (value: string, maxLength = 1200) => {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3)}...`;
};

const normalizeIntentText = (value: string) =>
  value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const summarizeDocumentContext = (document: AgentDocumentContext | null) => {
  if (!document) {
    return null;
  }

  return {
    documentId: document.documentId,
    existingHeadings: document.existingHeadings,
    fileName: document.fileName,
    markdownPreview: trimText(document.markdown, 2200),
    mode: document.mode,
  };
};

const summarizeLocalReference = (reference: AgentLocalReference) => ({
  documentId: reference.documentId,
  existingHeadings: reference.existingHeadings,
  fileName: reference.fileName,
  markdownPreview: trimText(reference.markdown, 900),
});

const summarizeDriveReference = (
  reference: AgentSelectedDriveReference & {
    excerpt: string;
  },
) => ({
  excerpt: trimText(reference.excerpt, 360),
  fileId: reference.fileId,
  fileName: reference.fileName,
});

const summarizeDriveCandidate = (candidate: AgentDriveCandidate) => ({
  excerpt: trimText(candidate.excerpt, 280),
  fileId: candidate.fileId,
  fileName: candidate.fileName,
  modifiedTime: candidate.modifiedTime || null,
  relevanceReason: candidate.relevanceReason,
});

export const buildTurnPrompt = ({
  driveCandidates,
  driveReferences,
  latestUserMessage,
  request,
}: {
  driveCandidates: AgentDriveCandidate[];
  driveReferences: Array<AgentSelectedDriveReference & { excerpt: string }>;
  latestUserMessage: string;
  request: AgentTurnRequest;
}) => `
You are the live agent for Docsy, a review-first technical documentation editor.
Return strict JSON matching the provided schema.
${localePromptSuffix(request.locale === "ko" ? "ko" : "en")}

You are helping with two workflows:
1. conversationally revising the current active rich-text document
2. finding Google Docs and either using them as temporary references or preparing them for explicit import

Rules:
- The default target is the active document.
- Do not create a new document draft unless the user explicitly asks for a new draft, new document, fresh draft, or equivalent.
- Never claim that a document was imported or modified directly.
- Use "draft_current_document" only when you are returning structured section edits for the active document.
- Use "draft_new_document" only when the user explicitly asked for a new draft and you can provide a complete markdown draft.
- Use "show_drive_candidates" when Google Drive search results should be shown for user choice.
- Use "ready_to_import_drive_file" only when the user clearly asked to import one specific Google document and you can identify it by exact fileId from the provided candidates or selected references.
- Use "open_google_connect" only when Google Drive access is needed but unavailable.
- If more information is needed, use "ask_followup".
- If you only need to answer conversationally without a draft or Drive action, use "reply_only".

Current active document:
${JSON.stringify(summarizeDocumentContext(request.activeDocument), null, 2)}

Selected local references:
${JSON.stringify(request.localReferences.map(summarizeLocalReference), null, 2)}

Selected Drive references:
${JSON.stringify(driveReferences.map(summarizeDriveReference), null, 2)}

Current Drive search candidates:
${JSON.stringify(driveCandidates.map(summarizeDriveCandidate), null, 2)}

Allowed edit kinds for current-document drafts:
- replace_section
- insert_after_section
- append_section

Important current-document edit constraints:
- replace_section and insert_after_section must use an existing heading nodeId from the active document exactly as provided
- markdownBody must contain body content only, not a heading line
- append_section should be used when the change is best represented as a new final section
- Keep edits compact and high-signal

Recent conversation:
${JSON.stringify(request.messages, null, 2)}

Latest user message:
${latestUserMessage}
`.trim();

export const isExplicitNewDraftRequest = (latestUserMessage: string) => {
  const normalized = normalizeIntentText(latestUserMessage);
  return ENGLISH_NEW_DRAFT_PATTERN.test(normalized) || KOREAN_NEW_DRAFT_PATTERN.test(latestUserMessage);
};

export const hasExplicitNewDraftRequestInConversation = (messages: AgentTurnRequest["messages"]) =>
  messages.some((message) => message.role === "user" && isExplicitNewDraftRequest(message.text));

export const buildNewDraftFallbackPrompt = ({
  latestUserMessage,
  recentUserMessages,
  request,
}: {
  latestUserMessage: string;
  recentUserMessages: string[];
  request: AgentTurnRequest;
}) => `
You are generating a brand-new document draft for Docsy.
Return strict JSON matching the provided schema.
${localePromptSuffix(request.locale === "ko" ? "ko" : "en")}

Rules:
- The user explicitly wants a new document or template.
- Produce a complete markdown draft, not an explanation of what you would do.
- If the user asks for a template or form, include clear placeholder sections and field prompts.
- Keep the output practical and ready to create as a new document tab.
- Do not reference internal workflow or UI mechanics.
- title must be concise and user-facing.
- rationale must be one short sentence.

Active document context:
${JSON.stringify(summarizeDocumentContext(request.activeDocument), null, 2)}

Selected local references:
${JSON.stringify(request.localReferences.map(summarizeLocalReference), null, 2)}

Recent user requirements:
${JSON.stringify(recentUserMessages, null, 2)}

Latest user request:
${latestUserMessage}
`.trim();
