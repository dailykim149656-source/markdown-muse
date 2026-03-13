import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import WorkspaceGraphPanel from "@/components/editor/WorkspaceGraphPanel";
import { I18nContext } from "@/i18n/I18nProvider";
import type { KnowledgeWorkspaceInsights } from "@/lib/knowledge/workspaceInsights";

const insightsFixture: KnowledgeWorkspaceInsights = {
  edges: [
    {
      description: "Active Doc references Other Doc.",
      group: "reference",
      id: "edge-reference-1",
      kind: "references",
      sourceDocumentId: "doc-1",
      sourceId: "doc:doc-1",
      targetDocumentId: "doc-2",
      targetId: "doc:doc-2",
      weight: 4,
    },
    {
      description: "Active Doc has an unresolved reference to Other Doc.",
      group: "issue",
      id: "edge-issue-1",
      kind: "issue_relation",
      sourceDocumentId: "doc-1",
      sourceId: "doc:doc-1",
      targetDocumentId: "doc-2",
      targetId: "doc:doc-2",
      weight: 6,
    },
  ],
  issues: [{
    documentId: "doc-1",
    id: "issue-1",
    kind: "unresolved_reference",
    message: "Active Doc references a missing anchor in Other Doc.",
    relatedDocumentIds: ["doc-1", "doc-2"],
    severity: "warning",
  }],
  nodes: [
    {
      dominantIssueKind: "unresolved_reference",
      documentId: "doc-1",
      id: "doc:doc-1",
      issueCount: 1,
      issueSeverity: "warning",
      kind: "document",
      label: "Active Doc",
    },
    {
      dominantIssueKind: "unresolved_reference",
      documentId: "doc-2",
      id: "doc:doc-2",
      issueCount: 1,
      issueSeverity: "warning",
      kind: "document",
      label: "Other Doc",
    },
    {
      documentId: "doc-3",
      id: "doc:doc-3",
      issueCount: 0,
      kind: "document",
      label: "Reference Only Doc",
    },
  ],
  summary: {
    documentNodeCount: 3,
    edgeCount: 2,
    imageNodeCount: 0,
    issueCount: 1,
    referenceEdgeCount: 1,
    sectionNodeCount: 0,
    similarEdgeCount: 0,
    staleIssueCount: 0,
  },
};

const renderPanel = (insights: KnowledgeWorkspaceInsights = insightsFixture) =>
  render(
    <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }} initialEntries={["/editor"]}>
      <I18nContext.Provider
        value={{
          locale: "en",
          setLocale: vi.fn(),
          t: (key, params) => {
            if (!params) {
              return key;
            }

            return `${key}:${JSON.stringify(params)}`;
          },
        }}
      >
        <Routes>
          <Route
            element={(
              <WorkspaceGraphPanel
                activeDocumentId="doc-1"
                insights={insights}
                onOpenDocument={vi.fn()}
              />
            )}
            path="/editor"
          />
          <Route element={<div>graph-route</div>} path="/editor/graph" />
        </Routes>
      </I18nContext.Provider>
    </MemoryRouter>,
  );

const openMenu = (name: string) => {
  const trigger = screen.getByRole("button", { name });
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
};

describe("WorkspaceGraphPanel", () => {
  it("shows a focus action for the active document", async () => {
    renderPanel();

    expect(screen.getAllByText("Active Doc").length).toBeGreaterThan(0);
    expect(screen.getAllByText("knowledge.issueReference").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "knowledge.graphFocusSelection" }));

    await waitFor(() => {
      expect(screen.getByText("graph-route")).toBeInTheDocument();
    });
  });

  it("renders three graph filter dropdown triggers", () => {
    renderPanel();

    expect(screen.getByRole("button", { name: "knowledge.graphViewMenuAria" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "knowledge.graphNodeMenuAria" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "knowledge.graphRelationsMenuAria" })).toBeInTheDocument();
  });

  it("shows workspace-scale guidance for larger graphs", () => {
    renderPanel({
      ...insightsFixture,
      summary: {
        ...insightsFixture.summary,
        documentNodeCount: 80,
        edgeCount: 200,
        sectionNodeCount: 120,
      },
    });

    expect(screen.getByText("knowledge.graphScaleMedium")).toBeInTheDocument();
    expect(screen.getByText("knowledge.graphScaleHintMedium")).toBeInTheDocument();
    expect(screen.getByText('knowledge.graphValidatedRangeValue:{"edges":900,"nodes":480}')).toBeInTheDocument();
  });

  it("supports an issues graph mode through the view dropdown", async () => {
    renderPanel();

    expect(screen.getAllByText("Reference Only Doc").length).toBeGreaterThan(0);

    openMenu("knowledge.graphViewMenuAria");
    fireEvent.click(screen.getByRole("menuitemradio", { name: "knowledge.graphModeIssues" }));

    await waitFor(() => {
      expect(screen.queryByText("Reference Only Doc")).not.toBeInTheDocument();
    });

    expect(screen.getByText("knowledge.graphNodes: 2")).toBeInTheDocument();
    expect(screen.getByText("knowledge.graphConnections: 1")).toBeInTheDocument();
  });

  it("supports issues-only filtering through the node dropdown", async () => {
    renderPanel();

    expect(screen.getAllByText("Reference Only Doc").length).toBeGreaterThan(0);

    openMenu("knowledge.graphNodeMenuAria");
    expect(screen.getByRole("menuitemcheckbox", { name: "knowledge.graphIssuesOnly" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "knowledge.graphIssuesOnly" }));

    await waitFor(() => {
      expect(screen.queryByText("Reference Only Doc")).not.toBeInTheDocument();
    });
  });
});
