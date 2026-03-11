import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GraphExplorerSurface } from "@/components/editor/GraphExplorerDialog";
import { I18nContext } from "@/i18n/I18nProvider";
import type { KnowledgeWorkspaceInsights } from "@/lib/knowledge/workspaceInsights";

const insightsFixture: KnowledgeWorkspaceInsights = {
  edges: [
    {
      description: "Source references target",
      group: "reference",
      id: "edge-1",
      sourceId: "doc:doc-1",
      targetId: "doc:doc-2",
      weight: 1,
    },
  ],
  issues: [],
  nodes: [
    {
      documentId: "doc-1",
      id: "doc:doc-1",
      kind: "document",
      label: "Source Doc",
    },
    {
      documentId: "doc-2",
      id: "doc:doc-2",
      kind: "document",
      label: "Target Doc",
    },
  ],
  summary: {
    documentNodeCount: 2,
    edgeCount: 1,
    imageNodeCount: 0,
    issueCount: 0,
    referenceEdgeCount: 1,
    sectionNodeCount: 0,
    similarEdgeCount: 0,
    staleIssueCount: 0,
  },
};

describe("GraphExplorerSurface context chain", () => {
  it("renders source-target chain context", () => {
    const onOpenDocument = vi.fn();
    const onSuggestChainUpdate = vi.fn();

    render(
      <I18nContext.Provider
        value={{
          locale: "en",
          setLocale: vi.fn(),
          t: (key) => key,
          }}
        >
        <GraphExplorerSurface
          contextChain={{
            context: "consistency",
            issueKind: "missing_section",
            sourceNodeId: "doc:doc-1",
            targetNodeId: "doc:doc-2",
          }}
          insights={insightsFixture}
          onOpenChange={vi.fn()}
          onOpenDocument={onOpenDocument}
          onSuggestChainUpdate={onSuggestChainUpdate}
          open
          selectedNodeId="doc:doc-2"
        />
      </I18nContext.Provider>,
    );

    expect(screen.getByText("knowledge.graphChainTitle")).toBeInTheDocument();
    expect(screen.getAllByText("knowledge.graphChainSource").length).toBeGreaterThan(0);
    expect(screen.getAllByText("knowledge.graphChainTarget").length).toBeGreaterThan(0);
    expect(screen.getByText("knowledge.graphChainContextConsistency")).toBeInTheDocument();
    expect(screen.getByText("knowledge.consistencyKindMissing")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Source Doc" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Target Doc" }).length).toBeGreaterThan(0);
    expect(screen.getByText("knowledge.graphTargetInspectionHint")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "knowledge.graphOpenSource" }));
    fireEvent.click(screen.getByRole("button", { name: "knowledge.graphOpenTarget" }));
    fireEvent.click(screen.getByRole("button", { name: "knowledge.consistencySuggestPatch" }));

    expect(onOpenDocument).toHaveBeenNthCalledWith(1, expect.objectContaining({ documentId: "doc-1" }));
    expect(onOpenDocument).toHaveBeenNthCalledWith(2, expect.objectContaining({ documentId: "doc-2" }));
    expect(onSuggestChainUpdate).toHaveBeenCalledWith({
      context: "consistency",
      issueId: undefined,
      issueKind: "missing_section",
      issuePriority: undefined,
      issueReason: undefined,
      sourceDocumentId: "doc-1",
      targetDocumentId: "doc-2",
    });
  }, 30000);
});
