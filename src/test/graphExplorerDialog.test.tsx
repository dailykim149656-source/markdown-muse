import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import GraphExplorerDialog from "@/components/editor/GraphExplorerDialog";
import { I18nContext } from "@/i18n/I18nProvider";
import type { KnowledgeWorkspaceInsights } from "@/lib/knowledge/workspaceInsights";

const insightsFixture: KnowledgeWorkspaceInsights = {
  edges: [
    {
      description: "Alpha references Beta.",
      group: "reference",
      id: "edge-1",
      kind: "references",
      sourceDocumentId: "doc-alpha",
      sourceId: "doc:alpha",
      targetDocumentId: "doc-beta",
      targetId: "doc:beta",
      weight: 2,
    },
  ],
  issues: [],
  nodes: [
    {
      documentId: "doc-alpha",
      id: "doc:alpha",
      kind: "document",
      label: "Alpha Doc",
    },
    {
      documentId: "doc-beta",
      id: "doc:beta",
      kind: "document",
      label: "Beta Doc",
    },
    {
      documentId: "doc-gamma",
      id: "doc:gamma",
      kind: "document",
      label: "Gamma Doc",
    },
  ],
  summary: {
    documentNodeCount: 3,
    edgeCount: 1,
    imageNodeCount: 0,
    issueCount: 0,
    referenceEdgeCount: 1,
    sectionNodeCount: 0,
    similarEdgeCount: 0,
    staleIssueCount: 0,
  },
};

const renderDialog = (overrides: Record<string, unknown> = {}) =>
  render(
    <I18nContext.Provider
      value={{
        locale: "en",
        setLocale: vi.fn(),
        t: (key) => key,
      }}
    >
      <GraphExplorerDialog
        insights={insightsFixture}
        onOpenChange={vi.fn()}
        onOpenDocument={vi.fn()}
        open
        {...overrides}
      />
    </I18nContext.Provider>,
  );

describe("GraphExplorerDialog", () => {
  it("focuses on the selected node neighborhood and resets the view", async () => {
    renderDialog();

    await waitFor(() => {
      expect(screen.getAllByText("Alpha Doc").length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText("Gamma Doc").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "knowledge.graphFocusSelection" }));

    await waitFor(() => {
      expect(screen.queryByText("Gamma Doc")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "knowledge.graphResetView" }));

    await waitFor(() => {
      expect(screen.getAllByText("Gamma Doc").length).toBeGreaterThan(0);
    });
  });

  it("reports selected node changes", async () => {
    const onSelectedNodeChange = vi.fn();
    renderDialog({ onSelectedNodeChange });

    await waitFor(() => {
      expect(onSelectedNodeChange).toHaveBeenCalledWith("doc:alpha");
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Beta Doc" })[0]);

    await waitFor(() => {
      expect(onSelectedNodeChange).toHaveBeenCalledWith("doc:beta");
    });
  });

  it("shows large-workspace guardrails", () => {
    render(
      <I18nContext.Provider
        value={{
          locale: "en",
          setLocale: vi.fn(),
          t: (key) => key,
        }}
      >
        <GraphExplorerDialog
          insights={{
            ...insightsFixture,
            summary: {
              ...insightsFixture.summary,
              documentNodeCount: 120,
              edgeCount: 950,
              sectionNodeCount: 400,
            },
          }}
          onOpenChange={vi.fn()}
          onOpenDocument={vi.fn()}
          open
        />
      </I18nContext.Provider>,
    );

    expect(screen.getByText("knowledge.graphScaleLarge")).toBeInTheDocument();
    expect(screen.getByText("knowledge.graphScaleHintLarge")).toBeInTheDocument();
  });
});
