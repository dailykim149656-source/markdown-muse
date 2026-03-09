import type { KnowledgeDocumentRecord } from "@/lib/knowledge/knowledgeIndex";

export type KnowledgeGraphNodeKind = "document" | "section" | "image";
export type KnowledgeGraphEdgeKind = "contains_section" | "contains_image" | "references" | "similar_to" | "duplicate";
export type KnowledgeHealthIssueKind =
  | "stale_index"
  | "unresolved_reference"
  | "duplicate_document"
  | "image_missing_description";
export type KnowledgeHealthSeverity = "info" | "warning";

export interface KnowledgeGraphNode {
  documentId: string;
  id: string;
  kind: KnowledgeGraphNodeKind;
  label: string;
}

export interface KnowledgeGraphEdge {
  id: string;
  kind: KnowledgeGraphEdgeKind;
  sourceId: string;
  targetId: string;
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
  relationKinds: KnowledgeDocumentRelationKind[];
}

export interface KnowledgeDocumentImpact {
  documentId: string;
  impactedDocumentCount: number;
  inboundReferenceCount: number;
  issues: KnowledgeHealthIssue[];
  outboundReferenceCount: number;
  relatedDocuments: KnowledgeRelatedDocument[];
}

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
      });
      edges.push({
        id: `edge:contains_section:${record.documentId}:${section.sectionId}`,
        kind: "contains_section",
        sourceId: `doc:${record.documentId}`,
        targetId: `section:${record.documentId}:${section.sectionId}`,
        weight: 1,
      });
    }

    for (const image of record.normalizedDocument.images) {
      nodes.push({
        documentId: record.documentId,
        id: `image:${record.documentId}:${image.imageId}`,
        kind: "image",
        label: image.alt || image.caption || image.src,
      });
      edges.push({
        id: `edge:contains_image:${record.documentId}:${image.imageId}`,
        kind: "contains_image",
        sourceId: image.sectionId
          ? `section:${record.documentId}:${image.sectionId}`
          : `doc:${record.documentId}`,
        targetId: `image:${record.documentId}:${image.imageId}`,
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
        id: `edge:references:${record.documentId}:${target.documentId}:${reference.anchor || "root"}`,
        kind: "references",
        sourceId: `doc:${record.documentId}`,
        targetId: `doc:${target.documentId}`,
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
          id: `edge:duplicate:${source.documentId}:${target.documentId}`,
          kind: "duplicate",
          sourceId: `doc:${source.documentId}`,
          targetId: `doc:${target.documentId}`,
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
        id: `edge:similar_to:${left.documentId}:${right.documentId}`,
        kind: "similar_to",
        sourceId: `doc:${left.documentId}`,
        targetId: `doc:${right.documentId}`,
        weight: Number((similarity * 10).toFixed(2)),
      });
    }
  }

  const dedupedEdges = Array.from(new Map(edges.map((edge) => [edge.id, edge])).values());
  const dedupedIssues = Array.from(new Map(issues.map((issue) => [issue.id, issue])).values());

  return {
    edges: dedupedEdges,
    issues: dedupedIssues.sort((left, right) =>
      Number(right.severity === "warning") - Number(left.severity === "warning")
      || left.message.localeCompare(right.message)),
    nodes,
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
        name: relatedRecord.normalizedDocument.metadata.title || relatedRecord.fileName,
        relationKinds: Array.from(relationKinds).sort(),
      } satisfies KnowledgeRelatedDocument;
    })
    .filter((entry): entry is KnowledgeRelatedDocument => Boolean(entry))
    .sort((left, right) =>
      right.relationKinds.length - left.relationKinds.length
      || right.issueCount - left.issueCount
      || left.name.localeCompare(right.name));

  return {
    documentId: activeRecord.documentId,
    impactedDocumentCount: relatedDocuments.filter((document) => document.relationKinds.includes("referenced_by")).length,
    inboundReferenceCount,
    issues,
    outboundReferenceCount,
    relatedDocuments,
  };
};
