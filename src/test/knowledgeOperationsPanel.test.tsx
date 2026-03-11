import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import KnowledgeOperationsPanel from "@/components/editor/KnowledgeOperationsPanel";
import { I18nContext } from "@/i18n/I18nProvider";

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

describe("KnowledgeOperationsPanel", () => {
  it("shows release-gate style metrics and opens patch review", () => {
    const onOpenNextReady = vi.fn();
    const onOpenPatchReview = vi.fn();
    const onRetryFailed = vi.fn();
    const writeText = vi.fn().mockResolvedValue(undefined);

    Object.assign(navigator, {
      clipboard: {
        writeText,
      },
    });

    renderWithI18n(
      <KnowledgeOperationsPanel
        acceptedPatchCount={2}
        checklistCompletedCount={3}
        checklistTotalCount={10}
        documentCount={12}
        edgeCount={220}
        issueCount={3}
        nodeCount={150}
        onOpenNextReady={onOpenNextReady}
        onOpenPatchReview={onOpenPatchReview}
        onRetryFailed={onRetryFailed}
        patchCount={4}
        queue={[
          {
            attemptCount: 1,
            confidenceLabel: "medium",
            context: "consistency",
            hasPatchSet: true,
            id: "queue-1",
            patchCount: 2,
            sourceCount: 1,
            sourceDocumentId: "doc-1",
            sourceDocumentName: "Source Doc",
            status: "ready",
            targetDocumentId: "doc-2",
            targetDocumentName: "Target Doc",
            updatedAt: Date.now() - 45 * 60_000,
          },
          {
            attemptCount: 2,
            context: "change",
            hasPatchSet: false,
            id: "queue-2",
            sourceDocumentId: "doc-3",
            sourceDocumentName: "Changed Doc",
            status: "failed",
            targetDocumentId: "doc-4",
            targetDocumentName: "Impacted Doc",
            updatedAt: Date.now() - 5 * 60_000,
          },
        ]}
      />,
    );

    expect(screen.getByText("knowledge.operationsTitle")).toBeInTheDocument();
    expect(screen.getByText("knowledge.operationsAttention")).toBeInTheDocument();
    expect(screen.getByText("knowledge.operationsProvenanceCoverage")).toBeInTheDocument();
    expect(screen.getByText('knowledge.operationsFailureHint:{"count":1}')).toBeInTheDocument();
    expect(screen.getAllByText('knowledge.operationsCheckFailures:{"value":1}').length).toBeGreaterThan(0);
    expect(screen.getByText('knowledge.operationsCheckRunning:{"value":0}')).toBeInTheDocument();
    expect(screen.getByText('knowledge.operationsCheckProvenance:{"value":100}')).toBeInTheDocument();
    expect(screen.getAllByText("knowledge.operationsHold").length).toBeGreaterThan(0);
    expect(screen.getAllByText("knowledge.operationsPass").length).toBeGreaterThan(0);
    expect(screen.getByText("knowledge.operationsSummaryTitle")).toBeInTheDocument();
    expect(screen.getByText("knowledge.operationsWorkspaceScale")).toBeInTheDocument();
    expect(screen.getByText("knowledge.operationsScaleMedium")).toBeInTheDocument();
    expect(screen.getByText('knowledge.operationsWorkspaceDocs:{"count":12}')).toBeInTheDocument();
    expect(screen.getByText("knowledge.operationsScaleHintMedium")).toBeInTheDocument();
    expect(screen.getByText("knowledge.operationsPerformanceBudget")).toBeInTheDocument();
    expect(screen.getByText('knowledge.operationsBatchHint:{"count":2}')).toBeInTheDocument();
    expect(screen.getByText("knowledge.operationsValidatedRangeHealthy")).toBeInTheDocument();
    expect(screen.getByText('knowledge.operationsCheckValidatedRange:{"value":"knowledge.operationsScaleSupported"}')).toBeInTheDocument();
    expect(screen.getAllByText('knowledge.operationsCheckChecklist:{"value":"3/10"}').length).toBeGreaterThan(0);
    expect(screen.getByText("knowledge.operationsRecommendationTitle")).toBeInTheDocument();
    expect(screen.getByText("knowledge.operationsRecommendationRetryFailed")).toBeInTheDocument();
    expect(screen.getByText("knowledge.operationsBlockersTitle")).toBeInTheDocument();
    expect(screen.getAllByText('knowledge.operationsCheckFailures:{"value":1}').length).toBeGreaterThan(0);
    expect(screen.getByText("knowledge.operationsReviewProgress")).toBeInTheDocument();
    expect(screen.getByText("knowledge.operationsChecklist")).toBeInTheDocument();
    expect(screen.getByText('knowledge.operationsChecklistProgress:{"completed":3,"total":10}')).toBeInTheDocument();
    expect(screen.getByText("knowledge.operationsOldestAge")).toBeInTheDocument();
    expect(screen.getByText('knowledge.operationsOldestAgeValue:{"count":45}')).toBeInTheDocument();
    expect(screen.getByText('knowledge.operationsRetryPressure:{"count":1}')).toBeInTheDocument();

    const nextReadyButton = screen.getByRole("button", { name: "knowledge.operationsOpenNextReview" });
    expect(nextReadyButton.className).toContain("w-full");
    expect(nextReadyButton.className).toContain("whitespace-normal");

    fireEvent.click(nextReadyButton);
    fireEvent.click(screen.getByRole("button", { name: "knowledge.operationsOpenPatchReview" }));
    fireEvent.click(screen.getAllByRole("button", { name: "knowledge.operationsRetryFailed" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "knowledge.operationsCopySummary" }));

    expect(onOpenNextReady).toHaveBeenCalled();
    expect(onOpenPatchReview).toHaveBeenCalled();
    expect(onRetryFailed).toHaveBeenCalled();
    expect(writeText).toHaveBeenCalled();
  }, 15000);
});
