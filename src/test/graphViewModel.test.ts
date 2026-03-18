import { describe, expect, it } from "vitest";
import { buildGraphPathExplanations } from "@/components/editor/graphViewModel";
import type { KnowledgeGraphEdge, KnowledgeGraphNode } from "@/lib/knowledge/workspaceInsights";

const nodes: KnowledgeGraphNode[] = [
  {
    documentId: "doc-alpha",
    id: "doc:alpha",
    kind: "document",
    label: "Alpha Doc",
  },
  {
    documentId: "doc-beta",
    id: "doc:beta",
    kind: "document",
    label: "Beta Doc",
  },
  {
    documentId: "doc-gamma",
    id: "doc:gamma",
    kind: "document",
    label: "Gamma Doc",
  },
];

const edges: KnowledgeGraphEdge[] = [
  {
    confidence: 0.98,
    description: "Alpha references Beta.",
    group: "reference",
    id: "edge-ref",
    kind: "references",
    provenance: "rule",
    sourceDocumentId: "doc-alpha",
    sourceId: "doc:alpha",
    sourceRule: "reference_target_pattern",
    targetDocumentId: "doc-beta",
    targetId: "doc:beta",
    weight: 2,
  },
  {
    confidence: 0.64,
    description: "Beta is similar to Gamma.",
    group: "similarity",
    id: "edge-sim",
    kind: "similar_to",
    provenance: "heuristic",
    sourceDocumentId: "doc-beta",
    sourceId: "doc:beta",
    sourceRule: "jaccard_title_section_similarity",
    targetDocumentId: "doc-gamma",
    targetId: "doc:gamma",
    weight: 1.2,
  },
];

describe("graphViewModel", () => {
  it("ranks direct rule-based paths ahead of weaker two-hop heuristic paths", () => {
    const explanations = buildGraphPathExplanations({
      edges,
      nodeById: new Map(nodes.map((node) => [node.id, node])),
      selectedNodeId: "doc:alpha",
    });

    expect(explanations[0]).toEqual(expect.objectContaining({
      provenance: "rule",
      targetNodeId: "doc:beta",
    }));
    expect(explanations.some((path) => path.targetNodeId === "doc:gamma" && path.viaNodeId === "doc:beta")).toBe(true);
  });
});
