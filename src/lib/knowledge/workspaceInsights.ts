import type { KnowledgeDocumentRecord } from "@/lib/knowledge/knowledgeIndex";

export type KnowledgeGraphNodeKind = "document" | "section" | "image";
export type KnowledgeGraphEdgeKind =
  | "contains_section"
  | "contains_image"
  | "references"
  | "similar_to"
  | "duplicate"
  | "issue_relation";
export type KnowledgeGraphEdgeGroup = "containment" | "reference" | "similarity" | "issue";
export type KnowledgeGraphEdgeProvenance = "heuristic" | "issue_assisted" | "rule";
export type KnowledgeHealthIssueKind =
  | "stale_index"
  | "unresolved_reference"
  | "duplicate_document"
  | "image_missing_description"
  | "missing_section"
  | "conflicting_procedure"
  | "outdated_source";
export type KnowledgeHealthSeverity = "info" | "warning";

export interface KnowledgeGraphNode {
  dominantIssueKind?: KnowledgeHealthIssueKind;
  documentId: string;
  imageId?: string;
  imageSrc?: string;
  id: string;
  issueCount?: number;
  issueSeverity?: KnowledgeHealthSeverity;
  kind: KnowledgeGraphNodeKind;
  label: string;
  sectionId?: string;
}

export interface KnowledgeGraphNavigationTarget {
  documentId: string;
  imageId?: string;
  imageSrc?: string;
  kind?: KnowledgeGraphNodeKind;
  label?: string;
  nodeId?: string;
  sectionId?: string;
}

export interface KnowledgeGraphEdge {
  confidence?: number;
  description: string;
  group: KnowledgeGraphEdgeGroup;
  id: string;
  kind: KnowledgeGraphEdgeKind;
  provenance?: KnowledgeGraphEdgeProvenance;
  sourceRule?: string;
  sourceId: string;
  sourceDocumentId: string;
  targetId: string;
  targetDocumentId: string;
  weight: number;
}

export interface KnowledgeHealthIssue {
  documentId: string;
  id: string;
  kind: KnowledgeHealthIssueKind;
  message: string;
  relatedDocumentIds: string[];
  severity: KnowledgeHealthSeverity;
}

export interface KnowledgeWorkspaceSummary {
  documentNodeCount: number;
  edgeCount: number;
  imageNodeCount: number;
  issueCount: number;
  referenceEdgeCount: number;
  sectionNodeCount: number;
  similarEdgeCount: number;
  staleIssueCount: number;
}

export interface KnowledgeWorkspaceInsights {
  edges: KnowledgeGraphEdge[];
  issues: KnowledgeHealthIssue[];
  nodes: KnowledgeGraphNode[];
  summary: KnowledgeWorkspaceSummary;
}

export type KnowledgeDocumentRelationKind = "references" | "referenced_by" | "similar" | "duplicate";

export interface KnowledgeRelatedDocument {
  documentId: string;
  issueCount: number;
  name: string;
  recommendationScore: number;
  relationKinds: KnowledgeDocumentRelationKind[];
}

export interface KnowledgeDocumentImpact {
  documentId: string;
  impactedDocumentCount: number;
  inboundReferenceCount: number;
  issues: KnowledgeHealthIssue[];
  outboundReferenceCount: number;
  paths: KnowledgeImpactPath[];
  relatedDocuments: KnowledgeRelatedDocument[];
}

export interface KnowledgeImpactPath {
  depth: 1 | 2;
  relationKinds: KnowledgeDocumentRelationKind[];
  targetDocumentId: string;
  targetDocumentName: string;
  viaDocumentId?: string;
  viaDocumentName?: string;
}

export interface KnowledgeImpactQueueItem {
  changedDocumentId: string;
  changedDocumentName: string;
  impactedDocumentId: string;
  impactedDocumentName: string;
  issueCount: number;
  relationKinds: KnowledgeDocumentRelationKind[];
}

const relationKindWeight = (relationKind: KnowledgeDocumentRelationKind) => {
  switch (relationKind) {
    case "references":
    case "referenced_by":
      return 4;
    case "duplicate":
      return 3;
    case "similar":
      return 1;
    default:
      return 0;
  }
};

const scoreRelationKinds = (relationKinds: KnowledgeDocumentRelationKind[]) =>
  relationKinds.reduce((score, relationKind) => score + relationKindWeight(relationKind), 0);

const getRecommendationScore = (relationKinds: KnowledgeDocumentRelationKind[], issueCount: number) => {
  const relationScore = scoreRelationKinds(relationKinds) * 14;
  const issueBoost = Math.min(issueCount, 3) * 8;
  const duplicateBoost = relationKinds.includes("duplicate") ? 10 : 0;
  const referenceBoost = relationKinds.includes("references") || relationKinds.includes("referenced_by") ? 12 : 0;
  const multiSignalBoost = relationKinds.length >= 2 ? 8 : 0;

  return Math.max(12, Math.min(99, relationScore + issueBoost + duplicateBoost + referenceBoost + multiSignalBoost));
};

const REFERENCE_TARGET_PATTERN = /\b([a-z0-9._/-]+\.(?:md|markdown|html?|tex|adoc|asciidoc|rst|json|ya?ml))(#[a-z0-9._:-]+)?\b/gi;

const normalizeTerm = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, " ")
    .trim();

const tokenize = (value: string) =>
  Array.from(new Set(
    normalizeTerm(value)
      .split(/\s+/)
      .map((term) => term.trim())
      .filter((term) => term.length >= 3),
  ));

const jaccardSimilarity = (left: string[], right: string[]) => {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }

  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const intersection = left.filter((term) => rightSet.has(term)).length;
  const union = new Set([...leftSet, ...rightSet]).size;

  return union === 0 ? 0 : intersection / union;
};

const extractReferenceTargets = (rawContent: string) =>
  Array.from(rawContent.matchAll(REFERENCE_TARGET_PATTERN)).map((match) => ({
    anchor: match[2]?.replace(/^#/, "").toLowerCase(),
    fileName: match[1].split(/[\\/]/).pop()?.toLowerCase() || match[1].toLowerCase(),
    raw: match[0],
  }));

const normalizeRecordName = (record: KnowledgeDocumentRecord) => record.fileName.split(/[\\/]/).pop()?.toLowerCase() || record.fileName.toLowerCase();
const getRecordName = (record: KnowledgeDocumentRecord) => record.normalizedDocument.metadata.title || record.fileName;

export const buildKnowledgeWorkspaceInsights = (
  records: KnowledgeDocumentRecord[],
): KnowledgeWorkspaceInsights => {
  const nodes: KnowledgeGraphNode[] = [];
  const edges: KnowledgeGraphEdge[] = [];
  const issues: KnowledgeHealthIssue[] = [];
  const recordByFileName = new Map(records.map((record) => [normalizeRecordName(record), record]));
  const labelsByDocumentId = new Map(records.map((record) => [
    record.documentId,
    new Set(Object.keys(record.normalizedDocument.metadata.labels || {}).map((label) => label.toLowerCase())),
  ]));
  const documentTermMap = new Map(records.map((record) => [
    record.documentId,
    tokenize([
      record.normalizedDocument.metadata.title,
      ...record.normalizedDocument.sections.map((section) => section.title),
    ].filter(Boolean).join(" ")),
  ]));
  const duplicateBuckets = new Map<string, KnowledgeDocumentRecord[]>();

  for (const record of records) {
      nodes.push({
        documentId: record.documentId,
        id: `doc:${record.documentId}`,
        kind: "document",
        label: record.normalizedDocument.metadata.title || record.fileName,
    });

    for (const section of record.normalizedDocument.sections) {
      nodes.push({
        documentId: record.documentId,
        id: `section:${record.documentId}:${section.sectionId}`,
        kind: "section",
        label: section.title,
        sectionId: section.sectionId,
      });
      edges.push({
        confidence: 1,
        description: `${record.normalizedDocument.metadata.title || record.fileName} includes section ${section.title}.`,
        group: "containment",
        id: `edge:contains_section:${record.documentId}:${section.sectionId}`,
        kind: "contains_section",
        provenance: "rule",
        sourceRule: "document_structure_section",
        sourceId: `doc:${record.documentId}`,
        sourceDocumentId: record.documentId,
        targetId: `section:${record.documentId}:${section.sectionId}`,
        targetDocumentId: record.documentId,
        weight: 1,
      });
    }

    for (const image of record.normalizedDocument.images) {
      nodes.push({
        documentId: record.documentId,
        imageId: image.imageId,
        imageSrc: image.src,
        id: `image:${record.documentId}:${image.imageId}`,
        kind: "image",
        label: image.alt || image.caption || image.src,
        sectionId: image.sectionId,
      });
      edges.push({
        confidence: 1,
        description: `${record.normalizedDocument.metadata.title || record.fileName} includes image ${image.alt || image.caption || image.src}.`,
        group: "containment",
        id: `edge:contains_image:${record.documentId}:${image.imageId}`,
        kind: "contains_image",
        provenance: "rule",
        sourceRule: "document_structure_image",
        sourceId: image.sectionId
          ? `section:${record.documentId}:${image.sectionId}`
          : `doc:${record.documentId}`,
        sourceDocumentId: record.documentId,
        targetId: `image:${record.documentId}:${image.imageId}`,
        targetDocumentId: record.documentId,
        weight: 1,
      });

      if (!image.alt && !image.caption && !image.title) {
        issues.push({
          documentId: record.documentId,
          id: `issue:image_missing_description:${record.documentId}:${image.imageId}`,
          kind: "image_missing_description",
          message: `Image ${image.src} is missing descriptive alt or caption text.`,
          relatedDocumentIds: [record.documentId],
          severity: "info",
        });
      }
    }

    if (record.indexStatus === "stale") {
      issues.push({
        documentId: record.documentId,
        id: `issue:stale_index:${record.documentId}`,
        kind: "stale_index",
        message: `${record.normalizedDocument.metadata.title || record.fileName} needs reindexing.`,
        relatedDocumentIds: [record.documentId],
        severity: "warning",
      });
    }

    const duplicateKey = normalizeTerm(record.normalizedDocument.metadata.title || record.fileName);

    if (duplicateKey) {
      duplicateBuckets.set(duplicateKey, [...(duplicateBuckets.get(duplicateKey) || []), record]);
    }
  }

  for (const record of records) {
    const references = extractReferenceTargets(record.rawContent);

    for (const reference of references) {
      const target = recordByFileName.get(reference.fileName);

      if (!target) {
        issues.push({
          documentId: record.documentId,
          id: `issue:unresolved_reference:${record.documentId}:${reference.fileName}:${reference.anchor || "none"}`,
          kind: "unresolved_reference",
          message: `${record.normalizedDocument.metadata.title || record.fileName} references missing file ${reference.raw}.`,
          relatedDocumentIds: [record.documentId],
          severity: "warning",
        });
        continue;
      }

      edges.push({
        confidence: 0.98,
        description: `${record.normalizedDocument.metadata.title || record.fileName} references ${target.normalizedDocument.metadata.title || target.fileName}.`,
        group: "reference",
        id: `edge:references:${record.documentId}:${target.documentId}:${reference.anchor || "root"}`,
        kind: "references",
        provenance: "rule",
        sourceRule: reference.anchor ? "reference_target_with_anchor" : "reference_target_pattern",
        sourceId: `doc:${record.documentId}`,
        sourceDocumentId: record.documentId,
        targetId: `doc:${target.documentId}`,
        targetDocumentId: target.documentId,
        weight: 2,
      });

      if (reference.anchor && !labelsByDocumentId.get(target.documentId)?.has(reference.anchor)) {
        issues.push({
          documentId: record.documentId,
          id: `issue:unresolved_reference:${record.documentId}:${target.documentId}:${reference.anchor}`,
          kind: "unresolved_reference",
          message: `${record.normalizedDocument.metadata.title || record.fileName} references missing anchor #${reference.anchor}.`,
          relatedDocumentIds: [record.documentId, target.documentId],
          severity: "warning",
        });
      }
    }
  }

  for (const duplicateRecords of duplicateBuckets.values()) {
    if (duplicateRecords.length < 2) {
      continue;
    }

    for (let index = 0; index < duplicateRecords.length; index += 1) {
      const source = duplicateRecords[index];

      issues.push({
        documentId: source.documentId,
        id: `issue:duplicate_document:${source.documentId}`,
        kind: "duplicate_document",
        message: `${source.normalizedDocument.metadata.title || source.fileName} overlaps with another indexed document.`,
        relatedDocumentIds: duplicateRecords.map((record) => record.documentId),
        severity: "warning",
      });

      for (let targetIndex = index + 1; targetIndex < duplicateRecords.length; targetIndex += 1) {
        const target = duplicateRecords[targetIndex];
        edges.push({
          confidence: 0.72,
          description: `${source.normalizedDocument.metadata.title || source.fileName} overlaps with ${target.normalizedDocument.metadata.title || target.fileName}.`,
          group: "similarity",
          id: `edge:duplicate:${source.documentId}:${target.documentId}`,
          kind: "duplicate",
          provenance: "heuristic",
          sourceRule: "duplicate_normalized_title",
          sourceId: `doc:${source.documentId}`,
          sourceDocumentId: source.documentId,
          targetId: `doc:${target.documentId}`,
          targetDocumentId: target.documentId,
          weight: 5,
        });
      }
    }
  }

  for (let leftIndex = 0; leftIndex < records.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < records.length; rightIndex += 1) {
      const left = records[leftIndex];
      const right = records[rightIndex];
      const similarity = jaccardSimilarity(
        documentTermMap.get(left.documentId) || [],
        documentTermMap.get(right.documentId) || [],
      );

      if (similarity < 0.5) {
        continue;
      }

      edges.push({
        confidence: Number(Math.max(0.5, Math.min(0.95, similarity)).toFixed(2)),
        description: `${left.normalizedDocument.metadata.title || left.fileName} is similar to ${right.normalizedDocument.metadata.title || right.fileName}.`,
        group: "similarity",
        id: `edge:similar_to:${left.documentId}:${right.documentId}`,
        kind: "similar_to",
        provenance: "heuristic",
        sourceRule: "jaccard_title_section_similarity",
        sourceId: `doc:${left.documentId}`,
        sourceDocumentId: left.documentId,
        targetId: `doc:${right.documentId}`,
        targetDocumentId: right.documentId,
        weight: Number((similarity * 10).toFixed(2)),
      });
    }
  }

  const dedupedIssues = Array.from(new Map(issues.map((issue) => [issue.id, issue])).values());
  const issueEdges = dedupedIssues.flatMap((issue) => {
    const relatedDocumentIds = Array.from(new Set(
      issue.relatedDocumentIds.filter((relatedDocumentId) => relatedDocumentId !== issue.documentId),
    ));

    return relatedDocumentIds.map((relatedDocumentId) => ({
      confidence: issue.severity === "warning" ? 0.93 : 0.78,
      description: issue.message,
      group: "issue" as const,
      id: `edge:issue:${issue.id}:${relatedDocumentId}`,
      kind: "issue_relation" as const,
      provenance: "issue_assisted" as const,
      sourceRule: `issue_projection:${issue.kind}`,
      sourceId: `doc:${issue.documentId}`,
      sourceDocumentId: issue.documentId,
      targetId: `doc:${relatedDocumentId}`,
      targetDocumentId: relatedDocumentId,
      weight: issue.severity === "warning" ? 6 : 4,
    }));
  });
  const dedupedEdges = Array.from(new Map([...edges, ...issueEdges].map((edge) => [edge.id, edge])).values());
  const issuesByDocumentId = dedupedIssues.reduce((documents, issue) => {
    const affectedDocumentIds = new Set([issue.documentId, ...issue.relatedDocumentIds]);

    for (const documentId of affectedDocumentIds) {
      documents.set(documentId, [...(documents.get(documentId) || []), issue]);
    }

    return documents;
  }, new Map<string, KnowledgeHealthIssue[]>());

  return {
    edges: dedupedEdges,
    issues: dedupedIssues.sort((left, right) =>
      Number(right.severity === "warning") - Number(left.severity === "warning")
      || left.message.localeCompare(right.message)),
    nodes: nodes.map((node) => ({
      ...node,
      dominantIssueKind: (issuesByDocumentId.get(node.documentId) || [])
        .slice()
        .sort((left, right) =>
          Number(right.severity === "warning") - Number(left.severity === "warning")
          || left.kind.localeCompare(right.kind))[0]?.kind,
      issueCount: (issuesByDocumentId.get(node.documentId) || []).length,
      issueSeverity: (issuesByDocumentId.get(node.documentId) || []).some((issue) => issue.severity === "warning")
        ? "warning"
        : (issuesByDocumentId.get(node.documentId) || []).length > 0
          ? "info"
          : undefined,
    })),
    summary: {
      documentNodeCount: nodes.filter((node) => node.kind === "document").length,
      edgeCount: dedupedEdges.length,
      imageNodeCount: nodes.filter((node) => node.kind === "image").length,
      issueCount: dedupedIssues.length,
      referenceEdgeCount: dedupedEdges.filter((edge) => edge.kind === "references").length,
      sectionNodeCount: nodes.filter((node) => node.kind === "section").length,
      similarEdgeCount: dedupedEdges.filter((edge) => edge.kind === "similar_to" || edge.kind === "duplicate").length,
      staleIssueCount: dedupedIssues.filter((issue) => issue.kind === "stale_index").length,
    },
  };
};

export const buildKnowledgeDocumentImpact = (
  records: KnowledgeDocumentRecord[],
  insights: KnowledgeWorkspaceInsights,
  documentId: string,
): KnowledgeDocumentImpact | null => {
  const activeRecord = records.find((record) => record.documentId === documentId);

  if (!activeRecord) {
    return null;
  }

  const activeNodeId = `doc:${documentId}`;
  const related = new Map<string, Set<KnowledgeDocumentRelationKind>>();
  const adjacency = new Map<string, Map<string, Set<KnowledgeDocumentRelationKind>>>();
  const connectRelation = (
    sourceDocumentId: string,
    targetDocumentId: string,
    relationKind: KnowledgeDocumentRelationKind,
  ) => {
    const relatedDocuments = adjacency.get(sourceDocumentId) || new Map<string, Set<KnowledgeDocumentRelationKind>>();
    const relationKinds = relatedDocuments.get(targetDocumentId) || new Set<KnowledgeDocumentRelationKind>();
    relationKinds.add(relationKind);
    relatedDocuments.set(targetDocumentId, relationKinds);
    adjacency.set(sourceDocumentId, relatedDocuments);
  };
  let inboundReferenceCount = 0;
  let outboundReferenceCount = 0;

  for (const edge of insights.edges) {
    if (
      edge.kind !== "references"
      && edge.kind !== "similar_to"
      && edge.kind !== "duplicate"
    ) {
      continue;
    }

    if (edge.kind === "references" && edge.sourceId.startsWith("doc:") && edge.targetId.startsWith("doc:")) {
      const sourceDocumentId = edge.sourceId.replace(/^doc:/, "");
      const targetDocumentId = edge.targetId.replace(/^doc:/, "");
      connectRelation(sourceDocumentId, targetDocumentId, "references");
      connectRelation(targetDocumentId, sourceDocumentId, "referenced_by");
    }

    if ((edge.kind === "similar_to" || edge.kind === "duplicate") && edge.sourceId.startsWith("doc:") && edge.targetId.startsWith("doc:")) {
      const sourceDocumentId = edge.sourceId.replace(/^doc:/, "");
      const targetDocumentId = edge.targetId.replace(/^doc:/, "");
      connectRelation(sourceDocumentId, targetDocumentId, edge.kind === "similar_to" ? "similar" : "duplicate");
      connectRelation(targetDocumentId, sourceDocumentId, edge.kind === "similar_to" ? "similar" : "duplicate");
    }

    if (edge.kind === "references" && edge.sourceId === activeNodeId && edge.targetId.startsWith("doc:")) {
      const relatedDocumentId = edge.targetId.replace(/^doc:/, "");
      const relationKinds = related.get(relatedDocumentId) || new Set<KnowledgeDocumentRelationKind>();
      relationKinds.add("references");
      related.set(relatedDocumentId, relationKinds);
      outboundReferenceCount += 1;
      continue;
    }

    if (edge.kind === "references" && edge.targetId === activeNodeId && edge.sourceId.startsWith("doc:")) {
      const relatedDocumentId = edge.sourceId.replace(/^doc:/, "");
      const relationKinds = related.get(relatedDocumentId) || new Set<KnowledgeDocumentRelationKind>();
      relationKinds.add("referenced_by");
      related.set(relatedDocumentId, relationKinds);
      inboundReferenceCount += 1;
      continue;
    }

    if ((edge.kind === "similar_to" || edge.kind === "duplicate") && edge.sourceId.startsWith("doc:") && edge.targetId.startsWith("doc:")) {
      const sourceDocumentId = edge.sourceId.replace(/^doc:/, "");
      const targetDocumentId = edge.targetId.replace(/^doc:/, "");

      if (sourceDocumentId !== documentId && targetDocumentId !== documentId) {
        continue;
      }

      const relatedDocumentId = sourceDocumentId === documentId ? targetDocumentId : sourceDocumentId;
      const relationKinds = related.get(relatedDocumentId) || new Set<KnowledgeDocumentRelationKind>();
      relationKinds.add(edge.kind === "similar_to" ? "similar" : "duplicate");
      related.set(relatedDocumentId, relationKinds);
    }
  }

  const issues = insights.issues.filter((issue) =>
    issue.documentId === documentId || issue.relatedDocumentIds.includes(documentId));

  const relatedDocuments = Array.from(related.entries())
    .map(([relatedDocumentId, relationKinds]) => {
      const relatedRecord = records.find((record) => record.documentId === relatedDocumentId);

      if (!relatedRecord) {
        return null;
      }

      const issueCount = issues.filter((issue) => issue.relatedDocumentIds.includes(relatedDocumentId)).length;

      return {
        documentId: relatedDocumentId,
        issueCount,
        name: getRecordName(relatedRecord),
        recommendationScore: getRecommendationScore(Array.from(relationKinds).sort(), issueCount),
        relationKinds: Array.from(relationKinds).sort(),
      } satisfies KnowledgeRelatedDocument;
    })
    .filter((entry): entry is KnowledgeRelatedDocument => Boolean(entry))
    .sort((left, right) =>
      right.recommendationScore - left.recommendationScore
      || scoreRelationKinds(right.relationKinds) - scoreRelationKinds(left.relationKinds)
      || right.relationKinds.length - left.relationKinds.length
      || right.issueCount - left.issueCount
      || left.name.localeCompare(right.name));

  const directDocumentIds = new Set(relatedDocuments.map((document) => document.documentId));
  const impactPaths = [
    ...relatedDocuments.map((document) => ({
      depth: 1 as const,
      relationKinds: document.relationKinds,
      targetDocumentId: document.documentId,
      targetDocumentName: document.name,
    })),
    ...Array.from(directDocumentIds).flatMap((viaDocumentId) => {
      const viaRecord = records.find((record) => record.documentId === viaDocumentId);
      const viaRelations = adjacency.get(viaDocumentId);

      if (!viaRelations || !viaRecord) {
        return [];
      }

      return Array.from(viaRelations.entries())
        .filter(([targetDocumentId]) => targetDocumentId !== documentId && !directDocumentIds.has(targetDocumentId))
        .map(([targetDocumentId, relationKinds]) => {
          const targetRecord = records.find((record) => record.documentId === targetDocumentId);

          if (!targetRecord) {
            return null;
          }

          return {
            depth: 2 as const,
            relationKinds: Array.from(relationKinds).sort(),
            targetDocumentId,
            targetDocumentName: getRecordName(targetRecord),
            viaDocumentId,
            viaDocumentName: getRecordName(viaRecord),
          } satisfies KnowledgeImpactPath;
        })
        .filter((path): path is NonNullable<typeof path> => Boolean(path));
    }),
  ].sort((left, right) => {
    const leftViaName = "viaDocumentName" in left ? left.viaDocumentName : "";
    const rightViaName = "viaDocumentName" in right ? right.viaDocumentName : "";

    return left.depth - right.depth
      || scoreRelationKinds(right.relationKinds) - scoreRelationKinds(left.relationKinds)
      || left.targetDocumentName.localeCompare(right.targetDocumentName)
      || leftViaName.localeCompare(rightViaName);
  });

  return {
    documentId: activeRecord.documentId,
    impactedDocumentCount: relatedDocuments.filter((document) => document.relationKinds.includes("referenced_by")).length,
    inboundReferenceCount,
    issues,
    outboundReferenceCount,
    paths: impactPaths,
    relatedDocuments,
  };
};

export const buildKnowledgeImpactQueue = (
  records: KnowledgeDocumentRecord[],
  insights: KnowledgeWorkspaceInsights,
  changedDocumentIds: string[],
): KnowledgeImpactQueueItem[] => {
  const changedDocumentIdSet = new Set(changedDocumentIds);
  const relationKindsByPair = new Map<string, Set<KnowledgeDocumentRelationKind>>();
  const issueCountByDocumentId = insights.issues.reduce((counts, issue) => {
    for (const relatedDocumentId of issue.relatedDocumentIds) {
      counts.set(relatedDocumentId, (counts.get(relatedDocumentId) || 0) + 1);
    }

    return counts;
  }, new Map<string, number>());

  for (const edge of insights.edges) {
    if (edge.sourceDocumentId === edge.targetDocumentId) {
      continue;
    }

    if (edge.kind === "references" && changedDocumentIdSet.has(edge.targetDocumentId)) {
      const pairId = `${edge.targetDocumentId}:${edge.sourceDocumentId}`;
      const relationKinds = relationKindsByPair.get(pairId) || new Set<KnowledgeDocumentRelationKind>();
      relationKinds.add("referenced_by");
      relationKindsByPair.set(pairId, relationKinds);
      continue;
    }

    if ((edge.kind === "similar_to" || edge.kind === "duplicate") && (
      changedDocumentIdSet.has(edge.sourceDocumentId)
      || changedDocumentIdSet.has(edge.targetDocumentId)
    )) {
      const changedDocumentId = changedDocumentIdSet.has(edge.sourceDocumentId)
        ? edge.sourceDocumentId
        : edge.targetDocumentId;
      const impactedDocumentId = changedDocumentId === edge.sourceDocumentId
        ? edge.targetDocumentId
        : edge.sourceDocumentId;
      const pairId = `${changedDocumentId}:${impactedDocumentId}`;
      const relationKinds = relationKindsByPair.get(pairId) || new Set<KnowledgeDocumentRelationKind>();
      relationKinds.add(edge.kind === "duplicate" ? "duplicate" : "similar");
      relationKindsByPair.set(pairId, relationKinds);
    }
  }

  return Array.from(relationKindsByPair.entries())
    .map(([pairId, relationKinds]) => {
      const [changedDocumentId, impactedDocumentId] = pairId.split(":");
      const changedRecord = records.find((record) => record.documentId === changedDocumentId);
      const impactedRecord = records.find((record) => record.documentId === impactedDocumentId);

      if (!changedRecord || !impactedRecord) {
        return null;
      }

      return {
        changedDocumentId,
        changedDocumentName: changedRecord.normalizedDocument.metadata.title || changedRecord.fileName,
        impactedDocumentId,
        impactedDocumentName: impactedRecord.normalizedDocument.metadata.title || impactedRecord.fileName,
        issueCount: issueCountByDocumentId.get(impactedDocumentId) || 0,
        relationKinds: Array.from(relationKinds).sort(),
      } satisfies KnowledgeImpactQueueItem;
    })
    .filter((item): item is KnowledgeImpactQueueItem => Boolean(item))
    .sort((left, right) =>
      scoreRelationKinds(right.relationKinds) - scoreRelationKinds(left.relationKinds)
      || right.relationKinds.length - left.relationKinds.length
      || right.issueCount - left.issueCount
      || left.impactedDocumentName.localeCompare(right.impactedDocumentName)
      || left.changedDocumentName.localeCompare(right.changedDocumentName));
};
