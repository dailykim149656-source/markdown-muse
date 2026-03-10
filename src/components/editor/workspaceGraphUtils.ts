import type {
  KnowledgeGraphEdge,
  KnowledgeGraphEdgeGroup,
  KnowledgeGraphNode,
} from "@/lib/knowledge/workspaceInsights";

export type NodeFilter = "all" | KnowledgeGraphNode["kind"];
export type EdgeFilter = "all" | KnowledgeGraphEdgeGroup;

export const nodeKindOrder: Record<KnowledgeGraphNode["kind"], number> = {
  document: 0,
  section: 1,
  image: 2,
};

export const edgeGroupOrder: Record<KnowledgeGraphEdgeGroup, number> = {
  containment: 0,
  reference: 1,
  similarity: 2,
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

export const edgeKindLabelKey = (edge: KnowledgeGraphEdge) => {
  switch (edge.kind) {
    case "contains_section":
      return "knowledge.graphEdgeContainsSection";
    case "contains_image":
      return "knowledge.graphEdgeContainsImage";
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
    case "reference":
      return "default";
    case "similarity":
      return "secondary";
    default:
      return "outline";
  }
};
