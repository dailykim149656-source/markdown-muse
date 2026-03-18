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
const MAX_PATHS = 5;
const MAX_REASONS = 6;

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

const getRelationConfidence = (relationKinds: KnowledgeDocumentImpact["paths"][number]["relationKinds"], depth: 1 | 2) => {
  const base = relationKinds.includes("references") || relationKinds.includes("referenced_by")
    ? 0.92
    : relationKinds.includes("duplicate")
      ? 0.82
      : relationKinds.includes("similar")
        ? 0.64
        : 0.56;

  return Number(Math.max(0.4, Math.min(0.98, base - (depth === 2 ? 0.14 : 0))).toFixed(2));
};

const buildPathReasonMessage = (path: KnowledgeDocumentImpact["paths"][number]) => {
  const relationLabel = path.relationKinds.join(", ");

  if (path.depth === 2 && path.viaDocumentName) {
    return `${path.targetDocumentName} is related through ${path.viaDocumentName} (${relationLabel}).`;
  }

  return `${path.targetDocumentName} is directly related (${relationLabel}).`;
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
    paths: impact.paths
      .slice(0, MAX_PATHS)
      .map((path) => ({
        confidence: getRelationConfidence(path.relationKinds, path.depth),
        depth: path.depth,
        relationKinds: path.relationKinds,
        targetDocumentId: path.targetDocumentId,
        targetDocumentName: path.targetDocumentName,
        viaDocumentId: path.viaDocumentId,
        viaDocumentName: path.viaDocumentName,
      })),
    reasons: [
      ...impact.issues.map((issue) => ({
        message: issue.message,
        source: "issue" as const,
      })),
      ...impact.paths.map((path) => ({
        message: buildPathReasonMessage(path),
        source: "path" as const,
        targetDocumentId: path.targetDocumentId,
        targetDocumentName: path.targetDocumentName,
      })),
    ].slice(0, MAX_REASONS),
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
