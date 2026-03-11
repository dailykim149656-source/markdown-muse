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
    {
      description: "Alpha Doc has an unresolved reference to Beta Doc.",
      group: "issue",
      id: "edge-issue-1",
      kind: "issue_relation",
      sourceDocumentId: "doc-alpha",
      sourceId: "doc:alpha",
      targetDocumentId: "doc-beta",
      targetId: "doc:beta",
      weight: 6,
    },
  ],
  issues: [{
    documentId: "doc-alpha",
    id: "issue-1",
    kind: "unresolved_reference",
    message: "Alpha Doc references a missing anchor in Beta Doc.",
    relatedDocumentIds: ["doc-alpha", "doc-beta"],
    severity: "warning",
  }],
  nodes: [
    {
      dominantIssueKind: "unresolved_reference",
      documentId: "doc-alpha",
      id: "doc:alpha",
      issueCount: 1,
      issueSeverity: "warning",
      kind: "document",
      label: "Alpha Doc",
    },
    {
      dominantIssueKind: "unresolved_reference",
      documentId: "doc-beta",
      id: "doc:beta",
      issueCount: 1,
      issueSeverity: "warning",
      kind: "document",
      label: "Beta Doc",
    },
    {
      documentId: "doc-gamma",
      id: "doc:gamma",
      issueCount: 0,
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
    expect(screen.getAllByText("knowledge.issueReference").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Gamma Doc").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "knowledge.graphFocusSelection" }));

    await waitFor(() => {
      expect(screen.queryByText("Gamma Doc")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "knowledge.graphResetView" }));

    await waitFor(() => {
      expect(screen.getAllByText("Gamma Doc").length).toBeGreaterThan(0);
    });
  }, 15000);

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
  }, 15000);

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

  it("supports an issues graph mode", async () => {
    renderDialog();

    await waitFor(() => {
      expect(screen.getAllByText("Gamma Doc").length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("button", { name: "knowledge.graphModeIssues" }));

    await waitFor(() => {
      expect(screen.queryByText("Gamma Doc")).not.toBeInTheDocument();
    });

    expect(screen.getAllByText("Alpha Doc").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Beta Doc").length).toBeGreaterThan(0);
  });
});
