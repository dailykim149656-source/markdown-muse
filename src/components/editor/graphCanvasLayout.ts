import type {
  KnowledgeGraphEdge,
  KnowledgeGraphNode,
} from "@/lib/knowledge/workspaceInsights";

export const GRAPH_CANVAS_WIDTH = 860;
export const GRAPH_CANVAS_HEIGHT = 360;
export const GRAPH_CANVAS_CENTER_X = GRAPH_CANVAS_WIDTH / 2;
export const GRAPH_CANVAS_CENTER_Y = GRAPH_CANVAS_HEIGHT / 2;
const GRAPH_LAYOUT_PADDING = 52;

export type GraphLayoutPoint = {
  angle: number;
  labelX: number;
  labelY: number;
  textAnchor: "end" | "middle" | "start";
  x: number;
  y: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const toPolarPoint = (radius: number, index: number, total: number, offsetRadians = -Math.PI / 2) => {
  if (total <= 0) {
    return {
      angle: -Math.PI / 2,
      x: GRAPH_CANVAS_CENTER_X,
      y: GRAPH_CANVAS_CENTER_Y,
    };
  }

  const angle = offsetRadians + ((Math.PI * 2) / total) * index;

  return {
    angle,
    x: GRAPH_CANVAS_CENTER_X + Math.cos(angle) * radius,
    y: GRAPH_CANVAS_CENTER_Y + Math.sin(angle) * radius,
  };
};

const clampPoint = (point: { angle: number; x: number; y: number }) => ({
  ...point,
  x: clamp(point.x, GRAPH_LAYOUT_PADDING, GRAPH_CANVAS_WIDTH - GRAPH_LAYOUT_PADDING),
  y: clamp(point.y, GRAPH_LAYOUT_PADDING, GRAPH_CANVAS_HEIGHT - GRAPH_LAYOUT_PADDING),
});

const withLabelPlacement = (point: { angle: number; x: number; y: number }, selectedNodeId: boolean): GraphLayoutPoint => {
  const angle = selectedNodeId ? Math.PI / 2 : point.angle;
  const distance = selectedNodeId ? 34 : 30;
  const labelX = point.x + Math.cos(angle) * distance;
  const labelY = point.y + Math.sin(angle) * distance + (selectedNodeId ? 0 : 2);
  const textAnchor = selectedNodeId
    ? "middle"
    : Math.cos(angle) > 0.35
      ? "start"
      : Math.cos(angle) < -0.35
        ? "end"
        : "middle";

  return {
    angle,
    labelX,
    labelY,
    textAnchor,
    x: point.x,
    y: point.y,
  };
};

const sortNodes = (left: KnowledgeGraphNode, right: KnowledgeGraphNode) =>
  Number(right.issueSeverity === "warning") - Number(left.issueSeverity === "warning")
  || Number(right.issueCount || 0) - Number(left.issueCount || 0)
  || left.kind.localeCompare(right.kind)
  || left.label.localeCompare(right.label);

const spreadRing = (
  positions: Map<string, GraphLayoutPoint>,
  nodeIds: string[],
  radius: number,
  offsetRadians: number,
) => {
  nodeIds.forEach((nodeId, index) => {
    const point = clampPoint(toPolarPoint(radius, index, nodeIds.length, offsetRadians));
    positions.set(nodeId, withLabelPlacement(point, false));
  });
};

export const buildGraphNodeLayout = ({
  edges,
  nodes,
  selectedNodeId,
}: {
  edges: KnowledgeGraphEdge[];
  nodes: KnowledgeGraphNode[];
  selectedNodeId: string | null;
}) => {
  const positions = new Map<string, GraphLayoutPoint>();
  const sortedNodes = [...nodes].sort((left, right) =>
    Number(right.id === selectedNodeId) - Number(left.id === selectedNodeId)
    || sortNodes(left, right));
  const nodeById = new Map(sortedNodes.map((node) => [node.id, node]));

  if (selectedNodeId && nodeById.has(selectedNodeId)) {
    positions.set(selectedNodeId, withLabelPlacement({
      angle: Math.PI / 2,
      x: GRAPH_CANVAS_CENTER_X,
      y: GRAPH_CANVAS_CENTER_Y,
    }, true));

    const neighborIds = Array.from(new Set(
      edges
        .filter((edge) => edge.sourceId === selectedNodeId || edge.targetId === selectedNodeId)
        .flatMap((edge) => [edge.sourceId, edge.targetId]),
    ))
      .filter((nodeId) => nodeId !== selectedNodeId)
      .sort((left, right) => sortNodes(nodeById.get(left)!, nodeById.get(right)!));

    const innerNeighbors = neighborIds.filter((nodeId) => {
      const node = nodeById.get(nodeId);
      return node?.kind === "section" || node?.kind === "image";
    });
    const outerNeighbors = neighborIds.filter((nodeId) => !innerNeighbors.includes(nodeId));

    spreadRing(positions, innerNeighbors, 96, -Math.PI / 2 + 0.3);
    spreadRing(positions, outerNeighbors, 164, -Math.PI / 2 - 0.15);

    const remainingNodes = sortedNodes.filter((node) => !positions.has(node.id));
    const ringConfigs = [
      { radius: 236, size: 8, offset: -Math.PI / 2 + 0.18 },
      { radius: 292, size: 10, offset: -Math.PI / 2 - 0.08 },
      { radius: 338, size: 12, offset: -Math.PI / 2 + 0.08 },
    ];
    let consumedCount = 0;

    ringConfigs.forEach((ringConfig) => {
      const ringNodes = remainingNodes.slice(consumedCount, consumedCount + ringConfig.size);
      spreadRing(positions, ringNodes.map((node) => node.id), ringConfig.radius, ringConfig.offset);
      consumedCount += ringNodes.length;
    });

    const overflowNodes = remainingNodes.slice(consumedCount);
    spreadRing(positions, overflowNodes.map((node) => node.id), 382, -Math.PI / 2 + 0.2);
    return positions;
  }

  const ringConfigs = [
    { radius: 120, size: 6, offset: -Math.PI / 2 + 0.1 },
    { radius: 190, size: 10, offset: -Math.PI / 2 - 0.06 },
    { radius: 252, size: 14, offset: -Math.PI / 2 + 0.12 },
  ];
  let consumedCount = 0;

  ringConfigs.forEach((ringConfig) => {
    const ringNodes = sortedNodes.slice(consumedCount, consumedCount + ringConfig.size);
    spreadRing(positions, ringNodes.map((node) => node.id), ringConfig.radius, ringConfig.offset);
    consumedCount += ringNodes.length;
  });

  const overflowNodes = sortedNodes.slice(consumedCount);
  spreadRing(positions, overflowNodes.map((node) => node.id), 320, -Math.PI / 2 + 0.15);
  return positions;
};
