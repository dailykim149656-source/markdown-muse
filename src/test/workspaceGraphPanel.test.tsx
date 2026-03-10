import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import WorkspaceGraphPanel from "@/components/editor/WorkspaceGraphPanel";
import { I18nContext } from "@/i18n/I18nProvider";
import type { KnowledgeWorkspaceInsights } from "@/lib/knowledge/workspaceInsights";

const insightsFixture: KnowledgeWorkspaceInsights = {
  edges: [],
  issues: [],
  nodes: [
    {
      documentId: "doc-1",
      id: "doc:doc-1",
      kind: "document",
      label: "Active Doc",
    },
    {
      documentId: "doc-2",
      id: "doc:doc-2",
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
});
