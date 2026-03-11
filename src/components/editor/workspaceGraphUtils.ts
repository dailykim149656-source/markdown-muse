import type {
  KnowledgeGraphEdge,
  KnowledgeGraphEdgeGroup,
  KnowledgeGraphNavigationTarget,
  KnowledgeGraphNode,
  KnowledgeHealthIssue,
  KnowledgeHealthIssueKind,
} from "@/lib/knowledge/workspaceInsights";

export type NodeFilter = "all" | KnowledgeGraphNode["kind"];
export type EdgeFilter = "all" | KnowledgeGraphEdgeGroup;
export type GraphMode = "full" | "document" | "issues";
export type IssueFilter = "all" | KnowledgeHealthIssueKind;

interface GraphView {
  edges: KnowledgeGraphEdge[];
  nodes: KnowledgeGraphNode[];
}

export const nodeKindOrder: Record<KnowledgeGraphNode["kind"], number> = {
  document: 0,
  section: 1,
  image: 2,
};

export const edgeGroupOrder: Record<KnowledgeGraphEdgeGroup, number> = {
  containment: 0,
  reference: 1,
  similarity: 2,
  issue: 3,
};

export const graphModeKey = (value: GraphMode) => {
  switch (value) {
    case "document":
      return "knowledge.graphModeDocument";
    case "issues":
      return "knowledge.graphModeIssues";
    default:
      return "knowledge.graphModeFull";
  }
};

export const nodeFilterKey = (value: NodeFilter) => {
  switch (value) {
    case "document":
      return "knowledge.graphNodeDocument";
    case "section":
      return "knowledge.graphNodeSection";
    case "image":
      return "knowledge.graphNodeImage";
    default:
      return "knowledge.graphFilterAll";
  }
};

export const edgeFilterKey = (value: EdgeFilter) => {
  switch (value) {
    case "issue":
      return "knowledge.graphFilterIssues";
    case "containment":
      return "knowledge.graphFilterContainment";
    case "reference":
      return "knowledge.graphFilterReferences";
    case "similarity":
      return "knowledge.graphFilterSimilarity";
    default:
      return "knowledge.graphFilterAll";
  }
};

export const issueFilterKey = (value: IssueFilter) =>
  value === "all"
    ? "knowledge.graphIssueFilterAll"
    : issueKindLabelKey(value);

export const edgeKindLabelKey = (edge: KnowledgeGraphEdge) => {
  switch (edge.kind) {
    case "contains_section":
      return "knowledge.graphEdgeContainsSection";
    case "contains_image":
      return "knowledge.graphEdgeContainsImage";
    case "issue_relation":
      return "knowledge.graphEdgeIssue";
    case "references":
      return "knowledge.graphEdgeReferences";
    case "duplicate":
      return "knowledge.graphEdgeDuplicate";
    default:
      return "knowledge.graphEdgeSimilar";
  }
};

export const edgeBadgeVariant = (
  group: KnowledgeGraphEdgeGroup,
): "default" | "secondary" | "outline" => {
  switch (group) {
    case "issue":
      return "secondary";
    case "reference":
      return "default";
    case "similarity":
      return "secondary";
    default:
      return "outline";
  }
};

export const issueKindLabelKey = (kind: KnowledgeHealthIssue["kind"]) => {
  switch (kind) {
    case "stale_index":
      return "knowledge.issueStale";
    case "unresolved_reference":
      return "knowledge.issueReference";
    case "duplicate_document":
      return "knowledge.issueDuplicate";
    case "image_missing_description":
      return "knowledge.issueImage";
    case "missing_section":
      return "knowledge.issueMissingSection";
    case "conflicting_procedure":
      return "knowledge.issueConflictingProcedure";
    case "outdated_source":
      return "knowledge.issueOutdatedSource";
    default:
      return "knowledge.healthTitle";
  }
};

export const applyGraphMode = ({
  activeDocumentId,
  graph,
  mode,
}: {
  activeDocumentId?: string;
  graph: GraphView;
  mode: GraphMode;
}): GraphView => {
  if (mode === "full") {
    return graph;
  }

  if (mode === "document") {
    if (!activeDocumentId) {
      return graph;
    }

    const activeNodeId = `doc:${activeDocumentId}`;

    if (!graph.nodes.some((node) => node.id === activeNodeId)) {
      return graph;
    }

    const visibleNodeIds = new Set<string>([activeNodeId]);

    for (const edge of graph.edges) {
      if (edge.sourceId === activeNodeId || edge.targetId === activeNodeId) {
        visibleNodeIds.add(edge.sourceId);
        visibleNodeIds.add(edge.targetId);
      }
    }

    let changed = true;

    while (changed) {
      changed = false;

      for (const edge of graph.edges) {
        const isActiveDocumentContainment = edge.group === "containment"
          && edge.sourceDocumentId === activeDocumentId
          && edge.targetDocumentId === activeDocumentId;

        if (!isActiveDocumentContainment) {
          continue;
        }

        if (visibleNodeIds.has(edge.sourceId) || visibleNodeIds.has(edge.targetId)) {
          const previousSize = visibleNodeIds.size;
          visibleNodeIds.add(edge.sourceId);
          visibleNodeIds.add(edge.targetId);
          changed = changed || visibleNodeIds.size !== previousSize;
        }
      }
    }

    return {
      edges: graph.edges.filter((edge) =>
        (edge.sourceId === activeNodeId || edge.targetId === activeNodeId)
        || (
          edge.group === "containment"
          && edge.sourceDocumentId === activeDocumentId
          && edge.targetDocumentId === activeDocumentId
          && visibleNodeIds.has(edge.sourceId)
          && visibleNodeIds.has(edge.targetId)
        )),
      nodes: graph.nodes.filter((node) => visibleNodeIds.has(node.id)),
    };
  }

  const issueNodeIds = new Set(
    graph.nodes
      .filter((node) => (node.issueCount || 0) > 0)
      .map((node) => node.id),
  );

  if (issueNodeIds.size === 0) {
    return {
      edges: [],
      nodes: [],
    };
  }

  const relatedEdges = graph.edges.filter((edge) =>
    issueNodeIds.has(edge.sourceId) || issueNodeIds.has(edge.targetId));
  const preferredEdges = relatedEdges.some((edge) => edge.group === "issue")
    ? relatedEdges.filter((edge) => edge.group === "issue")
    : relatedEdges;
  const visibleNodeIds = new Set(issueNodeIds);

  for (const edge of preferredEdges) {
    visibleNodeIds.add(edge.sourceId);
    visibleNodeIds.add(edge.targetId);
  }

  return {
    edges: preferredEdges,
    nodes: graph.nodes.filter((node) => visibleNodeIds.has(node.id)),
  };
};

export const applyIssueFilter = ({
  graph,
  issues,
  value,
}: {
  graph: GraphView;
  issues: KnowledgeHealthIssue[];
  value: IssueFilter;
}): GraphView => {
  if (value === "all") {
    return graph;
  }

  const visibleDocumentIds = new Set(
    issues
      .filter((issue) => issue.kind === value)
      .flatMap((issue) => [issue.documentId, ...issue.relatedDocumentIds]),
  );

  if (visibleDocumentIds.size === 0) {
    return {
      edges: [],
      nodes: [],
    };
  }

  const nodes = graph.nodes.filter((node) => visibleDocumentIds.has(node.documentId));
  const visibleNodeIds = new Set(nodes.map((node) => node.id));

  return {
    edges: graph.edges.filter((edge) =>
      visibleNodeIds.has(edge.sourceId) && visibleNodeIds.has(edge.targetId)),
    nodes,
  };
};

export const toGraphNavigationTarget = (
  node: Pick<KnowledgeGraphNode, "documentId" | "id" | "imageId" | "imageSrc" | "kind" | "label" | "sectionId">,
): KnowledgeGraphNavigationTarget => ({
  documentId: node.documentId,
  imageId: node.imageId,
  imageSrc: node.imageSrc,
  kind: node.kind,
  label: node.label,
  nodeId: node.id,
  sectionId: node.sectionId,
});
