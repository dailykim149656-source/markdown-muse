import { Suspense, lazy, useMemo, useState } from "react";
import { Boxes, GitBranch, ImageIcon, Maximize2, Network, Search, SquareStack } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import GraphFilterMenus from "@/components/editor/GraphFilterMenus";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useI18n } from "@/i18n/useI18n";
import {
  VALIDATED_REVIEW_MAX_EDGES,
  VALIDATED_REVIEW_MAX_NODES,
  resolveWorkspaceScale,
} from "@/lib/knowledge/workspaceScale";
import type {
  KnowledgeGraphEdge,
  KnowledgeGraphNavigationTarget,
  KnowledgeWorkspaceInsights,
} from "@/lib/knowledge/workspaceInsights";
import { useNavigate } from "react-router-dom";
import {
  type EdgeFilter,
  type GraphMode,
  type IssueFilter,
  type NodeFilter,
  applyGraphMode,
  applyIssueFilter,
  edgeBadgeVariant,
  edgeGroupOrder,
  edgeKindLabelKey,
  issueKindLabelKey,
  nodeKindOrder,
  nodeFilterKey,
  toGraphNavigationTarget,
} from "@/components/editor/workspaceGraphUtils";

const GraphExplorerSurface = lazy(() =>
  import("@/components/editor/GraphExplorerDialog").then((module) => ({
    default: module.GraphExplorerSurface,
  })),
);

const GraphDialogFallback = () => null;

interface WorkspaceGraphPanelProps {
  activeDocumentId?: string;
  insights: KnowledgeWorkspaceInsights;
  onOpenDocument: (target: KnowledgeGraphNavigationTarget) => void;
}

const WorkspaceGraphPanel = ({
  activeDocumentId,
  insights,
  onOpenDocument,
}: WorkspaceGraphPanelProps) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [graphMode, setGraphMode] = useState<GraphMode>("full");
  const [issueFilter, setIssueFilter] = useState<IssueFilter>("all");
  const [nodeFilter, setNodeFilter] = useState<NodeFilter>("all");
  const [edgeFilter, setEdgeFilter] = useState<EdgeFilter>("all");
  const [query, setQuery] = useState("");
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [explorerSelectedNodeId, setExplorerSelectedNodeId] = useState<string | null>(null);
  const workspaceScale = useMemo(() => resolveWorkspaceScale(
    insights.summary.documentNodeCount + insights.summary.sectionNodeCount + insights.summary.imageNodeCount,
    insights.summary.edgeCount,
  ), [insights.summary.documentNodeCount, insights.summary.edgeCount, insights.summary.imageNodeCount, insights.summary.sectionNodeCount]);

  const nodeById = useMemo(
    () => new Map(insights.nodes.map((node) => [node.id, node])),
    [insights.nodes],
  );

  const baseNodes = useMemo(
    () => insights.nodes
      .filter((node) =>
        (nodeFilter === "all" || node.kind === nodeFilter)
        && (!issuesOnly || (node.issueCount || 0) > 0))
      .sort((left, right) =>
        nodeKindOrder[left.kind] - nodeKindOrder[right.kind]
        || Number(right.issueSeverity === "warning") - Number(left.issueSeverity === "warning")
        || (right.issueCount || 0) - (left.issueCount || 0)
        || left.label.localeCompare(right.label)),
    [insights.nodes, issuesOnly, nodeFilter],
  );

  const baseNodeIds = useMemo(
    () => new Set(baseNodes.map((node) => node.id)),
    [baseNodes],
  );

  const baseEdges = useMemo(
    () => insights.edges
      .filter((edge) =>
        (edgeFilter === "all" || edge.group === edgeFilter)
        && baseNodeIds.has(edge.sourceId)
        && baseNodeIds.has(edge.targetId))
      .sort((left, right) =>
        edgeGroupOrder[left.group] - edgeGroupOrder[right.group]
        || right.weight - left.weight
        || left.description.localeCompare(right.description)),
    [baseNodeIds, edgeFilter, insights.edges],
  );

  const filteredGraph = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return {
        edges: baseEdges,
        nodes: baseNodes,
      };
    }

    const directlyMatchedNodeIds = new Set(
      baseNodes
        .filter((node) => node.label.toLowerCase().includes(normalizedQuery))
        .map((node) => node.id),
    );
    const matchedNodeIds = new Set(directlyMatchedNodeIds);
    const matchedEdgeIds = new Set<string>();

    for (const edge of baseEdges) {
      const sourceLabel = nodeById.get(edge.sourceId)?.label || "";
      const targetLabel = nodeById.get(edge.targetId)?.label || "";
      const edgeMatches = [
        edge.description,
        sourceLabel,
        targetLabel,
      ].join(" ").toLowerCase().includes(normalizedQuery);

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
      edges: baseEdges.filter((edge) => matchedEdgeIds.has(edge.id)),
      nodes: baseNodes.filter((node) => matchedNodeIds.has(node.id)),
    };
  }, [baseEdges, baseNodes, nodeById, query]);

  const issueFilteredGraph = useMemo(
    () => applyIssueFilter({
      graph: filteredGraph,
      issues: insights.issues,
      value: issueFilter,
    }),
    [filteredGraph, insights.issues, issueFilter],
  );

  const modeGraph = useMemo(
    () => applyGraphMode({
      activeDocumentId,
      graph: issueFilteredGraph,
      mode: graphMode,
    }),
    [activeDocumentId, graphMode, issueFilteredGraph],
  );

  const visibleNodes = modeGraph.nodes;
  const visibleEdges = modeGraph.edges;
  const hasQuery = query.trim().length > 0;
  const emptyMessage = graphMode === "issues"
    ? t("knowledge.graphIssuesEmpty")
    : hasQuery
      ? t("knowledge.graphSearchEmpty")
      : t("knowledge.graphEmpty");

  const visibleNodeCount = visibleNodes.length;
  const visibleEdgeCount = visibleEdges.length;

  const maxNodeCardCount = hasQuery ? 16 : 12;
  const hasMoreNodeCards = visibleNodeCount > maxNodeCardCount;
  const remainingNodeCardCount = visibleNodeCount - maxNodeCardCount;
  const activeDocumentNode = useMemo(
    () => activeDocumentId
      ? insights.nodes.find((node) => node.kind === "document" && node.documentId === activeDocumentId) || null
      : null,
    [activeDocumentId, insights.nodes],
  );

  const connectionSummary = useMemo(() => {
    const incoming = new Map<string, number>();
    const outgoing = new Map<string, number>();

    for (const edge of visibleEdges) {
      outgoing.set(edge.sourceId, (outgoing.get(edge.sourceId) || 0) + 1);
      incoming.set(edge.targetId, (incoming.get(edge.targetId) || 0) + 1);
    }

    return { incoming, outgoing };
  }, [visibleEdges]);

  const visibleNodeCards = useMemo(
    () => visibleNodes
      .map((node) => {
        const connectedEdges = visibleEdges.filter((edge) =>
          edge.sourceId === node.id || edge.targetId === node.id);
        const previewEdges = connectedEdges.slice(0, 4);

        return {
          incoming: connectionSummary.incoming.get(node.id) || 0,
          node,
          outgoing: connectionSummary.outgoing.get(node.id) || 0,
          previewEdges,
          totalConnections: connectedEdges.length,
        };
      })
      .sort((left, right) =>
        nodeKindOrder[left.node.kind] - nodeKindOrder[right.node.kind]
        || Number(right.node.issueSeverity === "warning") - Number(left.node.issueSeverity === "warning")
        || right.totalConnections - left.totalConnections
        || (right.node.issueCount || 0) - (left.node.issueCount || 0)
        || left.node.label.localeCompare(right.node.label))
      .slice(0, maxNodeCardCount),
    [connectionSummary.incoming, connectionSummary.outgoing, maxNodeCardCount, visibleEdges, visibleNodes],
  );

  return (
    <div className="space-y-3 group-data-[collapsible=icon]:hidden">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Network className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">{t("knowledge.graphTitle")}</span>
          </div>
          <Button
            className="h-6 gap-1 px-2 text-[10px]"
            onClick={() => navigate("/editor/graph")}
            size="sm"
            type="button"
            variant="outline"
          >
            <Maximize2 className="h-3 w-3" />
            {t("knowledge.graphExplore")}
          </Button>
        </div>
        <p className="text-[11px] leading-4 text-muted-foreground">
          {t("knowledge.graphDescription")}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-md border border-border/60 px-2 py-1.5">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Boxes className="h-3 w-3" />
            {t("knowledge.graphDocuments")}
          </div>
          <div className="mt-1 text-sm font-semibold text-foreground">{insights.summary.documentNodeCount}</div>
        </div>
        <div className="rounded-md border border-border/60 px-2 py-1.5">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <SquareStack className="h-3 w-3" />
            {t("knowledge.graphSections")}
          </div>
          <div className="mt-1 text-sm font-semibold text-foreground">{insights.summary.sectionNodeCount}</div>
        </div>
        <div className="rounded-md border border-border/60 px-2 py-1.5">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <ImageIcon className="h-3 w-3" />
            {t("knowledge.images")}
          </div>
          <div className="mt-1 text-sm font-semibold text-foreground">{insights.summary.imageNodeCount}</div>
        </div>
        <div className="rounded-md border border-border/60 px-2 py-1.5">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <GitBranch className="h-3 w-3" />
            {t("knowledge.graphLinks")}
          </div>
          <div className="mt-1 text-sm font-semibold text-foreground">{insights.summary.edgeCount}</div>
        </div>
      </div>

      <div className="space-y-2">
        {workspaceScale !== "small" && (
          <div className="rounded-md border border-border/60 bg-muted/20 px-2 py-2 text-[11px] text-muted-foreground">
            <div className="font-medium text-foreground">
              {t(workspaceScale === "medium" ? "knowledge.graphScaleMedium" : "knowledge.graphScaleLarge")}
            </div>
            <p className="mt-1 leading-4">
              {t(workspaceScale === "medium" ? "knowledge.graphScaleHintMedium" : "knowledge.graphScaleHintLarge")}
            </p>
            <p className="mt-1 leading-4">
              {t("knowledge.graphValidatedRangeValue", {
                edges: VALIDATED_REVIEW_MAX_EDGES,
                nodes: VALIDATED_REVIEW_MAX_NODES,
              })}
            </p>
          </div>
        )}
        {activeDocumentNode && (
          <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/20 px-2 py-2">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {t("knowledge.graphSelectedNode")}
              </div>
              <div className="truncate text-xs font-medium text-foreground">
                {activeDocumentNode.label}
              </div>
            </div>
            <Button
              className="h-7 px-2 text-[10px]"
              onClick={() => {
                navigate(`/editor/graph?node=${encodeURIComponent(activeDocumentNode.id)}`);
              }}
              size="sm"
              type="button"
              variant="secondary"
            >
              {t("knowledge.graphFocusSelection")}
            </Button>
          </div>
        )}
        <GraphFilterMenus
          edgeFilter={edgeFilter}
          graphMode={graphMode}
          issueFilter={issueFilter}
          issuesOnly={issuesOnly}
          layout="stacked"
          nodeFilter={nodeFilter}
          onEdgeFilterChange={setEdgeFilter}
          onGraphModeChange={setGraphMode}
          onIssueFilterChange={setIssueFilter}
          onIssuesOnlyChange={setIssuesOnly}
          onNodeFilterChange={setNodeFilter}
        />
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 pl-7 text-xs"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("knowledge.graphSearchPlaceholder")}
              value={query}
            />
          </div>
          <Button
            className="h-8 px-2 text-[10px]"
            onClick={() => setIssuesOnly((current) => !current)}
            size="sm"
            type="button"
            variant={issuesOnly ? "secondary" : "ghost"}
          >
            {t("knowledge.graphIssuesOnly")}
          </Button>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>{t("knowledge.graphNodes")}: {visibleNodeCount}</span>
          <span>|</span>
          <span>{t("knowledge.graphConnections")}: {visibleEdgeCount}</span>
        </div>
      </div>

      {visibleNodeCards.length === 0 ? (
        <div className="rounded-md border border-dashed border-border px-2 py-3 text-[11px] leading-4 text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <ScrollArea className="h-[320px] rounded-md border border-border/60">
          <div className="space-y-2 p-2">
            {visibleNodeCards.map(({ incoming, node, outgoing, previewEdges, totalConnections }) => (
              <div
                className={`rounded-md border bg-background px-2 py-2 ${
                  node.issueSeverity === "warning"
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-border/60"
                }`}
                key={node.id}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium text-foreground">{node.label}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge className="h-5 rounded-full px-1.5 text-[10px]" variant="outline">
                        {t(nodeFilterKey(node.kind))}
                      </Badge>
                      {(node.issueCount || 0) > 0 && (
                        <Badge className="h-5 rounded-full px-1.5 text-[10px]" variant="secondary">
                          {t("knowledge.issueCount", { count: node.issueCount || 0 })}
                        </Badge>
                      )}
                      {node.dominantIssueKind && (
                        <Badge
                          className="h-5 rounded-full px-1.5 text-[10px]"
                          variant={node.issueSeverity === "warning" ? "secondary" : "outline"}
                        >
                          {t(issueKindLabelKey(node.dominantIssueKind))}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      className="h-6 px-2 text-[10px]"
                      onClick={() => {
                        setExplorerSelectedNodeId(node.id);
                        setExplorerOpen(true);
                      }}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      {t("knowledge.consistencyInspect")}
                    </Button>
                    <Button
                      className="h-6 px-2 text-[10px]"
                      onClick={() => onOpenDocument(toGraphNavigationTarget(node))}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      {t("knowledge.open")}
                    </Button>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{t("knowledge.graphIncoming", { count: incoming })}</span>
                  <span> | </span>
                  <span>{t("knowledge.graphOutgoing", { count: outgoing })}</span>
                </div>

                {previewEdges.length > 0 ? (
                  <div className="mt-2 space-y-1.5">
                    {previewEdges.map((edge) => {
                      const isOutgoing = edge.sourceId === node.id;
                      const neighbor = nodeById.get(isOutgoing ? edge.targetId : edge.sourceId);
                      const edgeTargetDocumentId = neighbor?.documentId || edge.targetDocumentId || edge.sourceDocumentId;

                      return (
                        <button
                          className={`w-full rounded-md border bg-background px-2 py-2 text-left transition-colors hover:bg-accent/40 ${
                            edge.group === "issue"
                              ? "border-amber-500/30 bg-amber-500/5"
                              : "border-border/40"
                          }`}
                          key={edge.id}
                          onClick={() => onOpenDocument(
                            neighbor
                              ? toGraphNavigationTarget(neighbor)
                              : { documentId: edgeTargetDocumentId },
                          )}
                          type="button"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <Badge className="h-5 rounded-full px-1.5 text-[10px]" variant={edgeBadgeVariant(edge.group)}>
                              {t(edgeKindLabelKey(edge))}
                            </Badge>
                            <span className="truncate text-[10px] text-muted-foreground">
                              {neighbor?.label || t("common.untitled")}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                            {edge.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
                    {t("knowledge.graphNoConnections")}
                  </p>
                )}

                {totalConnections > previewEdges.length && (
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    {t("knowledge.graphMoreConnections", { count: totalConnections - previewEdges.length })}
                  </p>
                )}
              </div>
            ))}
            {hasMoreNodeCards && (
              <div className="rounded-md border border-dashed border-border/60 px-2 py-2 text-[11px] text-muted-foreground">
                {t("knowledge.graphMoreConnections", { count: remainingNodeCardCount })}
              </div>
            )}
          </div>
        </ScrollArea>
      )}
      {explorerOpen && (
        <Suspense fallback={<GraphDialogFallback />}>
          <GraphExplorerSurface
            activeDocumentId={activeDocumentId}
            insights={insights}
            onOpenChange={setExplorerOpen}
            onOpenDocument={onOpenDocument}
            selectedNodeId={explorerSelectedNodeId}
            open={explorerOpen}
          />
        </Suspense>
      )}
    </div>
  );
};

export default WorkspaceGraphPanel;
