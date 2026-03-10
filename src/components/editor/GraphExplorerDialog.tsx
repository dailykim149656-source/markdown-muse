import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Boxes, GitBranch, ImageIcon, Info, Network, Search, SquareStack } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useI18n } from "@/i18n/useI18n";
import type {
  KnowledgeGraphEdge,
  KnowledgeGraphNode,
  KnowledgeHealthIssue,
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
import { deriveSemanticOverlay } from "@/components/editor/workspaceSemanticOverlay";

interface GraphExplorerDialogProps {
  insights: KnowledgeWorkspaceInsights;
  onOpenChange: (open: boolean) => void;
  onOpenDocument: (documentId: string) => void;
  open: boolean;
}

const sortNodes = (left: KnowledgeGraphNode, right: KnowledgeGraphNode) =>
  nodeKindOrder[left.kind] - nodeKindOrder[right.kind]
  || (right.issueCount || 0) - (left.issueCount || 0)
  || left.label.localeCompare(right.label);

const sortEdges = (left: KnowledgeGraphEdge, right: KnowledgeGraphEdge) =>
  edgeGroupOrder[left.group] - edgeGroupOrder[right.group]
  || right.weight - left.weight
  || left.description.localeCompare(right.description);

const issueLabelKey = (kind: KnowledgeHealthIssue["kind"]) => {
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

const semanticKindLabelKey = (kind: "depends_on" | "conflicts_with") => {
  switch (kind) {
    case "conflicts_with":
      return "knowledge.graphSemanticKindConflictsWith";
    case "depends_on":
    default:
      return "knowledge.graphSemanticKindDependsOn";
  }
};

const semanticConfidenceLabelKey = (confidence: "low" | "medium") => {
  switch (confidence) {
    case "medium":
      return "knowledge.graphSemanticConfidenceMedium";
    case "low":
    default:
      return "knowledge.graphSemanticConfidenceLow";
  }
};

const GraphExplorerDialog = ({
  insights,
  onOpenChange,
  onOpenDocument,
  open,
}: GraphExplorerDialogProps) => {
  const { t } = useI18n();
  const [nodeFilter, setNodeFilter] = useState<NodeFilter>("all");
  const [edgeFilter, setEdgeFilter] = useState<EdgeFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [semanticOverlayEnabled, setSemanticOverlayEnabled] = useState(false);

  const nodeById = useMemo(
    () => new Map(insights.nodes.map((node) => [node.id, node])),
    [insights.nodes],
  );

  const baseNodes = useMemo(
    () => insights.nodes
      .filter((node) => (nodeFilter === "all" || node.kind === nodeFilter) && (!issuesOnly || (node.issueCount || 0) > 0))
      .sort(sortNodes),
    [insights.nodes, issuesOnly, nodeFilter],
  );

  const filteredGraph = useMemo(() => {
    const baseNodeIds = new Set(baseNodes.map((node) => node.id));
    const baseEdges = insights.edges
      .filter((edge) =>
        (edgeFilter === "all" || edge.group === edgeFilter)
        && baseNodeIds.has(edge.sourceId)
        && baseNodeIds.has(edge.targetId))
      .sort(sortEdges);
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
  }, [baseNodes, edgeFilter, insights.edges, nodeById, query]);

  useEffect(() => {
    if (filteredGraph.nodes.length === 0) {
      if (selectedNodeId !== null) {
        setSelectedNodeId(null);
      }
      return;
    }

    if (!selectedNodeId || !filteredGraph.nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(filteredGraph.nodes[0].id);
    }
  }, [filteredGraph.nodes, selectedNodeId]);

  const selectedNode = filteredGraph.nodes.find((node) => node.id === selectedNodeId) || null;

  const connectionSummary = useMemo(() => {
    const incoming = new Map<string, number>();
    const outgoing = new Map<string, number>();

    for (const edge of filteredGraph.edges) {
      outgoing.set(edge.sourceId, (outgoing.get(edge.sourceId) || 0) + 1);
      incoming.set(edge.targetId, (incoming.get(edge.targetId) || 0) + 1);
    }

    return { incoming, outgoing };
  }, [filteredGraph.edges]);

  const selectedNodeEdges = useMemo(
    () => selectedNode
      ? filteredGraph.edges.filter((edge) =>
        edge.sourceId === selectedNode.id || edge.targetId === selectedNode.id)
      : [],
    [filteredGraph.edges, selectedNode],
  );
  const selectedNodeIssues = useMemo(
    () => selectedNode
      ? insights.issues.filter((issue) =>
        issue.documentId === selectedNode.documentId || issue.relatedDocumentIds.includes(selectedNode.documentId))
      : [],
    [insights.issues, selectedNode],
  );
  const semanticOverlay = useMemo(
    () => semanticOverlayEnabled
      ? deriveSemanticOverlay({
        nodes: insights.nodes,
        edges: insights.edges,
        issues: insights.issues,
        selectedNodeId,
      })
      : { concepts: [], links: [] },
    [insights.edges, insights.issues, insights.nodes, selectedNodeId, semanticOverlayEnabled],
  );

  const selectedNodeIncoming = selectedNode
    ? connectionSummary.incoming.get(selectedNode.id) || 0
    : 0;
  const selectedNodeOutgoing = selectedNode
    ? connectionSummary.outgoing.get(selectedNode.id) || 0
    : 0;
  const handleOpenDocument = (documentId: string) => {
    onOpenDocument(documentId);
    onOpenChange(false);
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-6xl gap-0 overflow-hidden p-0">
        <div className="flex h-[88vh] flex-col overflow-hidden">
          <DialogHeader className="border-b px-6 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Network className="h-4 w-4 text-muted-foreground" />
                  {t("knowledge.graphExplorerTitle")}
                </DialogTitle>
                <DialogDescription>
                  {t("knowledge.graphExplorerDescription")}
                </DialogDescription>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-md border border-border/60 px-3 py-2">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Boxes className="h-3 w-3" />
                    {t("knowledge.graphDocuments")}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-foreground">
                    {filteredGraph.nodes.filter((node) => node.kind === "document").length}
                  </div>
                </div>
                <div className="rounded-md border border-border/60 px-3 py-2">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <SquareStack className="h-3 w-3" />
                    {t("knowledge.graphSections")}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-foreground">
                    {filteredGraph.nodes.filter((node) => node.kind === "section").length}
                  </div>
                </div>
                <div className="rounded-md border border-border/60 px-3 py-2">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <ImageIcon className="h-3 w-3" />
                    {t("knowledge.images")}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-foreground">
                    {filteredGraph.nodes.filter((node) => node.kind === "image").length}
                  </div>
                </div>
                <div className="rounded-md border border-border/60 px-3 py-2">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <GitBranch className="h-3 w-3" />
                    {t("knowledge.graphLinks")}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-foreground">
                    {filteredGraph.edges.length}
                  </div>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="border-b px-6 py-4">
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("knowledge.graphSearchPlaceholder")}
                  value={query}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(["all", "document", "section", "image"] as NodeFilter[]).map((value) => (
                  <Button
                    className="h-7 px-2 text-[11px]"
                    key={`dialog-node-filter-${value}`}
                    onClick={() => setNodeFilter(value)}
                    size="sm"
                    type="button"
                    variant={nodeFilter === value ? "secondary" : "ghost"}
                  >
                    {t(nodeFilterKey(value))}
                  </Button>
                ))}
                <Button
                  className="h-7 px-2 text-[11px]"
                  onClick={() => setIssuesOnly((current) => !current)}
                  size="sm"
                  type="button"
                  variant={issuesOnly ? "secondary" : "ghost"}
                >
                  {t("knowledge.graphIssuesOnly")}
                </Button>
                <Button
                  className="h-7 px-2 text-[11px]"
                  onClick={() => setSemanticOverlayEnabled((current) => !current)}
                  size="sm"
                  type="button"
                  variant={semanticOverlayEnabled ? "secondary" : "ghost"}
                >
                  {t("knowledge.graphSemanticToggle")}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["all", "containment", "reference", "similarity"] as EdgeFilter[]).map((value) => (
                  <Button
                    className="h-7 px-2 text-[11px]"
                    key={`dialog-edge-filter-${value}`}
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
          </div>

          <div className="grid min-h-0 flex-1 lg:grid-cols-[280px_minmax(0,1fr)_360px]">
            <div className="flex min-h-0 flex-col border-b border-border lg:border-b-0 lg:border-r">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="text-xs font-medium text-foreground">{t("knowledge.graphNodes")}</div>
                <Badge variant="outline">{filteredGraph.nodes.length}</Badge>
              </div>
              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-1 p-2">
                  {filteredGraph.nodes.length === 0 ? (
                    <div className="rounded-md border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
                      {t("knowledge.graphSearchEmpty")}
                    </div>
                  ) : (
                    filteredGraph.nodes.map((node) => (
                      <button
                        className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
                          selectedNodeId === node.id
                            ? "border-border bg-accent/60 text-accent-foreground"
                            : "border-transparent hover:border-border/60 hover:bg-accent/30"
                        }`}
                        key={node.id}
                        onClick={() => setSelectedNodeId(node.id)}
                        type="button"
                      >
                        <div className="truncate text-xs font-medium">{node.label}</div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <Badge className="h-5 rounded-full px-1.5 text-[10px]" variant="outline">
                            {t(nodeFilterKey(node.kind))}
                          </Badge>
                          {(node.issueCount || 0) > 0 && (
                            <Badge className="h-5 rounded-full px-1.5 text-[10px]" variant="secondary">
                              {t("knowledge.issueCount", { count: node.issueCount || 0 })}
                            </Badge>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className="flex min-h-0 flex-col border-b border-border lg:border-b-0">
              <div className="border-b px-4 py-3">
                <div className="text-xs font-medium text-foreground">{t("knowledge.graphSelectedNode")}</div>
              </div>
              <div className="min-h-0 flex-1 overflow-auto p-4">
                {!selectedNode ? (
                  <div className="rounded-md border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                    {t("knowledge.graphNoSelection")}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-border/60 bg-background p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-2">
                          <div className="break-words text-lg font-semibold text-foreground">
                            {selectedNode.label}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">{t(nodeFilterKey(selectedNode.kind))}</Badge>
                            {(selectedNode.issueCount || 0) > 0 && (
                              <Badge variant="secondary">
                                {t("knowledge.issueCount", { count: selectedNode.issueCount || 0 })}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          className="shrink-0"
                          onClick={() => handleOpenDocument(selectedNode.documentId)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          {t("knowledge.open")}
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-md border border-border/60 px-3 py-3">
                        <div className="text-[10px] text-muted-foreground">
                          {t("knowledge.graphIncoming", { count: selectedNodeIncoming })}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-foreground">{selectedNodeIncoming}</div>
                      </div>
                      <div className="rounded-md border border-border/60 px-3 py-3">
                        <div className="text-[10px] text-muted-foreground">
                          {t("knowledge.graphOutgoing", { count: selectedNodeOutgoing })}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-foreground">{selectedNodeOutgoing}</div>
                      </div>
                      <div className="rounded-md border border-border/60 px-3 py-3">
                        <div className="text-[10px] text-muted-foreground">
                          {t("knowledge.graphConnections")}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-foreground">{selectedNodeEdges.length}</div>
                      </div>
                    </div>

                    <div className="space-y-2 rounded-md border border-border/60 px-3 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[11px] font-medium text-foreground">
                          {t("knowledge.graphNodeIssuesTitle")}
                        </div>
                        <Badge variant="outline">{selectedNodeIssues.length}</Badge>
                      </div>
                      {selectedNodeIssues.length === 0 ? (
                        <div className="rounded-md border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
                          {t("knowledge.graphNodeIssuesEmpty")}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {selectedNodeIssues.slice(0, 4).map((issue) => (
                            <div
                              className={`rounded-md border px-3 py-3 ${
                                issue.severity === "warning"
                                  ? "border-amber-500/40 bg-amber-500/5"
                                  : "border-border/60 bg-muted/20"
                              }`}
                              key={issue.id}
                            >
                              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                {issue.severity === "warning" ? (
                                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                                ) : (
                                  <Info className="h-3 w-3" />
                                )}
                                {t(issueLabelKey(issue.kind))}
                              </div>
                              <p className="mt-2 text-xs leading-5 text-foreground/90">
                                {issue.message}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {semanticOverlayEnabled && (
                      <div className="space-y-3 rounded-md border border-border/60 px-3 py-3">
                        <div className="space-y-1">
                          <div className="text-[11px] font-medium text-foreground">
                            {t("knowledge.graphSemanticTitle")}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {t("knowledge.graphSemanticDescription")}
                          </p>
                        </div>

                        {semanticOverlay.concepts.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-[11px] font-medium text-muted-foreground">
                              {t("knowledge.graphSemanticConcepts")}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {semanticOverlay.concepts.map((concept) => (
                                <Badge className="h-5 rounded-full px-1.5 text-[10px]" key={concept} variant="secondary">
                                  {concept}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {semanticOverlay.links.length > 0 ? (
                          <div className="space-y-2">
                            <div className="text-[11px] font-medium text-muted-foreground">
                              {t("knowledge.graphSemanticLinks")}
                            </div>
                            <div className="space-y-2">
                              {semanticOverlay.links.map((link) => (
                                <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-3" key={`${link.kind}-${link.targetId}`}>
                                  <div className="flex flex-wrap items-center gap-1">
                                    <Badge className="h-5 rounded-full px-1.5 text-[10px]" variant="outline">
                                      {t(semanticKindLabelKey(link.kind))}
                                    </Badge>
                                    <Badge className="h-5 rounded-full px-1.5 text-[10px]" variant={link.confidence === "medium" ? "secondary" : "outline"}>
                                      {t(semanticConfidenceLabelKey(link.confidence))}
                                    </Badge>
                                  </div>
                                  <div className="mt-2 text-sm font-medium text-foreground">
                                    {link.targetLabel}
                                  </div>
                                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                    {t(`knowledge.${link.reasonKey}`)}
                                  </p>
                                  {link.targetDocumentId && (
                                    <Button
                                      className="mt-2"
                                      onClick={() => handleOpenDocument(link.targetDocumentId)}
                                      size="sm"
                                      type="button"
                                      variant="ghost"
                                    >
                                      {t("knowledge.open")}
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-md border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
                            {t("knowledge.graphSemanticEmpty")}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex min-h-0 flex-col lg:border-l">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="text-xs font-medium text-foreground">{t("knowledge.graphConnections")}</div>
                <Badge variant="outline">{selectedNodeEdges.length}</Badge>
              </div>
              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-2 p-3">
                  {!selectedNode ? (
                    <div className="rounded-md border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
                      {t("knowledge.graphNoSelection")}
                    </div>
                  ) : selectedNodeEdges.length === 0 ? (
                    <div className="rounded-md border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
                      {query ? t("knowledge.graphNoMatchingConnections") : t("knowledge.graphNoConnections")}
                    </div>
                  ) : (
                    selectedNodeEdges.map((edge) => {
                      const isOutgoing = edge.sourceId === selectedNode.id;
                      const neighbor = nodeById.get(isOutgoing ? edge.targetId : edge.sourceId);

                      return (
                        <div className="rounded-md border border-border/60 bg-background p-3" key={edge.id}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 space-y-2">
                              <div className="flex flex-wrap gap-1">
                                <Badge className="h-5 rounded-full px-1.5 text-[10px]" variant={edgeBadgeVariant(edge.group)}>
                                  {t(edgeKindLabelKey(edge))}
                                </Badge>
                                <Badge className="h-5 rounded-full px-1.5 text-[10px]" variant="outline">
                                  {isOutgoing
                                    ? t("knowledge.graphOutgoing", { count: 1 })
                                    : t("knowledge.graphIncoming", { count: 1 })}
                                </Badge>
                              </div>
                              <button
                                className="truncate text-left text-sm font-medium text-foreground hover:text-primary"
                                onClick={() => neighbor && setSelectedNodeId(neighbor.id)}
                                type="button"
                              >
                                {neighbor?.label || t("common.untitled")}
                              </button>
                            </div>
                            <Button
                              className="shrink-0"
                              onClick={() => handleOpenDocument((neighbor || selectedNode).documentId)}
                              size="sm"
                              type="button"
                              variant="ghost"
                            >
                              {t("knowledge.open")}
                            </Button>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-muted-foreground">
                            {edge.description}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GraphExplorerDialog;
