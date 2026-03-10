import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ChangeMonitoringPanel from "@/components/editor/ChangeMonitoringPanel";
import ConsistencyIssuesPanel from "@/components/editor/ConsistencyIssuesPanel";
import DocumentImpactPanel from "@/components/editor/DocumentImpactPanel";
import { I18nContext } from "@/i18n/I18nProvider";
import type { KnowledgeConsistencyIssue } from "@/lib/knowledge/consistencyAnalysis";
import type { KnowledgeDocumentImpact } from "@/lib/knowledge/workspaceInsights";

const renderWithI18n = (ui: React.ReactNode) =>
  render(
    <I18nContext.Provider
      value={{
        locale: "en",
        setLocale: vi.fn(),
        t: (key) => key,
      }}
    >
      {ui}
    </I18nContext.Provider>,
  );

describe("Knowledge graph action hooks", () => {
  it("opens graph from DocumentImpactPanel", () => {
    const onOpenGraph = vi.fn();
    const impact: KnowledgeDocumentImpact = {
      documentId: "doc-1",
      impactedDocumentCount: 1,
      inboundReferenceCount: 1,
      issues: [],
      outboundReferenceCount: 1,
      paths: [],
      relatedDocuments: [
        {
          documentId: "doc-2",
          issueCount: 0,
          name: "Related Doc",
          relationKinds: ["references"],
        },
      ],
    };

    renderWithI18n(
      <DocumentImpactPanel
        impact={impact}
        onOpenDocument={vi.fn()}
        onOpenGraph={onOpenGraph}
        onSuggestUpdates={vi.fn()}
        suggestableDocumentIds={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "knowledge.graphExplore" }));

    expect(onOpenGraph).toHaveBeenCalledWith({
      context: "impact",
      nodeDocumentId: "doc-2",
      sourceDocumentId: "doc-1",
      targetDocumentId: "doc-2",
    });
  });

  it("opens graph from ConsistencyIssuesPanel", () => {
    const onOpenGraph = vi.fn();
    const issues: KnowledgeConsistencyIssue[] = [
      {
        actionPriority: "high",
        actionReason: "Important issue.",
        causalChain: {
          issueKind: "missing_section",
          sourceDocumentId: "doc-1",
          sourceDocumentName: "Source Doc",
          targetDocumentId: "doc-2",
          targetDocumentName: "Target Doc",
        },
        comparison: {
          counts: { added: 0, changed: 0, inconsistent: 0, removed: 1 },
          deltas: [],
          sourceDocumentId: "doc-1",
          targetDocumentId: "doc-2",
        },
        documentId: "doc-1",
        id: "issue-1",
        kind: "missing_section",
        message: "Missing section",
        relatedDocumentId: "doc-2",
        relatedDocumentName: "Target Doc",
        severity: "warning",
      },
    ];

    renderWithI18n(
      <ConsistencyIssuesPanel
        activeDocumentId="doc-1"
        activeDocumentName="Source Doc"
        issues={issues}
        onOpenDocument={vi.fn()}
        onOpenGraph={onOpenGraph}
        onSuggestUpdates={vi.fn()}
        suggestableDocumentIds={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "knowledge.graphExplore" }));

    expect(onOpenGraph).toHaveBeenCalledWith({
      context: "consistency",
      issueId: "issue-1",
      issueKind: "missing_section",
      issuePriority: "high",
      issueReason: "Important issue.",
      nodeDocumentId: "doc-2",
      sourceDocumentId: "doc-1",
      targetDocumentId: "doc-2",
    });
  });

  it("opens graph from ChangeMonitoringPanel", () => {
    const onOpenGraph = vi.fn();

    renderWithI18n(
      <ChangeMonitoringPanel
        changedSources={[]}
        impactQueue={[
          {
            changedDocumentId: "doc-source",
            changedDocumentName: "Source Doc",
            impactedDocumentId: "doc-target",
            impactedDocumentName: "Target Doc",
            issueCount: 1,
            relationKinds: ["references"],
          },
        ]}
        isRescanning={false}
        lastRescannedAt={null}
        onOpenDocument={vi.fn()}
        onOpenGraph={onOpenGraph}
        onRescan={vi.fn()}
        onSuggestUpdates={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "knowledge.graphExplore" }));

    expect(onOpenGraph).toHaveBeenCalledWith({
      context: "change",
      nodeDocumentId: "doc-target",
      sourceDocumentId: "doc-source",
      targetDocumentId: "doc-target",
    });
  });
});
