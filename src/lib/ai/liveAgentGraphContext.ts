import {
  buildKnowledgeDocumentImpact,
  buildKnowledgeWorkspaceInsights,
  type KnowledgeDocumentImpact,
} from "@/lib/knowledge/workspaceInsights";
import { buildKnowledgeRecordFromDocument } from "@/lib/knowledge/knowledgeIndex";
import type { DocumentData } from "@/types/document";
import type { AgentGraphContext } from "@/types/liveAgent";

const MAX_RELATED_DOCUMENTS = 5;
const MAX_ISSUES = 5;

const clampScore = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (value <= 0) {
    return 0;
  }

  if (value >= 99) {
    return 99;
  }

  return Math.round(value);
};

const summarizeImpact = (impact: KnowledgeDocumentImpact | null) => {
  if (!impact) {
    return null;
  }

  return {
    impactSummary: {
      impactedDocumentCount: impact.impactedDocumentCount,
      inboundReferenceCount: impact.inboundReferenceCount,
      issueCount: impact.issues.length,
      outboundReferenceCount: impact.outboundReferenceCount,
    },
    issues: impact.issues
      .slice(0, MAX_ISSUES)
      .map((issue) => ({
        id: issue.id,
        kind: issue.kind,
        message: issue.message,
        relatedDocumentIds: issue.relatedDocumentIds,
        severity: issue.severity,
      })),
    relatedDocuments: impact.relatedDocuments
      .slice(0, MAX_RELATED_DOCUMENTS)
      .map((document) => ({
        documentId: document.documentId,
        name: document.name,
        recommendationScore: clampScore(document.recommendationScore),
        relationKinds: document.relationKinds,
      })),
  };
};

export const buildLiveAgentGraphContext = ({
  activeDocumentId,
  documents,
}: {
  activeDocumentId: string;
  documents: DocumentData[];
}): AgentGraphContext | undefined => {
  const records = documents
    .map((document) => buildKnowledgeRecordFromDocument(document))
    .filter((record) => Boolean(record));

  if (records.length === 0) {
    return undefined;
  }

  const knowledgeInsights = buildKnowledgeWorkspaceInsights(records);
  const impact = buildKnowledgeDocumentImpact(records, knowledgeInsights, activeDocumentId);
  const workspaceHints = summarizeImpact(impact);

  if (!workspaceHints) {
    return undefined;
  }

  return {
    workspaceHints,
  };
};
