import { compareDocuments, type DocumentComparisonResult } from "@/lib/ai/compareDocuments";
import type { KnowledgeDocumentRecord } from "@/lib/knowledge/knowledgeIndex";
import type { KnowledgeHealthIssue } from "@/lib/knowledge/workspaceInsights";

export type KnowledgeConsistencyIssueKind = "missing_section" | "conflicting_procedure" | "changed_section";

export interface KnowledgeConsistencyIssue {
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
        issues.push({
          comparison,
          documentId: activeRecord.documentId,
          id: `consistency:missing:${activeRecord.documentId}:${candidateRecord.documentId}`,
          kind: "missing_section",
          message: `${candidateName} is missing ${pluralize(comparison.counts.removed, "section")} present in ${activeName}.`,
          relatedDocumentId: candidateRecord.documentId,
          relatedDocumentName: candidateName,
          severity: "warning",
        });
      }

      if (comparison.counts.inconsistent > 0 || procedureConflictCount > 0) {
        issues.push({
          comparison,
          documentId: activeRecord.documentId,
          id: `consistency:conflict:${activeRecord.documentId}:${candidateRecord.documentId}`,
          kind: "conflicting_procedure",
          message: `${candidateName} has ${pluralize(Math.max(comparison.counts.inconsistent, procedureConflictCount), "conflicting procedure")} compared with ${activeName}.`,
          relatedDocumentId: candidateRecord.documentId,
          relatedDocumentName: candidateName,
          severity: "warning",
        });
      }

      if (comparison.counts.added > 0 || comparison.counts.changed > 0) {
        issues.push({
          comparison,
          documentId: activeRecord.documentId,
          id: `consistency:changed:${activeRecord.documentId}:${candidateRecord.documentId}`,
          kind: "changed_section",
          message: `${candidateName} diverges in ${pluralize(comparison.counts.added + comparison.counts.changed, "section")} from ${activeName}.`,
          relatedDocumentId: candidateRecord.documentId,
          relatedDocumentName: candidateName,
          severity: "info",
        });
      }

      return issues;
    })
    .sort((left, right) =>
      Number(right.severity === "warning") - Number(left.severity === "warning")
      || left.relatedDocumentName.localeCompare(right.relatedDocumentName)
      || left.kind.localeCompare(right.kind));
};

export const buildConsistencyHealthIssues = (
  consistencyIssues: KnowledgeConsistencyIssue[],
): KnowledgeHealthIssue[] =>
  consistencyIssues
    .filter((issue) => issue.kind === "missing_section" || issue.kind === "conflicting_procedure")
    .map((issue) => ({
      documentId: issue.documentId,
      id: `health:${issue.id}`,
      kind: issue.kind,
      message: issue.message,
      relatedDocumentIds: [issue.documentId, issue.relatedDocumentId],
      severity: "warning",
    }));
