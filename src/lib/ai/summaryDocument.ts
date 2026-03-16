import type { Locale } from "@/i18n/types";
import type { SummarizeDocumentResponse } from "@/types/aiAssistant";

export interface SummaryDocumentDraftInput {
  createdAt?: number;
  locale?: Locale;
  objective: string;
  sourceDocumentId: string;
  sourceDocumentName: string;
  summary: SummarizeDocumentResponse;
}

export interface SummaryDocumentDraft {
  markdown: string;
  title: string;
}

const buildLabels = (locale: Locale) => {
  if (locale === "ko") {
    return {
      generatedAt: "생성 시각",
      keyPoints: "핵심 포인트",
      objective: "요약 목표",
      section: "섹션",
      sourceAttributions: "출처 상세",
      sourceDocument: "원본 문서",
      summary: "요약",
      untitled: "요약",
    };
  }

  return {
    generatedAt: "Generated at",
    keyPoints: "Key points",
    objective: "Objective",
    section: "Section",
    sourceAttributions: "Source attributions",
    sourceDocument: "Source document",
    summary: "Summary",
    untitled: "Summary",
  };
};

const buildTitle = ({
  locale,
  sourceDocumentName,
}: {
  locale: Locale;
  sourceDocumentName: string;
}) => {
  const trimmedName = sourceDocumentName.trim();

  if (!trimmedName) {
    return buildLabels(locale).untitled;
  }

  return locale === "ko"
    ? `${trimmedName} 요약`
    : `${trimmedName} Summary`;
};

export const buildSummaryDocumentDraft = ({
  createdAt = Date.now(),
  locale = "en",
  objective,
  sourceDocumentId,
  sourceDocumentName,
  summary,
}: SummaryDocumentDraftInput): SummaryDocumentDraft => {
  const labels = buildLabels(locale);
  const title = buildTitle({ locale, sourceDocumentName });
  const objectiveText = objective.trim() || "-";
  const keyPoints = summary.bulletPoints.length > 0
    ? summary.bulletPoints.map((point) => `- ${point.trim()}`).join("\n")
    : "-";
  const attributions = summary.attributions.length > 0
    ? summary.attributions.map((attribution) => {
      const parts = [`- \`${attribution.ingestionId}\` / \`${attribution.chunkId}\``];

      if (attribution.sectionId?.trim()) {
        parts.push(`(${labels.section}: \`${attribution.sectionId.trim()}\`)`);
      }

      if (attribution.rationale?.trim()) {
        parts.push(`- ${attribution.rationale.trim()}`);
      }

      return parts.join(" ");
    }).join("\n")
    : "-";

  return {
    markdown: [
      `# ${title}`,
      "",
      `- ${labels.generatedAt}: ${new Date(createdAt).toISOString()}`,
      `- ${labels.sourceDocument}: ${sourceDocumentName.trim() || sourceDocumentId}`,
      `- ${labels.objective}: ${objectiveText}`,
      "",
      `## ${labels.summary}`,
      "",
      summary.summary.trim() || "-",
      "",
      `## ${labels.keyPoints}`,
      "",
      keyPoints,
      "",
      `## ${labels.sourceAttributions}`,
      "",
      attributions,
      "",
    ].join("\n"),
    title,
  };
};
