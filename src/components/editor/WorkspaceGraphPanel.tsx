import { Suspense, lazy, useMemo, useState } from "react";
import { Boxes, GitBranch, ImageIcon, Maximize2, Network, SquareStack } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useI18n } from "@/i18n/useI18n";
import type {
  KnowledgeGraphEdge,
  KnowledgeWorkspaceInsights,
} from "@/lib/knowledge/workspaceInsights";
import {
  type EdgeFilter,
  type NodeFilter,
  edgeBadgeVariant,
  edgeFilterKey,
  edgeGroupOrder,
  edgeKindLabelKey,
  nodeFilterKey,
  nodeKindOrder,
} from "@/components/editor/workspaceGraphUtils";

const GraphExplorerDialog = lazy(() => import("@/components/editor/GraphExplorerDialog"));

const GraphDialogFallback = () => null;

interface WorkspaceGraphPanelProps {
  insights: KnowledgeWorkspaceInsights;
  onOpenDocument: (documentId: string) => void;
}

const WorkspaceGraphPanel = ({
  insights,
  onOpenDocument,
}: WorkspaceGraphPanelProps) => {
  const { t } = useI18n();
  const [nodeFilter, setNodeFilter] = useState<NodeFilter>("all");
  const [edgeFilter, setEdgeFilter] = useState<EdgeFilter>("all");
  const [explorerOpen, setExplorerOpen] = useState(false);

  const nodeById = useMemo(
    () => new Map(insights.nodes.map((node) => [node.id, node])),
    [insights.nodes],
  );

  const visibleNodes = useMemo(
    () => insights.nodes
      .filter((node) => nodeFilter === "all" || node.kind === nodeFilter)
      .sort((left, right) =>
        nodeKindOrder[left.kind] - nodeKindOrder[right.kind]
        || (right.issueCount || 0) - (left.issueCount || 0)
        || left.label.localeCompare(right.label)),
    [insights.nodes, nodeFilter],
  );

  const visibleNodeIds = useMemo(
    () => new Set(visibleNodes.map((node) => node.id)),
    [visibleNodes],
  );

  const visibleEdges = useMemo(
    () => insights.edges
      .filter((edge) =>
        (edgeFilter === "all" || edge.group === edgeFilter)
        && visibleNodeIds.has(edge.sourceId)
        && visibleNodeIds.has(edge.targetId))
      .sort((left, right) =>
        edgeGroupOrder[left.group] - edgeGroupOrder[right.group]
        || right.weight - left.weight
        || left.description.localeCompare(right.description)),
    [edgeFilter, insights.edges, visibleNodeIds],
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
        || right.totalConnections - left.totalConnections
        || (right.node.issueCount || 0) - (left.node.issueCount || 0)
        || left.node.label.localeCompare(right.node.label))
      .slice(0, 8),
    [connectionSummary.incoming, connectionSummary.outgoing, visibleEdges, visibleNodes],
  );

  return (
    <div className="space-y-3 group-data-[collapsible=icon]:hidden">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Network className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">{t("knowledge.graphTitle")}</span>
          </div>
          <Button className="h-6 gap-1 px-2 text-[10px]" onClick={() => setExplorerOpen(true)} size="sm" type="button" variant="outline">
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
        <div className="flex flex-wrap gap-1">
          {(["all", "document", "section", "image"] as NodeFilter[]).map((value) => (
            <Button
              className="h-6 px-2 text-[10px]"
              key={`node-filter-${value}`}
              onClick={() => setNodeFilter(value)}
              size="sm"
              type="button"
              variant={nodeFilter === value ? "secondary" : "ghost"}
            >
              {t(nodeFilterKey(value))}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {(["all", "containment", "reference", "similarity"] as EdgeFilter[]).map((value) => (
            <Button
              className="h-6 px-2 text-[10px]"
              key={`edge-filter-${value}`}
              onClick={() => setEdgeFilter(value)}
              size="sm"
              type="button"
              variant={edgeFilter === value ? "secondary" : "ghost"}
            >
              {t(edgeFilterKey(value))}
            </Button>
          ))}
        </div>
      </div>

      {visibleNodeCards.length === 0 ? (
        <div className="rounded-md border border-dashed border-border px-2 py-3 text-[11px] leading-4 text-muted-foreground">
          {t("knowledge.graphEmpty")}
        </div>
      ) : (
        <ScrollArea className="h-[320px] rounded-md border border-border/60">
          <div className="space-y-2 p-2">
            {visibleNodeCards.map(({ incoming, node, outgoing, previewEdges, totalConnections }) => (
              <div className="rounded-md border border-border/60 bg-background px-2 py-2" key={node.id}>
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
                    </div>
                  </div>
                  <Button
                    className="h-6 px-2 text-[10px]"
                    onClick={() => onOpenDocument(node.documentId)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    {t("knowledge.open")}
                  </Button>
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

                      return (
                        <button
                          className="w-full rounded-md border border-border/40 bg-background px-2 py-2 text-left transition-colors hover:bg-accent/40"
                          key={edge.id}
                          onClick={() => onOpenDocument((neighbor || node).documentId)}
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
          </div>
        </ScrollArea>
      )}
      {explorerOpen && (
        <Suspense fallback={<GraphDialogFallback />}>
          <GraphExplorerDialog
            insights={insights}
            onOpenChange={setExplorerOpen}
            onOpenDocument={onOpenDocument}
            open={explorerOpen}
          />
        </Suspense>
      )}
    </div>
  );
};

export default WorkspaceGraphPanel;
