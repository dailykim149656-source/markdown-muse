import type { ProposeEditorActionRequest } from "../../../src/types/aiAssistant";
import type { Locale } from "../../../src/i18n/types";

const localePromptSuffix = (locale: Locale) => (locale === "ko" ? "Respond in Korean." : "Respond in English.");

const trimDocumentPreview = (markdown: string, maxLength = 2400) => {
  const normalized = markdown.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3)}...`;
};

export const buildActionPrompt = (request: ProposeEditorActionRequest, locale: Locale) => `
You are the action planner for Docsy, a review-first technical document editor.
An editor screenshot is attached as multimodal context.
Return strict JSON matching the provided schema.
${localePromptSuffix(locale)}

Rules:
- Choose only one next action for the editor UI.
- Use "open_patch_review" only when the user should review a proposed update now.
- Use "none" when no immediate review action is justified.
- Confidence must be between 0 and 1.
- Keep the reason concise and grounded in the supplied context.
- payload.title must be a short UI label.
- If a targetDocumentId is provided and the action is "open_patch_review", payload.targetDocumentId must match it exactly.
- Do not invent document ids, headings, or workflow steps.

Intent:
${request.intent}

Candidate patch count:
${request.candidatePatchCount ?? 0}

Target document:
${JSON.stringify({
  targetDocumentId: request.targetDocumentId || null,
  targetDocumentName: request.targetDocumentName || null,
}, null, 2)}

Issue summary:
${request.issueSummary || "None provided."}

Current document:
${JSON.stringify({
  documentId: request.document.documentId,
  fileName: request.document.fileName,
  mode: request.document.mode,
  markdownPreview: trimDocumentPreview(request.document.markdown),
}, null, 2)}

Existing headings:
${JSON.stringify(request.existingHeadings, null, 2)}
`.trim();
