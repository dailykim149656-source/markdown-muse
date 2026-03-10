import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ChangeMonitoringPanel from "@/components/editor/ChangeMonitoringPanel";
import DocumentHealthPanel from "@/components/editor/DocumentHealthPanel";
import { I18nContext } from "@/i18n/I18nProvider";
import type { KnowledgeHealthIssue } from "@/lib/knowledge/workspaceInsights";

const renderWithI18n = (ui: React.ReactNode) =>
  render(
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
      {ui}
    </I18nContext.Provider>,
  );

describe("Health diagnostics panels", () => {
  it("renders cause and next-step summaries for health issues", () => {
    const issues: KnowledgeHealthIssue[] = [
      {
        documentId: "doc-1",
        id: "issue-1",
        kind: "missing_section",
        message: "Section is missing",
        relatedDocumentIds: ["doc-1", "doc-2"],
        severity: "warning",
      },
    ];

    renderWithI18n(<DocumentHealthPanel issues={issues} />);

    expect(screen.getByText("knowledge.healthPanelTitle")).toBeInTheDocument();
    expect(screen.getByText("knowledge.healthCauseMissing")).toBeInTheDocument();
    expect(screen.getByText("knowledge.healthNextMissing")).toBeInTheDocument();
    expect(screen.getByText('knowledge.healthImpactRelated:{"count":1}')).toBeInTheDocument();
  });

  it("renders queue reason and priority in change monitoring", () => {
    const onSuggestUpdates = vi.fn();

    renderWithI18n(
      <ChangeMonitoringPanel
        changedSources={[]}
        impactQueue={[
          {
            changedDocumentId: "doc-source",
            changedDocumentName: "Source Doc",
            impactedDocumentId: "doc-target",
            impactedDocumentName: "Target Doc",
            issueCount: 2,
            relationKinds: ["referenced_by"],
          },
        ]}
        isRescanning={false}
        lastRescannedAt={null}
        onOpenDocument={vi.fn()}
        onOpenGraph={vi.fn()}
        onRescan={vi.fn()}
        onSuggestUpdates={onSuggestUpdates}
      />,
    );

    expect(screen.getByText("P1")).toBeInTheDocument();
    expect(screen.getByText('knowledge.changeMonitoringQueueReason:{"source":"Source Doc","target":"Target Doc"}')).toBeInTheDocument();
    expect(screen.getByText('knowledge.changeMonitoringQueueIssueHint:{"count":2}')).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "knowledge.changeMonitoringQueueAll" }));

    expect(onSuggestUpdates).toHaveBeenCalledWith("doc-source", "doc-target");
  });
});
