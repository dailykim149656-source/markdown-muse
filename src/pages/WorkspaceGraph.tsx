import { Suspense, lazy, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDocumentManager } from "@/hooks/useDocumentManager";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { setPendingEditorFocusTarget } from "@/lib/editor/editorFocusTarget";

const GraphExplorerSurface = lazy(() =>
  import("@/components/editor/GraphExplorerDialog").then((module) => ({
    default: module.GraphExplorerSurface,
  })),
);

const WorkspaceGraph = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedNodeId = useMemo(
    () => searchParams.get("node") || searchParams.get("target") || searchParams.get("source"),
    [searchParams],
  );
  const contextChain = useMemo(() => {
    const context = searchParams.get("context");

    if (context !== "change" && context !== "consistency" && context !== "impact") {
      return null;
    }

    const issueKind = searchParams.get("issue");
    const issuePriority = searchParams.get("issuePriority");

    return {
      context,
      issueId: searchParams.get("issueId") || undefined,
      issueKind: issueKind === "changed_section" || issueKind === "conflicting_procedure" || issueKind === "missing_section"
        ? issueKind
        : undefined,
      issuePriority: issuePriority === "high"
        || issuePriority === "medium"
        || issuePriority === "low"
        ? issuePriority
        : undefined,
      issueReason: searchParams.get("issueReason") || undefined,
      sourceNodeId: searchParams.get("source"),
      targetNodeId: searchParams.get("target"),
    };
  }, [searchParams]);
  const {
    activeDocId,
    createDocument,
    documents,
    selectDocument,
  } = useDocumentManager();
  const { knowledgeInsights } = useKnowledgeBase({
    activeDocumentId: activeDocId,
    createDocument,
    documents,
    selectDocument,
  });

  return (
    <Suspense fallback={null}>
      <GraphExplorerSurface
        activeDocumentId={activeDocId}
        contextChain={contextChain}
        insights={knowledgeInsights}
        onOpenChange={(open) => {
          if (!open) {
            navigate("/editor");
          }
        }}
        onOpenDocument={(target) => {
          setPendingEditorFocusTarget(target);
          selectDocument(target.documentId);
          navigate("/editor");
        }}
        onSelectedNodeChange={(nodeId) => {
          setSearchParams((current) => {
            const next = new URLSearchParams(current);

            if (nodeId) {
              next.set("node", nodeId);
            } else {
              next.delete("node");
            }

            return next;
          }, { replace: true });
        }}
        onSuggestChainUpdate={(request) => {
          const next = new URLSearchParams();

          next.set("knowledgeAction", "suggest-updates");
          next.set("context", request.context);
          next.set("source", request.sourceDocumentId);
          next.set("target", request.targetDocumentId);

          if (request.issueId) {
            next.set("issueId", request.issueId);
          }

          if (request.issueKind) {
            next.set("issueKind", request.issueKind);
          }

          if (request.issuePriority) {
            next.set("issuePriority", request.issuePriority);
          }

          if (request.issueReason) {
            next.set("issueReason", request.issueReason);
          }

          navigate(`/editor?${next.toString()}`);
        }}
        open
        selectedNodeId={selectedNodeId}
      />
    </Suspense>
  );
};

export default WorkspaceGraph;
