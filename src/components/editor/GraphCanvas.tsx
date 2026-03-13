import { useEffect, useMemo, useRef, useState } from "react";
import { LocateFixed, Maximize2, Minimize2, X, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useI18n } from "@/i18n/useI18n";
import {
  buildGraphNodeLayout,
  type GraphLayoutMode,
  GRAPH_CANVAS_CENTER_X,
  GRAPH_CANVAS_CENTER_Y,
  GRAPH_CANVAS_HEIGHT,
  GRAPH_CANVAS_WIDTH,
} from "@/components/editor/graphCanvasLayout";
import {
  edgeFilterKey,
  edgeKindLabelKey,
  issueKindLabelKey,
  nodeFilterKey,
  toGraphNavigationTarget,
} from "@/components/editor/workspaceGraphUtils";
import { cn } from "@/lib/utils";
import type {
  KnowledgeGraphEdge,
  KnowledgeGraphNavigationTarget,
  KnowledgeGraphNode,
} from "@/lib/knowledge/workspaceInsights";
import type { WorkspaceScale } from "@/lib/knowledge/workspaceScale";

const CANVAS_WIDTH = GRAPH_CANVAS_WIDTH;
const CANVAS_HEIGHT = GRAPH_CANVAS_HEIGHT;
const CENTER_X = GRAPH_CANVAS_CENTER_X;
const CENTER_Y = GRAPH_CANVAS_CENTER_Y;
const CANVAS_HEIGHT_MIN = 260;
const CANVAS_HEIGHT_MAX = 1000;
const MINIMAP_WIDTH = 150;
const MINIMAP_HEIGHT = 96;

const CANVAS_HEIGHT_PRESETS = {
  compact: 280,
  default: 360,
  expanded: 720,
} as const;

type CanvasSizePreset = keyof typeof CANVAS_HEIGHT_PRESETS;

type Point = { x: number; y: number };
type HoverTarget =
  | { id: string; type: "edge" }
  | { id: string; type: "node" }
  | null;

interface GraphCanvasProps {
  edges: KnowledgeGraphEdge[];
  layoutMode?: GraphLayoutMode;
  nodes: KnowledgeGraphNode[];
  onOpenDocument: (target: KnowledgeGraphNavigationTarget) => void;
  onSelectNode: (nodeId: string) => void;
  selectedNodeId: string | null;
  workspaceScale?: WorkspaceScale;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const toFiniteNumber = (value: number, fallback = 0) => (Number.isFinite(value) ? value : fallback);

const getNodeRadius = (node: KnowledgeGraphNode, selectedNodeId: string | null) => {
  const baseRadius = node.kind === "document" ? 22 : node.kind === "section" ? 16 : 14;

  return node.id === selectedNodeId ? baseRadius + 4 : baseRadius;
};

const getNodeColors = (node: KnowledgeGraphNode) => {
  if (node.issueSeverity === "warning") {
    return {
      fill: "#f59e0b",
      stroke: "#b45309",
      text: "#111827",
    };
  }

  if (node.kind === "document") {
    return {
      fill: "#60a5fa",
      stroke: "#2563eb",
      text: "#0f172a",
    };
  }

  if (node.kind === "image") {
    return {
      fill: "#c4b5fd",
      stroke: "#7c3aed",
      text: "#1f2937",
    };
  }

  return {
    fill: "#cbd5e1",
    stroke: "#64748b",
    text: "#1f2937",
  };
};

const getEdgeStyle = (edge: KnowledgeGraphEdge, selectedNodeId: string | null) => {
  const isSelectedConnection = selectedNodeId
    ? edge.sourceId === selectedNodeId || edge.targetId === selectedNodeId
    : false;

  switch (edge.group) {
    case "issue":
      return {
        dashArray: "6 4",
        markerId: "graph-canvas-arrow-issue",
        opacity: isSelectedConnection ? 1 : 0.7,
        stroke: "#f59e0b",
        strokeWidth: isSelectedConnection ? 3 : 2.2,
      };
    case "reference":
      return {
        dashArray: undefined,
        markerId: "graph-canvas-arrow-reference",
        opacity: isSelectedConnection ? 0.95 : 0.65,
        stroke: "#2563eb",
        strokeWidth: isSelectedConnection ? 2.8 : 2.1,
      };
    case "similarity":
      return {
        dashArray: "5 5",
        markerId: undefined,
        opacity: isSelectedConnection ? 0.85 : 0.5,
        stroke: "#8b5cf6",
        strokeWidth: isSelectedConnection ? 2.6 : 1.9,
      };
    default:
      return {
        dashArray: "3 5",
        markerId: undefined,
        opacity: isSelectedConnection ? 0.65 : 0.35,
        stroke: "#94a3b8",
        strokeWidth: isSelectedConnection ? 2 : 1.4,
      };
  }
};

const LegendNodeSwatch = ({
  fill,
  stroke,
}: {
  fill: string;
  stroke: string;
}) => (
  <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16">
    <circle cx="8" cy="8" fill={fill} r="5.25" stroke={stroke} strokeWidth="1.75" />
  </svg>
);

const LegendEdgeSwatch = ({
  dashArray,
  showArrow,
  stroke,
}: {
  dashArray?: string;
  showArrow?: boolean;
  stroke: string;
}) => (
  <svg aria-hidden="true" className="h-3.5 w-14 shrink-0" viewBox="0 0 56 14">
    <path
      d="M4 7 Q 26 1 48 7"
      fill="none"
      stroke={stroke}
      strokeDasharray={dashArray}
      strokeWidth="2.25"
    />
    {showArrow && <path d="M46 4.2 L52 7 L46 9.8 Z" fill={stroke} />}
  </svg>
);

const GraphCanvas = ({
  edges,
  layoutMode = "selected",
  nodes,
  onOpenDocument,
  onSelectNode,
  selectedNodeId,
  workspaceScale = "small",
}: GraphCanvasProps) => {
  const { t } = useI18n();
  const [canvasHeight, setCanvasHeight] = useState(CANVAS_HEIGHT_PRESETS.default);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [dragOrigin, setDragOrigin] = useState<Point | null>(null);
  const [isMinimapDragging, setIsMinimapDragging] = useState(false);
  const [hoverTarget, setHoverTarget] = useState<HoverTarget>(null);
  const minimapDraggingRef = useRef(false);
  const layoutSelectedNodeId = layoutMode === "selected" ? selectedNodeId : null;
  const simplifyLargeVisuals = workspaceScale === "large";

  const positions = useMemo(
    () => buildGraphNodeLayout({ edges, layoutMode, nodes, selectedNodeId: layoutSelectedNodeId }),
    [edges, layoutMode, layoutSelectedNodeId, nodes],
  );
  const nodeById = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes],
  );
  const edgeById = useMemo(
    () => new Map(edges.map((edge) => [edge.id, edge])),
    [edges],
  );
  const hoveredNode = hoverTarget?.type === "node"
    ? nodeById.get(hoverTarget.id) || null
    : null;
  const hoveredEdge = hoverTarget?.type === "edge"
    ? edgeById.get(hoverTarget.id) || null
    : null;
  const legendNodeItems = [
    {
      fill: "#60a5fa",
      label: t("knowledge.graphNodeDocument"),
      stroke: "#2563eb",
    },
    {
      fill: "#cbd5e1",
      label: t("knowledge.graphNodeSection"),
      stroke: "#64748b",
    },
    {
      fill: "#c4b5fd",
      label: t("knowledge.graphNodeImage"),
      stroke: "#7c3aed",
    },
    {
      fill: "#f59e0b",
      label: t("knowledge.graphCanvasLegendIssueNode"),
      stroke: "#b45309",
    },
  ];
  const legendEdgeItems = [
    {
      dashArray: undefined,
      label: t("knowledge.graphEdgeReferences"),
      showArrow: true,
      stroke: "#2563eb",
    },
    {
      dashArray: "3 5",
      label: t("knowledge.graphFilterContainment"),
      showArrow: false,
      stroke: "#94a3b8",
    },
    {
      dashArray: "5 5",
      label: t("knowledge.graphEdgeSimilar"),
      showArrow: false,
      stroke: "#8b5cf6",
    },
    {
      dashArray: "6 4",
      label: t("knowledge.graphEdgeIssue"),
      showArrow: true,
      stroke: "#f59e0b",
    },
  ];

  const resetView = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  const handleZoom = (delta: number) => {
    setScale((current) => clamp(Number((current + delta).toFixed(2)), 0.6, 2.4));
  };

  const activePreset = (Object.entries(CANVAS_HEIGHT_PRESETS).find(([, value]) => value === canvasHeight)?.[0] || null) as CanvasSizePreset | null;
  const minimapViewport = {
    height: Math.min(MINIMAP_HEIGHT, Math.max(18, (CANVAS_HEIGHT / scale / CANVAS_HEIGHT) * MINIMAP_HEIGHT)),
    width: Math.min(MINIMAP_WIDTH, Math.max(24, (CANVAS_WIDTH / scale / CANVAS_WIDTH) * MINIMAP_WIDTH)),
    x: clamp((-pan.x / scale / CANVAS_WIDTH) * MINIMAP_WIDTH, 0, MINIMAP_WIDTH),
    y: clamp((-pan.y / scale / CANVAS_HEIGHT) * MINIMAP_HEIGHT, 0, MINIMAP_HEIGHT),
  };
  const recenterFromMinimapPoint = (point: Point) => {
    const normalizedX = point.x / MINIMAP_WIDTH;
    const normalizedY = point.y / MINIMAP_HEIGHT;
    const targetX = normalizedX * CANVAS_WIDTH;
    const targetY = normalizedY * CANVAS_HEIGHT;

    setPan({
      x: CENTER_X - targetX * scale,
      y: CENTER_Y - targetY * scale,
    });
  };
  const updateMinimapViewport = (
    currentTarget: SVGSVGElement,
    clientX: number,
    clientY: number,
  ) => {
    const rect = currentTarget.getBoundingClientRect();
    const offsetX = clamp(
      toFiniteNumber(clientX) - toFiniteNumber(rect.left),
      0,
      MINIMAP_WIDTH,
    );
    const offsetY = clamp(
      toFiniteNumber(clientY) - toFiniteNumber(rect.top),
      0,
      MINIMAP_HEIGHT,
    );

    recenterFromMinimapPoint({
      x: offsetX,
      y: offsetY,
    });
  };
  const stopMinimapDrag = () => {
    minimapDraggingRef.current = false;
    setIsMinimapDragging(false);
  };

  useEffect(() => {
    if (!isFullscreen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFullscreen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  const canvasContent = (
    <div className="space-y-3 rounded-lg border border-border/60 bg-background/70 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {t("knowledge.graphCanvasTitle")}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("knowledge.graphCanvasDescription")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <div className="rounded-md border border-border/60 bg-background/70 px-2.5 py-1.5 text-[11px] text-muted-foreground">
            {t("knowledge.graphCanvasHeightValue", { value: canvasHeight })}
          </div>
          <Button
            className="h-7 px-2 text-[11px]"
            onClick={() => handleZoom(-0.2)}
            size="sm"
            type="button"
            variant="ghost"
          >
            <ZoomOut className="h-3.5 w-3.5" />
            {t("knowledge.graphZoomOut")}
          </Button>
          <Button
            className="h-7 px-2 text-[11px]"
            onClick={() => handleZoom(0.2)}
            size="sm"
            type="button"
            variant="ghost"
          >
            <ZoomIn className="h-3.5 w-3.5" />
            {t("knowledge.graphZoomIn")}
          </Button>
          <Button
            className="h-7 px-2 text-[11px]"
            onClick={resetView}
            size="sm"
            type="button"
            variant="outline"
          >
            <LocateFixed className="h-3.5 w-3.5" />
            {t("knowledge.graphCenterView")}
          </Button>
          <Button
            className="h-7 px-2 text-[11px]"
            onClick={() => setIsFullscreen((current) => !current)}
            size="sm"
            type="button"
            variant={isFullscreen ? "secondary" : "outline"}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            {t(isFullscreen ? "knowledge.graphExitFullscreen" : "knowledge.graphFullscreen")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-border/60 bg-muted/20 px-3 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {t("knowledge.graphCanvasSizeLabel")}
          </div>
          <div className="flex flex-wrap gap-2">
            {(["compact", "default", "expanded"] as CanvasSizePreset[]).map((preset) => (
              <Button
                className="h-7 px-2 text-[11px]"
                key={preset}
                onClick={() => setCanvasHeight(CANVAS_HEIGHT_PRESETS[preset])}
                size="sm"
                type="button"
                variant={activePreset === preset ? "secondary" : "ghost"}
              >
                {t(`knowledge.graphCanvasSize${preset[0].toUpperCase()}${preset.slice(1)}`)}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground">{CANVAS_HEIGHT_MIN}px</span>
          <Slider
            aria-label={t("knowledge.graphCanvasSizeLabel")}
            className="flex-1"
            max={CANVAS_HEIGHT_MAX}
            min={CANVAS_HEIGHT_MIN}
            onValueChange={(value) => {
              const nextValue = value[0];

              if (typeof nextValue === "number") {
                setCanvasHeight(nextValue);
              }
            }}
            step={10}
            value={[canvasHeight]}
          />
          <span className="text-[10px] text-muted-foreground">{CANVAS_HEIGHT_MAX}px</span>
        </div>
      </div>

      <div
        className={cn(
          "relative overflow-hidden rounded-md border border-border/60 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_42%),linear-gradient(180deg,_rgba(15,23,42,0.02),_transparent)]",
          dragOrigin ? "cursor-grabbing" : "cursor-grab",
        )}
      >
        <svg
          aria-label={t("knowledge.graphCanvasTitle")}
          className="w-full"
          data-testid="graph-canvas-svg"
          onPointerDown={(event) => {
            if ((event.target as Element).closest("[data-node-id]")) {
              return;
            }

            setDragOrigin({
              x: event.clientX - pan.x,
              y: event.clientY - pan.y,
            });
          }}
          onPointerLeave={() => setDragOrigin(null)}
          onPointerMove={(event) => {
            if (!dragOrigin) {
              return;
            }

            setPan({
              x: event.clientX - dragOrigin.x,
              y: event.clientY - dragOrigin.y,
            });
          }}
          onPointerUp={() => setDragOrigin(null)}
          style={{ height: `${canvasHeight}px` }}
          viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
        >
          <defs>
            <pattern height="32" id="graph-canvas-grid" patternUnits="userSpaceOnUse" width="32">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="1" />
            </pattern>
            <marker id="graph-canvas-arrow-reference" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
              <path d="M0,0 L8,4 L0,8 Z" fill="#2563eb" />
            </marker>
            <marker id="graph-canvas-arrow-issue" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
              <path d="M0,0 L8,4 L0,8 Z" fill="#f59e0b" />
            </marker>
          </defs>

          <rect fill="url(#graph-canvas-grid)" height={CANVAS_HEIGHT} width={CANVAS_WIDTH} x="0" y="0" />

          <g transform={`translate(${pan.x} ${pan.y}) scale(${scale})`}>
            {edges.map((edge) => {
              const source = positions.get(edge.sourceId);
              const target = positions.get(edge.targetId);

              if (!source || !target) {
                return null;
              }

              const style = getEdgeStyle(edge, selectedNodeId);
              const midX = (source.x + target.x) / 2;
              const midY = (source.y + target.y) / 2;
              const controlOffset = edge.group === "similarity" ? 20 : edge.group === "issue" ? 14 : 8;
              const path = `M ${source.x} ${source.y} Q ${midX} ${midY - controlOffset} ${target.x} ${target.y}`;

              return (
                <path
                  data-testid={`graph-canvas-edge-${edge.id}`}
                  d={path}
                  fill="none"
                  key={edge.id}
                  markerEnd={style.markerId ? `url(#${style.markerId})` : undefined}
                  onMouseEnter={() => setHoverTarget({ id: edge.id, type: "edge" })}
                  onMouseLeave={() => setHoverTarget((current) =>
                    current?.type === "edge" && current.id === edge.id ? null : current)}
                  opacity={style.opacity}
                  stroke={style.stroke}
                  strokeDasharray={style.dashArray}
                  strokeWidth={style.strokeWidth}
                />
              );
            })}

            {nodes.map((node) => {
              const position = positions.get(node.id);

              if (!position) {
                return null;
              }

              const colors = getNodeColors(node);
              const radius = getNodeRadius(node, selectedNodeId);
              const isSelected = node.id === selectedNodeId;
              const shouldRenderLabel = !simplifyLargeVisuals || isSelected || node.issueSeverity === "warning";
              const labelY = position.y + radius + 16;

              return (
                <g
                  data-node-id={node.id}
                  data-testid={`graph-canvas-node-${node.id}`}
                  key={node.id}
                  onMouseEnter={() => setHoverTarget({ id: node.id, type: "node" })}
                  onMouseLeave={() => setHoverTarget((current) =>
                    current?.type === "node" && current.id === node.id ? null : current)}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectNode(node.id);
                  }}
                  onDoubleClick={(event) => {
                    event.stopPropagation();
                    onOpenDocument(toGraphNavigationTarget(node));
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <circle
                    cx={position.x}
                    cy={position.y}
                    fill={colors.fill}
                    opacity={isSelected ? 1 : 0.92}
                    r={radius}
                    stroke={isSelected ? "#0f172a" : colors.stroke}
                    strokeWidth={isSelected ? 3.2 : 2}
                  />
                  {(node.issueCount || 0) > 0 && (
                    <>
                      <circle
                        cx={position.x + radius - 4}
                        cy={position.y - radius + 4}
                        fill="#7f1d1d"
                        r="8"
                        stroke="#fef2f2"
                        strokeWidth="1.5"
                      />
                      <text
                        fill="#ffffff"
                        fontSize="9"
                        fontWeight="700"
                        textAnchor="middle"
                        x={position.x + radius - 4}
                        y={position.y - radius + 7}
                      >
                        !
                      </text>
                    </>
                  )}
                  {shouldRenderLabel && (
                    <text
                      fill={colors.text}
                      fontSize={node.kind === "document" ? "11" : "10"}
                      fontWeight={isSelected ? "700" : "600"}
                      textAnchor={position.textAnchor}
                      x={position.labelX}
                      y={position.labelY}
                    >
                      {node.label.length > 22 ? `${node.label.slice(0, 21)}...` : node.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {(hoveredNode || hoveredEdge) && (
          <div
            className="pointer-events-none absolute left-2 top-2 max-w-[320px] rounded-md border border-border/60 bg-background/90 px-3 py-2 text-[11px] shadow-sm backdrop-blur-sm"
            data-testid="graph-canvas-hover-card"
          >
            <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {t(hoveredNode ? "knowledge.graphHoverNodeTitle" : "knowledge.graphHoverEdgeTitle")}
            </div>
            {hoveredNode && (
              <>
                <div className="mt-1 text-sm font-medium text-foreground">
                  {hoveredNode.label}
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  <span>{t(nodeFilterKey(hoveredNode.kind))}</span>
                  {(hoveredNode.issueCount || 0) > 0 && (
                    <span>{t("knowledge.graphHoverIssueCount", { count: hoveredNode.issueCount || 0 })}</span>
                  )}
                  {hoveredNode.dominantIssueKind && (
                    <span>{t(issueKindLabelKey(hoveredNode.dominantIssueKind))}</span>
                  )}
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">
                  {t("knowledge.graphHoverOpenHint")}
                </div>
              </>
            )}
            {hoveredEdge && (
              <>
                <div className="mt-1 text-sm font-medium text-foreground">
                  {t(edgeKindLabelKey(hoveredEdge))}
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  <span>{t(edgeFilterKey(hoveredEdge.group))}</span>
                  <span>
                    {t("knowledge.graphHoverRelated", {
                      source: nodeById.get(hoveredEdge.sourceId)?.label || hoveredEdge.sourceId,
                      target: nodeById.get(hoveredEdge.targetId)?.label || hoveredEdge.targetId,
                    })}
                  </span>
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">
                  {hoveredEdge.description}
                </div>
              </>
            )}
          </div>
        )}

        <div className="pointer-events-none absolute bottom-2 left-2 grid gap-2 text-[10px] text-muted-foreground sm:max-w-[320px]">
          <div
            className="rounded-md border border-border/60 bg-background/85 px-3 py-2 shadow-sm"
            data-testid="graph-canvas-legend"
          >
            <div className="font-medium text-foreground">{t("knowledge.graphCanvasLegendTitle")}</div>
            <div className="mt-2 grid gap-2">
              <div className="grid gap-1">
                <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  {t("knowledge.graphCanvasLegendNodes")}
                </div>
                <div className="grid gap-1">
                  {legendNodeItems.map((item) => (
                    <div className="flex items-center gap-2" key={item.label}>
                      <LegendNodeSwatch fill={item.fill} stroke={item.stroke} />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-1">
                <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  {t("knowledge.graphCanvasLegendEdges")}
                </div>
                <div className="grid gap-1">
                  {legendEdgeItems.map((item) => (
                    <div className="flex items-center gap-2" key={item.label}>
                      <LegendEdgeSwatch
                        dashArray={item.dashArray}
                        showArrow={item.showArrow}
                        stroke={item.stroke}
                      />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-1">
                <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  {t("knowledge.graphCanvasLegendGestures")}
                </div>
                <div className="grid gap-1">
                  <span>{t("knowledge.graphCanvasLegendPrimary")}</span>
                  <span>{t("knowledge.graphCanvasLegendOpen")}</span>
                  <span>{t("knowledge.graphCanvasLegendHover")}</span>
                  <span>{t("knowledge.graphCanvasLegendIssue")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute right-2 top-2 rounded-md border border-border/60 bg-background/85 p-2 shadow-sm">
          <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {t("knowledge.graphMiniMapTitle")}
          </div>
          <svg
            aria-label={t("knowledge.graphMiniMapTitle")}
            className={cn(
              "rounded-sm border border-border/50 bg-muted/20",
              isMinimapDragging ? "cursor-grabbing" : "cursor-crosshair",
            )}
            data-testid="graph-canvas-minimap"
            height={MINIMAP_HEIGHT}
            onPointerCancel={(event) => {
              stopMinimapDrag();
              event.currentTarget.releasePointerCapture?.(event.pointerId);
            }}
            onPointerDown={(event) => {
              minimapDraggingRef.current = true;
              setIsMinimapDragging(true);
              event.currentTarget.setPointerCapture?.(event.pointerId);
              updateMinimapViewport(event.currentTarget, event.clientX, event.clientY);
            }}
            onPointerLeave={() => {
              stopMinimapDrag();
            }}
            onPointerMove={(event) => {
              if (!minimapDraggingRef.current) {
                return;
              }

              updateMinimapViewport(event.currentTarget, event.clientX, event.clientY);
            }}
            onPointerUp={(event) => {
              stopMinimapDrag();
              event.currentTarget.releasePointerCapture?.(event.pointerId);
            }}
            viewBox={`0 0 ${MINIMAP_WIDTH} ${MINIMAP_HEIGHT}`}
            width={MINIMAP_WIDTH}
          >
            {!simplifyLargeVisuals && edges.map((edge) => {
              const source = positions.get(edge.sourceId);
              const target = positions.get(edge.targetId);

              if (!source || !target) {
                return null;
              }

              return (
                <line
                  key={`minimap-${edge.id}`}
                  opacity={edge.group === "issue" ? 0.7 : 0.35}
                  stroke={edge.group === "issue" ? "#f59e0b" : "#94a3b8"}
                  strokeWidth={edge.group === "issue" ? 1.2 : 0.8}
                  x1={(source.x / CANVAS_WIDTH) * MINIMAP_WIDTH}
                  x2={(target.x / CANVAS_WIDTH) * MINIMAP_WIDTH}
                  y1={(source.y / CANVAS_HEIGHT) * MINIMAP_HEIGHT}
                  y2={(target.y / CANVAS_HEIGHT) * MINIMAP_HEIGHT}
                />
              );
            })}
            {nodes.map((node) => {
              const position = positions.get(node.id);

              if (!position) {
                return null;
              }

              return (
                <circle
                  cx={(position.x / CANVAS_WIDTH) * MINIMAP_WIDTH}
                  cy={(position.y / CANVAS_HEIGHT) * MINIMAP_HEIGHT}
                  fill={node.issueSeverity === "warning" ? "#f59e0b" : node.kind === "document" ? "#60a5fa" : node.kind === "image" ? "#c4b5fd" : "#cbd5e1"}
                  key={`minimap-node-${node.id}`}
                  r={node.id === selectedNodeId ? 3.2 : 2.2}
                  stroke={node.id === selectedNodeId ? "#0f172a" : "none"}
                  strokeWidth={node.id === selectedNodeId ? 1 : 0}
                />
              );
            })}
            <rect
              data-testid="graph-canvas-minimap-viewport"
              fill="rgba(59,130,246,0.08)"
              height={Math.min(minimapViewport.height, MINIMAP_HEIGHT - minimapViewport.y)}
              stroke="#2563eb"
              strokeWidth="1.2"
              width={Math.min(minimapViewport.width, MINIMAP_WIDTH - minimapViewport.x)}
              x={minimapViewport.x}
              y={minimapViewport.y}
            />
          </svg>
          <div className="mt-1 max-w-[150px] text-[10px] text-muted-foreground">
            {t("knowledge.graphMiniMapHint")}
          </div>
        </div>
      </div>
    </div>
  );

  if (isFullscreen) {
    return (
      <div
        className="fixed inset-0 z-[70] bg-background/95 p-4 backdrop-blur-sm sm:p-6"
        data-testid="graph-canvas-fullscreen"
      >
        <div className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-border/60 bg-background shadow-2xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="text-sm font-medium text-foreground">
              {t("knowledge.graphCanvasFullscreenTitle")}
            </div>
            <Button
              className="h-8 px-2 text-[11px]"
              onClick={() => setIsFullscreen(false)}
              size="sm"
              type="button"
              variant="outline"
            >
              <X className="h-3.5 w-3.5" />
              {t("knowledge.graphExitFullscreen")}
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-4">
            {canvasContent}
          </div>
        </div>
      </div>
    );
  }

  return canvasContent;
};

export default GraphCanvas;
