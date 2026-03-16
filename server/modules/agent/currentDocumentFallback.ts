import type { Locale } from "../../../src/i18n/types";
import type { AgentTurnRequest } from "../../../src/types/liveAgent";
import type { RawAgentTurnResponse } from "./turnResponse";

const normalizeFieldKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();

const KOREAN_ASSIGNMENT_PATTERN = /([^\s,.\n:]+?)\s*(?:\uC740|\uB294|\uC774|\uAC00)\s*([^,.\n]+?)(?=(?:,|\.|\n|\uADF8\uB9AC\uACE0|\uBC0F|$))/gu;
const ENGLISH_ASSIGNMENT_PATTERN = /([a-z][a-z0-9 _/-]{0,40}?)\s*(?:is|=|:)\s*([^,.\n]+?)(?=(?:,|\.|\n|and|$))/giu;
const FIELD_LINE_PATTERN = /^(\s*[^:：\-\n]+?)\s*(?::|：|-|\uC740|\uB294|\uC774|\uAC00)\s*(.*?)\s*$/u;

const buildLocalizedText = ({
  en,
  ko,
  locale,
}: {
  en: string;
  ko: string;
  locale?: Locale;
}) => (locale === "ko" ? ko : en);

const parseAssignments = (text: string) => {
  const assignments = new Map<string, { label: string; value: string }>();
  const patterns = [KOREAN_ASSIGNMENT_PATTERN, ENGLISH_ASSIGNMENT_PATTERN];

  patterns.forEach((pattern) => {
    for (const match of text.matchAll(pattern)) {
      const label = match[1]?.trim();
      const value = match[2]?.trim();

      if (!label || !value) {
        continue;
      }

      assignments.set(normalizeFieldKey(label), { label, value });
    }
  });

  return assignments;
};

const replaceMarkdownFieldValues = (
  markdown: string,
  assignments: Map<string, { label: string; value: string }>,
) => {
  const lines = markdown.split(/\r?\n/);
  let replaced = false;
  const nextLines = lines.map((line) => {
    const fieldMatch = line.match(FIELD_LINE_PATTERN);

    if (!fieldMatch) {
      return line;
    }

    const label = fieldMatch[1]?.trim();

    if (!label) {
      return line;
    }

    const assignment = assignments.get(normalizeFieldKey(label));

    if (!assignment) {
      return line;
    }

    replaced = true;
    return `${label}: ${assignment.value}`;
  });

  return replaced ? nextLines.join("\n") : null;
};

export const buildDeterministicCurrentDocumentDraftResponse = ({
  latestUserMessage,
  locale,
  request,
}: {
  latestUserMessage: string;
  locale?: Locale;
  request: AgentTurnRequest;
}): RawAgentTurnResponse | null => {
  if (!request.activeDocument || request.activeDocument.existingHeadings.length > 0) {
    return null;
  }

  const assignments = parseAssignments(latestUserMessage);

  if (assignments.size === 0) {
    return null;
  }

  const updatedMarkdown = replaceMarkdownFieldValues(request.activeDocument.markdown, assignments);

  if (!updatedMarkdown || updatedMarkdown.trim() === request.activeDocument.markdown.trim()) {
    return null;
  }

  return {
    assistantText: buildLocalizedText({
      en: "I prepared a reviewable document update draft.",
      ko: "\uBB38\uC11C \uB0B4\uC6A9\uC744 \uC5C5\uB370\uC774\uD2B8\uD558\uB294 \uAC80\uD1A0\uC6A9 \uBCC0\uACBD\uC548\uC744 \uC900\uBE44\uD588\uC2B5\uB2C8\uB2E4.",
      locale,
    }),
    currentDocumentDraft: {
      edits: [{
        kind: "replace_document_body",
        markdownBody: updatedMarkdown,
        rationale: buildLocalizedText({
          en: "Apply the requested field values to the current document.",
          ko: "\uC694\uCCAD\uD55C \uD544\uB4DC \uAC12\uC744 \uD604\uC7AC \uBB38\uC11C\uC5D0 \uBC18\uC601\uD569\uB2C8\uB2E4.",
          locale,
        }),
      }],
      kind: "current_document",
    },
    effect: {
      changeSetTitle: buildLocalizedText({
        en: "Update current document",
        ko: "\uD604\uC7AC \uBB38\uC11C \uC5C5\uB370\uC774\uD2B8",
        locale,
      }),
      deliveryMode: "direct_apply",
      summary: buildLocalizedText({
        en: "Review the field value changes.",
        ko: "\uD544\uB4DC \uAC12 \uBCC0\uACBD\uC744 \uAC80\uD1A0\uD558\uC138\uC694.",
        locale,
      }),
      type: "draft_current_document",
    },
  };
};
