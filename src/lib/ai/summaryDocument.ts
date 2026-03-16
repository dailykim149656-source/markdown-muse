import type { Locale } from "@/i18n/types";
import type { SummarizeDocumentResponse } from "@/types/aiAssistant";
import type { AgentCreateDocumentKind } from "@/types/liveAgent";

export interface SummaryDocumentDraftInput {
  createdAt?: number;
  documentKind?: AgentCreateDocumentKind;
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

interface SummaryLabels {
  generatedAt: string;
  keyPoints: string;
  objective: string;
  section: string;
  sourceAttributions: string;
  sourceDocument: string;
  summary: string;
  untitled: string;
}

interface HandoverLabels {
  context: string;
  currentArchitecture: string;
  generatedAt: string;
  nextMilestones: string;
  objective: string;
  openIssues: string;
  operationalNotes: string;
  placeholderArchitecture: string;
  placeholderMilestone: string;
  placeholderOpenIssues: string;
  section: string;
  sourceAttributions: string;
  sourceDocument: string;
  untitled: string;
}

const buildSummaryLabels = (locale: Locale): SummaryLabels => {
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

const buildHandoverLabels = (locale: Locale): HandoverLabels => {
  if (locale === "ko") {
    return {
      context: "Context",
      currentArchitecture: "Current Architecture",
      generatedAt: "생성 시각",
      nextMilestones: "Next Milestones",
      objective: "요약 목표",
      openIssues: "Open Issues",
      operationalNotes: "Operational Notes",
      placeholderArchitecture: "핵심 구조, 의존성, 환경 가정을 검토 후 보강하세요.",
      placeholderMilestone: "다음 마일스톤을 검토 후 추가하세요.",
      placeholderOpenIssues: "열린 이슈, 리스크, blocker를 검토 후 추가하세요.",
      section: "섹션",
      sourceAttributions: "출처 상세",
      sourceDocument: "원본 문서",
      untitled: "인수인계 노트",
    };
  }

  return {
    context: "Context",
    currentArchitecture: "Current Architecture",
    generatedAt: "Generated at",
    nextMilestones: "Next Milestones",
    objective: "Objective",
    openIssues: "Open Issues",
    operationalNotes: "Operational Notes",
    placeholderArchitecture: "Add core modules, dependencies, and environment assumptions after review.",
    placeholderMilestone: "Add the next milestone after review.",
    placeholderOpenIssues: "Add open issues, risks, or blockers after review.",
    section: "Section",
    sourceAttributions: "Source attributions",
    sourceDocument: "Source document",
    untitled: "Project Handover Notes",
  };
};

const buildSummaryTitle = ({
  locale,
  sourceDocumentName,
}: {
  locale: Locale;
  sourceDocumentName: string;
}) => {
  const trimmedName = sourceDocumentName.trim();

  if (!trimmedName) {
    return buildSummaryLabels(locale).untitled;
  }

  return locale === "ko"
    ? `${trimmedName} 요약`
    : `${trimmedName} Summary`;
};

const buildHandoverTitle = ({
  locale,
  sourceDocumentName,
}: {
  locale: Locale;
  sourceDocumentName: string;
}) => {
  const trimmedName = sourceDocumentName.trim();

  if (!trimmedName) {
    return buildHandoverLabels(locale).untitled;
  }

  return locale === "ko"
    ? `${trimmedName} 인수인계 노트`
    : `${trimmedName} Handover Notes`;
};

const buildAttributionsMarkdown = ({
  locale,
  summary,
}: {
  locale: Locale;
  summary: SummarizeDocumentResponse;
}) => {
  const labels = buildSummaryLabels(locale);

  if (summary.attributions.length === 0) {
    return "-";
  }

  return summary.attributions.map((attribution) => {
    const parts = [`- \`${attribution.ingestionId}\` / \`${attribution.chunkId}\``];

    if (attribution.sectionId?.trim()) {
      parts.push(`(${labels.section}: \`${attribution.sectionId.trim()}\`)`);
    }

    if (attribution.rationale?.trim()) {
      parts.push(`- ${attribution.rationale.trim()}`);
    }

    return parts.join(" ");
  }).join("\n");
};

const buildSummaryMarkdown = ({
  createdAt,
  locale,
  objective,
  sourceDocumentId,
  sourceDocumentName,
  summary,
}: Required<Omit<SummaryDocumentDraftInput, "documentKind">>) => {
  const labels = buildSummaryLabels(locale);
  const title = buildSummaryTitle({ locale, sourceDocumentName });
  const objectiveText = objective.trim() || "-";
  const keyPoints = summary.bulletPoints.length > 0
    ? summary.bulletPoints.map((point) => `- ${point.trim()}`).join("\n")
    : "-";
  const attributions = buildAttributionsMarkdown({ locale, summary });

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

const buildHandoverMarkdown = ({
  createdAt,
  locale,
  objective,
  sourceDocumentId,
  sourceDocumentName,
  summary,
}: Required<Omit<SummaryDocumentDraftInput, "documentKind">>) => {
  const labels = buildHandoverLabels(locale);
  const title = buildHandoverTitle({ locale, sourceDocumentName });
  const sourceName = sourceDocumentName.trim() || sourceDocumentId;
  const contextText = summary.summary.trim() || "-";
  const architectureLines = summary.bulletPoints.length > 0
    ? summary.bulletPoints.map((point) => `- ${point.trim()}`)
    : [`- ${labels.placeholderArchitecture}`];
  const attributions = buildAttributionsMarkdown({ locale, summary });

  return {
    markdown: [
      `# ${title}`,
      "",
      `## ${labels.context}`,
      "",
      contextText,
      "",
      `## ${labels.currentArchitecture}`,
      "",
      ...architectureLines,
      "",
      `## ${labels.openIssues}`,
      "",
      `- ${labels.placeholderOpenIssues}`,
      "",
      `## ${labels.nextMilestones}`,
      "",
      `1. ${labels.placeholderMilestone}`,
      `2. ${labels.placeholderMilestone}`,
      `3. ${labels.placeholderMilestone}`,
      "",
      `## ${labels.operationalNotes}`,
      "",
      `- ${labels.generatedAt}: ${new Date(createdAt).toISOString()}`,
      `- ${labels.sourceDocument}: ${sourceName}`,
      `- ${labels.objective}: ${objective.trim() || "-"}`,
      "",
      `### ${labels.sourceAttributions}`,
      "",
      attributions,
      "",
    ].join("\n"),
    title,
  };
};

export const buildSummaryDocumentDraft = ({
  createdAt = Date.now(),
  documentKind = "summary",
  locale = "en",
  objective,
  sourceDocumentId,
  sourceDocumentName,
  summary,
}: SummaryDocumentDraftInput): SummaryDocumentDraft => {
  const normalizedInput = {
    createdAt,
    locale,
    objective,
    sourceDocumentId,
    sourceDocumentName,
    summary,
  };

  if (documentKind === "handover") {
    return buildHandoverMarkdown(normalizedInput);
  }

  return buildSummaryMarkdown(normalizedInput);
};
