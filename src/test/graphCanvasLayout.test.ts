import { describe, expect, it } from "vitest";
import {
  buildGraphNodeLayout,
  GRAPH_CANVAS_HEIGHT,
  GRAPH_CANVAS_WIDTH,
} from "@/components/editor/graphCanvasLayout";
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
    documentId: "doc-alpha",
    id: "section:doc-alpha:intro",
    kind: "section",
    label: "Intro",
  },
  {
    documentId: "doc-alpha",
    id: "image:doc-alpha:diagram",
    kind: "image",
    label: "System Diagram",
  },
];

const edges: KnowledgeGraphEdge[] = [
  {
    description: "Alpha references Beta.",
    group: "reference",
    id: "edge-ref",
    kind: "references",
    sourceDocumentId: "doc-alpha",
    sourceId: "doc:alpha",
    targetDocumentId: "doc-beta",
    targetId: "doc:beta",
    weight: 2,
  },
  {
    description: "Alpha contains Intro.",
    group: "containment",
    id: "edge-sec",
    kind: "contains_section",
    sourceDocumentId: "doc-alpha",
    sourceId: "doc:alpha",
    targetDocumentId: "doc-alpha",
    targetId: "section:doc-alpha:intro",
    weight: 1,
  },
  {
    description: "Alpha contains image.",
    group: "containment",
    id: "edge-img",
    kind: "contains_image",
    sourceDocumentId: "doc-alpha",
    sourceId: "doc:alpha",
    targetDocumentId: "doc-alpha",
    targetId: "image:doc-alpha:diagram",
    weight: 1,
  },
];

describe("graphCanvasLayout", () => {
  it("keeps nodes inside the canvas bounds", () => {
    const positions = buildGraphNodeLayout({
      edges,
      nodes,
      selectedNodeId: "doc:alpha",
    });

    for (const position of positions.values()) {
      expect(position.x).toBeGreaterThan(0);
      expect(position.x).toBeLessThan(GRAPH_CANVAS_WIDTH);
      expect(position.y).toBeGreaterThan(0);
      expect(position.y).toBeLessThan(GRAPH_CANVAS_HEIGHT);
    }
  });

  it("places the selected node in the center and offsets labels by angle", () => {
    const positions = buildGraphNodeLayout({
      edges,
      nodes,
      selectedNodeId: "doc:alpha",
    });

    const selected = positions.get("doc:alpha");
    const neighbor = positions.get("doc:beta");

    expect(selected).toEqual(expect.objectContaining({
      textAnchor: "middle",
      x: GRAPH_CANVAS_WIDTH / 2,
      y: GRAPH_CANVAS_HEIGHT / 2,
    }));
    expect(neighbor?.labelX).not.toBe(neighbor?.x);
  });
});
