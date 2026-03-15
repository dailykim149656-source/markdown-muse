import { compareDocuments, type DocumentComparisonResult } from "@/lib/ai/compareDocuments";
import type { KnowledgeDocumentRecord } from "@/lib/knowledge/knowledgeIndex";
import type { KnowledgeHealthIssue } from "@/lib/knowledge/workspaceInsights";

export type KnowledgeConsistencyIssueKind = "missing_section" | "conflicting_procedure" | "changed_section";
export type KnowledgeConsistencyActionPriority = "high" | "medium" | "low";

export interface KnowledgeConsistencyIssue {
  actionPriority: KnowledgeConsistencyActionPriority;
  actionReason: string;
  causalChain: {
    issueKind: KnowledgeConsistencyIssueKind;
    sourceDocumentId: string;
    sourceDocumentName: string;
    targetDocumentId: string;
    targetDocumentName: string;
  };
  comparison: DocumentComparisonResult;
  documentId: string;
  id: string;
  kind: KnowledgeConsistencyIssueKind;
  message: string;
  relatedDocumentId: string;
  relatedDocumentName: string;
  severity: "info" | "warning";
}

const pluralize = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;
const PROCEDURE_SECTION_PATTERN = /\b(step|steps|procedure|procedures|process|workflow|deploy|deployment|setup|install|runbook|operation|operations)\b/i;
const actionPriorityOrder: Record<KnowledgeConsistencyActionPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const getIssuePriority = (
  kind: KnowledgeConsistencyIssueKind,
  comparison: DocumentComparisonResult,
  procedureConflictCount: number,
): KnowledgeConsistencyActionPriority => {
  if (kind === "missing_section") {
    return comparison.counts.removed >= 2 ? "high" : "medium";
  }

  if (kind === "conflicting_procedure") {
    return procedureConflictCount > 0 ? "high" : "medium";
  }

  return comparison.counts.changed + comparison.counts.added >= 3 ? "medium" : "low";
};

const getIssueActionReason = (
  kind: KnowledgeConsistencyIssueKind,
  comparison: DocumentComparisonResult,
  procedureConflictCount: number,
) => {
  switch (kind) {
    case "missing_section":
      return `Missing ${pluralize(comparison.counts.removed, "section")} can break completeness and review flow.`;
    case "conflicting_procedure":
      return procedureConflictCount > 0
        ? `Procedure-level conflicts were detected in operational sections and should be reviewed first.`
        : `Conflicting section guidance was detected and should be resolved before downstream updates.`;
    case "changed_section":
    default:
      return `Section divergence is detectable but lower risk than missing or conflicting guidance.`;
  }
};

export const buildKnowledgeConsistencyIssues = (
  activeRecord: KnowledgeDocumentRecord | null,
  candidateRecords: KnowledgeDocumentRecord[],
): KnowledgeConsistencyIssue[] => {
  if (!activeRecord) {
    return [];
  }

  const activeName = activeRecord.normalizedDocument.metadata.title || activeRecord.fileName;

  return candidateRecords
    .flatMap((candidateRecord) => {
      const candidateName = candidateRecord.normalizedDocument.metadata.title || candidateRecord.fileName;
      const comparison = compareDocuments(activeRecord.normalizedDocument, candidateRecord.normalizedDocument);
      const issues: KnowledgeConsistencyIssue[] = [];
      const procedureConflictCount = comparison.deltas.filter((delta) =>
        (delta.kind === "inconsistent" || (delta.kind === "changed" && delta.similarityScore < 0.6))
        && PROCEDURE_SECTION_PATTERN.test(delta.source?.title || delta.target?.title || ""),
      ).length;

      if (comparison.counts.removed > 0) {
        const kind: KnowledgeConsistencyIssueKind = "missing_section";
        issues.push({
          actionPriority: getIssuePriority(kind, comparison, procedureConflictCount),
          actionReason: getIssueActionReason(kind, comparison, procedureConflictCount),
          causalChain: {
            issueKind: kind,
            sourceDocumentId: activeRecord.documentId,
            sourceDocumentName: activeName,
            targetDocumentId: candidateRecord.documentId,
            targetDocumentName: candidateName,
          },
          comparison,
          documentId: activeRecord.documentId,
          id: `consistency:missing:${activeRecord.documentId}:${candidateRecord.documentId}`,
          kind,
          message: `${candidateName} is missing ${pluralize(comparison.counts.removed, "section")} present in ${activeName}.`,
          relatedDocumentId: candidateRecord.documentId,
          relatedDocumentName: candidateName,
          severity: "warning",
        });
      }

      if (comparison.counts.inconsistent > 0 || procedureConflictCount > 0) {
        const kind: KnowledgeConsistencyIssueKind = "conflicting_procedure";
        issues.push({
          actionPriority: getIssuePriority(kind, comparison, procedureConflictCount),
          actionReason: getIssueActionReason(kind, comparison, procedureConflictCount),
          causalChain: {
            issueKind: kind,
            sourceDocumentId: activeRecord.documentId,
            sourceDocumentName: activeName,
            targetDocumentId: candidateRecord.documentId,
            targetDocumentName: candidateName,
          },
          comparison,
          documentId: activeRecord.documentId,
          id: `consistency:conflict:${activeRecord.documentId}:${candidateRecord.documentId}`,
          kind,
          message: `${candidateName} has ${pluralize(Math.max(comparison.counts.inconsistent, procedureConflictCount), "conflicting procedure")} compared with ${activeName}.`,
          relatedDocumentId: candidateRecord.documentId,
          relatedDocumentName: candidateName,
          severity: "warning",
        });
      }

      if (comparison.counts.added > 0 || comparison.counts.changed > 0) {
        const kind: KnowledgeConsistencyIssueKind = "changed_section";
        issues.push({
          actionPriority: getIssuePriority(kind, comparison, procedureConflictCount),
          actionReason: getIssueActionReason(kind, comparison, procedureConflictCount),
          causalChain: {
            issueKind: kind,
            sourceDocumentId: activeRecord.documentId,
            sourceDocumentName: activeName,
            targetDocumentId: candidateRecord.documentId,
            targetDocumentName: candidateName,
          },
          comparison,
          documentId: activeRecord.documentId,
          id: `consistency:changed:${activeRecord.documentId}:${candidateRecord.documentId}`,
          kind,
          message: `${candidateName} diverges in ${pluralize(comparison.counts.added + comparison.counts.changed, "section")} from ${activeName}.`,
          relatedDocumentId: candidateRecord.documentId,
          relatedDocumentName: candidateName,
          severity: "info",
        });
      }

      return issues;
    })
    .sort((left, right) =>
      actionPriorityOrder[left.actionPriority] - actionPriorityOrder[right.actionPriority]
      || Number(right.severity === "warning") - Number(left.severity === "warning")
      || left.relatedDocumentName.localeCompare(right.relatedDocumentName)
      || left.kind.localeCompare(right.kind));
};

export const buildConsistencyHealthIssues = (
  consistencyIssues: KnowledgeConsistencyIssue[],
): KnowledgeHealthIssue[] => {
  const healthIssues: KnowledgeHealthIssue[] = [];

  for (const issue of consistencyIssues) {
    if (issue.kind !== "missing_section" && issue.kind !== "conflicting_procedure") {
      continue;
    }

    healthIssues.push({
      documentId: issue.documentId,
      id: `health:${issue.id}`,
      kind: issue.kind,
      message: issue.message,
      relatedDocumentIds: [issue.documentId, issue.relatedDocumentId],
      severity: "warning",
    });
  }

  return healthIssues;
};
