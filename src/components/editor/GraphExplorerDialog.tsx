import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  GitBranch,
  ImageIcon,
  Info,
  LocateFixed,
  Network,
  RotateCcw,
  Search,
  SquareStack,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import GraphCanvas from "@/components/editor/GraphCanvas";
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
  KnowledgeGraphNavigationTarget,
  KnowledgeGraphNode,
  KnowledgeHealthIssue,
  KnowledgeWorkspaceInsights,
} from "@/lib/knowledge/workspaceInsights";
import {
  type EdgeFilter,
  type GraphMode,
  type IssueFilter,
  type NodeFilter,
  applyGraphMode,
  applyIssueFilter,
  edgeBadgeVariant,
  edgeFilterKey,
  edgeGroupOrder,
  edgeKindLabelKey,
  graphModeKey,
  issueFilterKey,
  issueKindLabelKey,
  nodeFilterKey,
  nodeKindOrder,
  toGraphNavigationTarget,
} from "@/components/editor/workspaceGraphUtils";
import { deriveSemanticOverlay } from "@/components/editor/workspaceSemanticOverlay";

type GraphExplorerVariant = "dialog" | "surface";
type GraphContextKind = "change" | "consistency" | "impact";
type GraphConsistencyIssueKind = "changed_section" | "conflicting_procedure" | "missing_section";

interface GraphExplorerContextChain {
  context: GraphContextKind;
  issueId?: string;
  issueKind?: GraphConsistencyIssueKind;
  issuePriority?: "high" | "low" | "medium";
  issueReason?: string;
  sourceNodeId?: string | null;
  targetNodeId?: string | null;
}

interface GraphChainSuggestionRequest {
  context: GraphContextKind;
  issueId?: string;
  issueKind?: GraphConsistencyIssueKind;
  issuePriority?: "high" | "low" | "medium";
  issueReason?: string;
  sourceDocumentId: string;
  targetDocumentId: string;
}

interface GraphExplorerDialogProps {
  activeDocumentId?: string;
  contextChain?: GraphExplorerContextChain | null;
  insights: KnowledgeWorkspaceInsights;
  onOpenChange: (open: boolean) => void;
  onOpenDocument: (target: KnowledgeGraphNavigationTarget) => void;
  onSuggestChainUpdate?: (request: GraphChainSuggestionRequest) => void;
  onSelectedNodeChange?: (nodeId: string | null) => void;
  open: boolean;
  selectedNodeId?: string | null;
  variant?: GraphExplorerVariant;
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

const chainContextLabelKey = (context: GraphContextKind) => {
  switch (context) {
    case "change":
      return "knowledge.graphChainContextChange";
    case "consistency":
      return "knowledge.graphChainContextConsistency";
    case "impact":
    default:
      return "knowledge.graphChainContextImpact";
  }
};

const consistencyKindLabelKey = (kind: GraphConsistencyIssueKind) => {
  switch (kind) {
    case "changed_section":
      return "knowledge.consistencyKindChanged";
    case "conflicting_procedure":
      return "knowledge.consistencyKindConflict";
    case "missing_section":
    default:
      return "knowledge.consistencyKindMissing";
  }
};

const chainSuggestionLabelKey = (context: GraphContextKind) => {
  switch (context) {
    case "consistency":
      return "knowledge.consistencySuggestPatch";
    case "impact":
      return "knowledge.suggest";
    case "change":
    default:
      return "knowledge.changeMonitoringSuggestUpdate";
  }
};

const getWorkspaceScale = (insights: KnowledgeWorkspaceInsights) => {
  const nodeCount = insights.summary.documentNodeCount
    + insights.summary.sectionNodeCount
    + insights.summary.imageNodeCount;

  if (nodeCount <= 120 && insights.summary.edgeCount <= 180) {
    return "small";
  }

  if (nodeCount <= 480 && insights.summary.edgeCount <= 900) {
    return "medium";
  }

  return "large";
};

const GraphExplorerDialog = ({
  activeDocumentId,
  contextChain = null,
  insights,
  onOpenChange,
  onOpenDocument,
  onSuggestChainUpdate,
  onSelectedNodeChange,
  open,
  selectedNodeId: externallySelectedNodeId = null,
  variant = "dialog",
}: GraphExplorerDialogProps) => {
  const { t } = useI18n();
  const [graphMode, setGraphMode] = useState<GraphMode>("full");
  const [issueFilter, setIssueFilter] = useState<IssueFilter>("all");
  const [nodeFilter, setNodeFilter] = useState<NodeFilter>("all");
  const [edgeFilter, setEdgeFilter] = useState<EdgeFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(externallySelectedNodeId);
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [semanticOverlayEnabled, setSemanticOverlayEnabled] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const workspaceScale = useMemo(() => getWorkspaceScale(insights), [insights]);

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

  useEffect(() => {
    if (modeGraph.nodes.length === 0) {
      if (selectedNodeId !== null) {
        setSelectedNodeId(null);
      }
      return;
    }

    if (!selectedNodeId || !modeGraph.nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(modeGraph.nodes[0].id);
    }
  }, [modeGraph.nodes, selectedNodeId]);

  useEffect(() => {
    if (!open || !externallySelectedNodeId) {
      return;
    }

    if (modeGraph.nodes.some((node) => node.id === externallySelectedNodeId)) {
      setSelectedNodeId(externallySelectedNodeId);
    }
  }, [externallySelectedNodeId, modeGraph.nodes, open]);

  useEffect(() => {
    if (open) {
      onSelectedNodeChange?.(selectedNodeId);
    }
  }, [onSelectedNodeChange, open, selectedNodeId]);

  const displayedGraph = useMemo(() => {
    if (!focusMode || !selectedNodeId) {
      return modeGraph;
    }

    const focusedEdges = modeGraph.edges.filter((edge) =>
      edge.sourceId === selectedNodeId || edge.targetId === selectedNodeId);
    const visibleNodeIds = new Set<string>([selectedNodeId]);

    for (const edge of focusedEdges) {
      visibleNodeIds.add(edge.sourceId);
      visibleNodeIds.add(edge.targetId);
    }

    return {
      edges: focusedEdges,
      nodes: modeGraph.nodes.filter((node) => visibleNodeIds.has(node.id)),
    };
  }, [focusMode, modeGraph, selectedNodeId]);

  const selectedNode = displayedGraph.nodes.find((node) => node.id === selectedNodeId)
    || modeGraph.nodes.find((node) => node.id === selectedNodeId)
    || null;

  const connectionSummary = useMemo(() => {
    const incoming = new Map<string, number>();
    const outgoing = new Map<string, number>();

    for (const edge of displayedGraph.edges) {
      outgoing.set(edge.sourceId, (outgoing.get(edge.sourceId) || 0) + 1);
      incoming.set(edge.targetId, (incoming.get(edge.targetId) || 0) + 1);
    }

    return { incoming, outgoing };
  }, [displayedGraph.edges]);

  const selectedNodeEdges = useMemo(
    () => selectedNode
      ? displayedGraph.edges.filter((edge) =>
        edge.sourceId === selectedNode.id || edge.targetId === selectedNode.id)
      : [],
    [displayedGraph.edges, selectedNode],
  );

  const selectedNodeIssues = useMemo(
    () => selectedNode
      ? insights.issues.filter((issue) =>
        (issue.documentId === selectedNode.documentId || issue.relatedDocumentIds.includes(selectedNode.documentId))
        && (issueFilter === "all" || issue.kind === issueFilter))
      : [],
    [insights.issues, issueFilter, selectedNode],
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
  const sourceChainNode = contextChain?.sourceNodeId
    ? nodeById.get(contextChain.sourceNodeId) || null
    : null;
  const targetChainNode = contextChain?.targetNodeId
    ? nodeById.get(contextChain.targetNodeId) || null
    : null;
  const hasContextChain = Boolean(contextChain && (sourceChainNode || targetChainNode));
  const isSourceChainNode = selectedNode && contextChain?.sourceNodeId === selectedNode.id;
  const isTargetChainNode = selectedNode && contextChain?.targetNodeId === selectedNode.id;

  const handleOpenDocument = (target: KnowledgeGraphNavigationTarget) => {
    onOpenDocument(target);
    onOpenChange(false);
  };

  const resetView = () => {
    setNodeFilter("all");
    setEdgeFilter("all");
    setQuery("");
    setIssuesOnly(false);
    setSemanticOverlayEnabled(false);
    setFocusMode(false);
    setGraphMode("full");
    setIssueFilter("all");
  };

  const body = (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Network className="h-4 w-4 text-muted-foreground" />
              {t("knowledge.graphExplorerTitle")}
            </div>
            <p className="text-sm text-muted-foreground">
              {t("knowledge.graphExplorerDescription")}
            </p>
            {contextChain && hasContextChain && (
              <div className="mt-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{t("knowledge.graphChainTitle")}</Badge>
                  <Badge variant="outline">{t(chainContextLabelKey(contextChain.context))}</Badge>
                  {contextChain.context === "consistency" && contextChain.issueKind && (
                    <Badge variant="outline">{t(consistencyKindLabelKey(contextChain.issueKind))}</Badge>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-foreground">
                  {sourceChainNode && (
                    <button
                      className="rounded-full border border-border/60 px-2.5 py-1 text-sm font-medium transition-colors hover:bg-accent/60"
                      onClick={() => setSelectedNodeId(sourceChainNode.id)}
                      type="button"
                    >
                      {sourceChainNode.label}
                    </button>
                  )}
                  {sourceChainNode && targetChainNode && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                  {targetChainNode && (
                    <button
                      className="rounded-full border border-border/60 px-2.5 py-1 text-sm font-medium transition-colors hover:bg-accent/60"
                      onClick={() => setSelectedNodeId(targetChainNode.id)}
                      type="button"
                    >
                      {targetChainNode.label}
                    </button>
                  )}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("knowledge.graphChainHint")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {sourceChainNode && (
                    <Button
                      onClick={() => handleOpenDocument(toGraphNavigationTarget(sourceChainNode))}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {t("knowledge.graphOpenSource")}
                    </Button>
                  )}
                  {targetChainNode && (
                    <Button
                      onClick={() => handleOpenDocument(toGraphNavigationTarget(targetChainNode))}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {t("knowledge.graphOpenTarget")}
                    </Button>
                  )}
                  {onSuggestChainUpdate && sourceChainNode && targetChainNode && (
                    <Button
                      onClick={() => onSuggestChainUpdate({
                        context: contextChain.context,
                        issueId: contextChain.issueId,
                        issueKind: contextChain.issueKind,
                        issuePriority: contextChain.issuePriority,
                        issueReason: contextChain.issueReason,
                        sourceDocumentId: sourceChainNode.documentId,
                        targetDocumentId: targetChainNode.documentId,
                      })}
                      size="sm"
                      type="button"
                      variant="default"
                    >
                      {t(chainSuggestionLabelKey(contextChain.context))}
                    </Button>
                  )}
                </div>
              </div>
            )}
            {workspaceScale !== "small" && (
              <div className="mt-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    {t(workspaceScale === "medium" ? "knowledge.graphScaleMedium" : "knowledge.graphScaleLarge")}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {t(workspaceScale === "medium" ? "knowledge.graphScaleHintMedium" : "knowledge.graphScaleHintLarge")}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    className="h-7 text-[11px]"
                    onClick={() => setGraphMode("issues")}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {t("knowledge.graphModeIssues")}
                  </Button>
                  <Button
                    className="h-7 text-[11px]"
                    onClick={() => setEdgeFilter("reference")}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {t("knowledge.graphFilterReferences")}
                  </Button>
                  <Button
                    className="h-7 text-[11px]"
                    onClick={() => setGraphMode("document")}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {t("knowledge.graphModeDocument")}
                  </Button>
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-md border border-border/60 px-3 py-2">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Boxes className="h-3 w-3" />
                {t("knowledge.graphDocuments")}
              </div>
              <div className="mt-1 text-sm font-semibold text-foreground">
                {displayedGraph.nodes.filter((node) => node.kind === "document").length}
              </div>
            </div>
            <div className="rounded-md border border-border/60 px-3 py-2">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <SquareStack className="h-3 w-3" />
                {t("knowledge.graphSections")}
              </div>
              <div className="mt-1 text-sm font-semibold text-foreground">
                {displayedGraph.nodes.filter((node) => node.kind === "section").length}
              </div>
            </div>
            <div className="rounded-md border border-border/60 px-3 py-2">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <ImageIcon className="h-3 w-3" />
                {t("knowledge.images")}
              </div>
              <div className="mt-1 text-sm font-semibold text-foreground">
                {displayedGraph.nodes.filter((node) => node.kind === "image").length}
              </div>
            </div>
            <div className="rounded-md border border-border/60 px-3 py-2">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <GitBranch className="h-3 w-3" />
                {t("knowledge.graphLinks")}
              </div>
              <div className="mt-1 text-sm font-semibold text-foreground">
                {displayedGraph.edges.length}
              </div>
            </div>
          </div>
        </div>
      </div>

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
              {(["full", "document", "issues"] as GraphMode[]).map((value) => (
                <Button
                  className="h-7 px-2 text-[11px]"
                  key={`dialog-graph-mode-${value}`}
                  onClick={() => setGraphMode(value)}
                  size="sm"
                  type="button"
                  variant={graphMode === value ? "secondary" : "ghost"}
                >
                  {t(graphModeKey(value))}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {(["all", "unresolved_reference", "duplicate_document", "missing_section", "conflicting_procedure", "outdated_source", "stale_index", "image_missing_description"] as IssueFilter[]).map((value) => (
                <Button
                  className="h-7 px-2 text-[11px]"
                  key={`dialog-issue-filter-${value}`}
                  onClick={() => setIssueFilter(value)}
                  size="sm"
                  type="button"
                  variant={issueFilter === value ? "secondary" : "ghost"}
                >
                  {t(issueFilterKey(value))}
                </Button>
              ))}
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
              className="h-7 gap-1 px-2 text-[11px]"
              disabled={!selectedNode}
              onClick={() => setFocusMode((current) => !current)}
              size="sm"
              type="button"
              variant={focusMode ? "secondary" : "ghost"}
            >
              <LocateFixed className="h-3.5 w-3.5" />
              {t(focusMode ? "knowledge.graphFocusActive" : "knowledge.graphFocusSelection")}
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
            <Button
              className="h-7 gap-1 px-2 text-[11px]"
              onClick={resetView}
              size="sm"
              type="button"
              variant="ghost"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t("knowledge.graphResetView")}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "containment", "reference", "similarity", "issue"] as EdgeFilter[]).map((value) => (
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
            <Badge variant="outline">{displayedGraph.nodes.length}</Badge>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-1 p-2">
              {displayedGraph.nodes.length === 0 ? (
                <div className="rounded-md border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
                  {focusMode
                    ? t("knowledge.graphNoMatchingConnections")
                    : graphMode === "issues"
                      ? t("knowledge.graphIssuesEmpty")
                      : t("knowledge.graphSearchEmpty")}
                </div>
              ) : (
                displayedGraph.nodes.map((node) => (
                  <button
                    className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
                      selectedNodeId === node.id
                        ? node.issueSeverity === "warning"
                          ? "border-amber-500/50 bg-amber-500/10 text-foreground"
                          : "border-border bg-accent/60 text-accent-foreground"
                        : node.issueSeverity === "warning"
                          ? "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50 hover:bg-amber-500/10"
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
                      {contextChain?.sourceNodeId === node.id && (
                        <Badge className="h-5 rounded-full px-1.5 text-[10px]" variant="secondary">
                          {t("knowledge.graphChainSource")}
                        </Badge>
                      )}
                      {contextChain?.targetNodeId === node.id && (
                        <Badge className="h-5 rounded-full px-1.5 text-[10px]" variant="secondary">
                          {t("knowledge.graphChainTarget")}
                        </Badge>
                      )}
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
                <GraphCanvas
                  edges={displayedGraph.edges}
                  nodes={displayedGraph.nodes}
                  onOpenDocument={handleOpenDocument}
                  onSelectNode={setSelectedNodeId}
                  selectedNodeId={selectedNodeId}
                />

                <div
                  className={`rounded-lg border bg-background p-4 ${
                    selectedNode.issueSeverity === "warning"
                      ? "border-amber-500/40 bg-amber-500/5"
                      : "border-border/60"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="break-words text-lg font-semibold text-foreground">
                        {selectedNode.label}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{t(nodeFilterKey(selectedNode.kind))}</Badge>
                        {isSourceChainNode && (
                          <Badge variant="secondary">{t("knowledge.graphChainSource")}</Badge>
                        )}
                        {isTargetChainNode && (
                          <Badge variant="secondary">{t("knowledge.graphChainTarget")}</Badge>
                        )}
                        {(selectedNode.issueCount || 0) > 0 && (
                          <Badge variant="secondary">
                            {t("knowledge.issueCount", { count: selectedNode.issueCount || 0 })}
                          </Badge>
                        )}
                        {selectedNode.dominantIssueKind && (
                          <Badge variant={selectedNode.issueSeverity === "warning" ? "secondary" : "outline"}>
                            {t(issueKindLabelKey(selectedNode.dominantIssueKind))}
                          </Badge>
                        )}
                      </div>
                      {(isSourceChainNode || isTargetChainNode) && (
                        <p className="text-xs text-muted-foreground">
                          {t(isSourceChainNode
                            ? "knowledge.graphSourceInspectionHint"
                            : "knowledge.graphTargetInspectionHint")}
                        </p>
                      )}
                    </div>
                    <Button
                      className="shrink-0"
                      onClick={() => handleOpenDocument(toGraphNavigationTarget(selectedNode))}
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
                            {t(issueKindLabelKey(issue.kind))}
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
                                  onClick={() => handleOpenDocument({ documentId: link.targetDocumentId })}
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
                    <div
                      className={`rounded-md border bg-background p-3 ${
                        edge.group === "issue"
                          ? "border-amber-500/40 bg-amber-500/5"
                          : "border-border/60"
                      }`}
                      key={edge.id}
                    >
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
                          onClick={() => handleOpenDocument(
                            neighbor
                              ? toGraphNavigationTarget(neighbor)
                              : toGraphNavigationTarget(selectedNode),
                          )}
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
  );

  if (variant === "surface") {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
        <div className="absolute right-4 top-4 z-10">
          <Button onClick={() => onOpenChange(false)} size="icon" type="button" variant="outline">
            <X className="h-4 w-4" />
          </Button>
        </div>
        {body}
      </div>
    );
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-6xl gap-0 overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{t("knowledge.graphExplorerTitle")}</DialogTitle>
          <DialogDescription>{t("knowledge.graphExplorerDescription")}</DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
};

export const GraphExplorerSurface = (props: Omit<GraphExplorerDialogProps, "variant">) => (
  <GraphExplorerDialog {...props} variant="surface" />
);

export default GraphExplorerDialog;
