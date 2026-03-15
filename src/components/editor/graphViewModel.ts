import {
  edgeGroupOrder,
  nodeKindOrder,
  type EdgeFilter,
  type NodeFilter,
} from "@/components/editor/workspaceGraphUtils";
import type {
  KnowledgeGraphEdge,
  KnowledgeGraphNode,
  KnowledgeWorkspaceInsights,
} from "@/lib/knowledge/workspaceInsights";

export interface PreparedGraphView {
  edgeById: Map<string, KnowledgeGraphEdge>;
  edgeSearchTextById: Map<string, string>;
  edges: KnowledgeGraphEdge[];
  nodeById: Map<string, KnowledgeGraphNode>;
  nodeSearchTextById: Map<string, string>;
  nodes: KnowledgeGraphNode[];
}

export interface GraphConnectionSummary {
  adjacencyByNodeId: Map<string, KnowledgeGraphEdge[]>;
  incoming: Map<string, number>;
  outgoing: Map<string, number>;
}

const sortNodes = (left: KnowledgeGraphNode, right: KnowledgeGraphNode) =>
  nodeKindOrder[left.kind] - nodeKindOrder[right.kind]
  || Number(right.issueSeverity === "warning") - Number(left.issueSeverity === "warning")
  || (right.issueCount || 0) - (left.issueCount || 0)
  || left.label.localeCompare(right.label);

const sortEdges = (left: KnowledgeGraphEdge, right: KnowledgeGraphEdge) =>
  edgeGroupOrder[left.group] - edgeGroupOrder[right.group]
  || right.weight - left.weight
  || left.description.localeCompare(right.description);

const normalizeSearchValue = (value: string) => value.trim().toLowerCase();

export const createPreparedGraphView = ({
  edgeFilter,
  insights,
  issuesOnly,
  nodeFilter,
}: {
  edgeFilter: EdgeFilter;
  insights: KnowledgeWorkspaceInsights;
  issuesOnly: boolean;
  nodeFilter: NodeFilter;
}): PreparedGraphView => {
  const nodeById = new Map(insights.nodes.map((node) => [node.id, node]));
  const nodes = insights.nodes
    .filter((node) =>
      (nodeFilter === "all" || node.kind === nodeFilter)
      && (!issuesOnly || (node.issueCount || 0) > 0))
    .sort(sortNodes);
  const visibleNodeIds = new Set(nodes.map((node) => node.id));
  const edges = insights.edges
    .filter((edge) =>
      (edgeFilter === "all" || edge.group === edgeFilter)
      && visibleNodeIds.has(edge.sourceId)
      && visibleNodeIds.has(edge.targetId))
    .sort(sortEdges);
  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));
  const nodeSearchTextById = new Map(
    nodes.map((node) => [node.id, normalizeSearchValue(node.label)]),
  );
  const edgeSearchTextById = new Map(
    edges.map((edge) => [
      edge.id,
      normalizeSearchValue([
        edge.description,
        nodeById.get(edge.sourceId)?.label || "",
        nodeById.get(edge.targetId)?.label || "",
      ].join(" ")),
    ]),
  );

  return {
    edgeById,
    edgeSearchTextById,
    edges,
    nodeById,
    nodeSearchTextById,
    nodes,
  };
};

export const filterPreparedGraphByQuery = (
  prepared: PreparedGraphView,
  query: string,
) => {
  const normalizedQuery = normalizeSearchValue(query);

  if (!normalizedQuery) {
    return {
      edges: prepared.edges,
      nodes: prepared.nodes,
    };
  }

  const directlyMatchedNodeIds = new Set(
    prepared.nodes
      .filter((node) => prepared.nodeSearchTextById.get(node.id)?.includes(normalizedQuery))
      .map((node) => node.id),
  );
  const matchedNodeIds = new Set(directlyMatchedNodeIds);
  const matchedEdgeIds = new Set<string>();

  for (const edge of prepared.edges) {
    const edgeMatches = prepared.edgeSearchTextById.get(edge.id)?.includes(normalizedQuery);

    if (
      edgeMatches
      || directlyMatchedNodeIds.has(edge.sourceId)
      || directlyMatchedNodeIds.has(edge.targetId)
    ) {
      matchedEdgeIds.add(edge.id);
      matchedNodeIds.add(edge.sourceId);
      matchedNodeIds.add(edge.targetId);
    }
  }

  return {
    edges: prepared.edges.filter((edge) => matchedEdgeIds.has(edge.id)),
    nodes: prepared.nodes.filter((node) => matchedNodeIds.has(node.id)),
  };
};

export const buildGraphConnectionSummary = (
  edges: KnowledgeGraphEdge[],
): GraphConnectionSummary => {
  const adjacencyByNodeId = new Map<string, KnowledgeGraphEdge[]>();
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();

  for (const edge of edges) {
    outgoing.set(edge.sourceId, (outgoing.get(edge.sourceId) || 0) + 1);
    incoming.set(edge.targetId, (incoming.get(edge.targetId) || 0) + 1);
    adjacencyByNodeId.set(edge.sourceId, [...(adjacencyByNodeId.get(edge.sourceId) || []), edge]);
    adjacencyByNodeId.set(edge.targetId, [...(adjacencyByNodeId.get(edge.targetId) || []), edge]);
  }

  return {
    adjacencyByNodeId,
    incoming,
    outgoing,
  };
};
