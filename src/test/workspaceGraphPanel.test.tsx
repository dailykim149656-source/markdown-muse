import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import WorkspaceGraphPanel from "@/components/editor/WorkspaceGraphPanel";
import { I18nContext } from "@/i18n/I18nProvider";
import type { KnowledgeWorkspaceInsights } from "@/lib/knowledge/workspaceInsights";

const insightsFixture: KnowledgeWorkspaceInsights = {
  edges: [{
    description: "Active Doc has an unresolved reference to Other Doc.",
    group: "issue",
    id: "edge-issue-1",
    kind: "issue_relation",
    sourceDocumentId: "doc-1",
    sourceId: "doc:doc-1",
    targetDocumentId: "doc-2",
    targetId: "doc:doc-2",
    weight: 6,
  }],
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
  ],
  summary: {
    documentNodeCount: 2,
    edgeCount: 0,
    imageNodeCount: 0,
    issueCount: 0,
    referenceEdgeCount: 0,
    sectionNodeCount: 0,
    similarEdgeCount: 0,
    staleIssueCount: 0,
  },
};

describe("WorkspaceGraphPanel", () => {
  it("shows a focus action for the active document", async () => {
    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }} initialEntries={["/editor"]}>
        <I18nContext.Provider
          value={{
            locale: "en",
            setLocale: vi.fn(),
            t: (key) => key,
          }}
        >
          <Routes>
            <Route
              element={(
                <WorkspaceGraphPanel
                  activeDocumentId="doc-1"
                  insights={insightsFixture}
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

    expect(screen.getAllByText("Active Doc").length).toBeGreaterThan(0);
    expect(screen.getAllByText("knowledge.issueReference").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "knowledge.graphFocusSelection" }));

    await waitFor(() => {
      expect(screen.getByText("graph-route")).toBeInTheDocument();
    });
  });

  it("shows workspace-scale guidance for larger graphs", () => {
    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }} initialEntries={["/editor"]}>
        <I18nContext.Provider
          value={{
            locale: "en",
            setLocale: vi.fn(),
            t: (key) => key,
          }}
        >
          <WorkspaceGraphPanel
            activeDocumentId="doc-1"
            insights={{
              ...insightsFixture,
              summary: {
                ...insightsFixture.summary,
                documentNodeCount: 80,
                edgeCount: 200,
                sectionNodeCount: 120,
              },
            }}
            onOpenDocument={vi.fn()}
          />
        </I18nContext.Provider>
      </MemoryRouter>,
    );

    expect(screen.getByText("knowledge.graphScaleMedium")).toBeInTheDocument();
    expect(screen.getByText("knowledge.graphScaleHintMedium")).toBeInTheDocument();
  });

  it("supports an issues graph mode in the panel", () => {
    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }} initialEntries={["/editor"]}>
        <I18nContext.Provider
          value={{
            locale: "en",
            setLocale: vi.fn(),
            t: (key) => key,
          }}
        >
          <WorkspaceGraphPanel
            activeDocumentId="doc-1"
            insights={insightsFixture}
            onOpenDocument={vi.fn()}
          />
        </I18nContext.Provider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "knowledge.graphModeIssues" }));

    expect(screen.getByText("knowledge.graphNodes: 2")).toBeInTheDocument();
    expect(screen.getByText("knowledge.graphConnections: 1")).toBeInTheDocument();
  });
});
