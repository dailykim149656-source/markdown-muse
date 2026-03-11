import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SuggestionQueuePanel from "@/components/editor/SuggestionQueuePanel";
import { I18nContext } from "@/i18n/I18nProvider";

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

describe("SuggestionQueuePanel", () => {
  it("opens review and dismisses queue items", () => {
    const onDismiss = vi.fn();
    const onOpenDocument = vi.fn();
    const onOpenGraph = vi.fn();
    const onOpenPatchReview = vi.fn();
    const onRetry = vi.fn();

    renderWithI18n(
      <SuggestionQueuePanel
        entries={[
          {
            attemptCount: 2,
            confidenceLabel: "medium",
            context: "consistency",
            hasPatchSet: true,
            id: "queue-1",
            issueId: "issue-12",
            issueKind: "missing_section",
            issuePriority: "high",
            issueReason: "A required section drifted.",
            patchCount: 3,
            patchSetTitle: "Update suggestions",
            reasonSummary: "A required section drifted.",
            sourceCount: 2,
            sourceDocumentId: "doc-1",
            sourceDocumentName: "Source Doc",
            status: "ready",
            targetDocumentId: "doc-2",
            targetDocumentName: "Target Doc",
            updatedAt: Date.now(),
          },
          {
            attemptCount: 1,
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
        onDismiss={onDismiss}
        onOpenDocument={onOpenDocument}
        onOpenGraph={onOpenGraph}
        onOpenPatchReview={onOpenPatchReview}
        onRetry={onRetry}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Source Doc" }));
    fireEvent.click(screen.getByRole("button", { name: "Target Doc" }));
    fireEvent.click(screen.getAllByRole("button", { name: "knowledge.graphExplore" })[1]);
    fireEvent.click(screen.getByRole("button", { name: "knowledge.suggestionQueueRerun" }));
    fireEvent.click(screen.getAllByRole("button", { name: "knowledge.suggestionQueueOpenReview" })[1]);
    fireEvent.click(screen.getAllByRole("button", { name: "knowledge.suggestionQueueDismiss" })[1]);

    expect(screen.getByText("knowledge.consistencyKindMissing")).toBeInTheDocument();
    expect(screen.getByText("knowledge.suggestionQueueHintConsistency")).toBeInTheDocument();
    expect(screen.getByText("knowledge.suggestionQueueConfidenceMedium")).toBeInTheDocument();
    expect(screen.getByText("knowledge.suggestionQueueSourceCount")).toBeInTheDocument();
    expect(screen.getByText("A required section drifted.")).toBeInTheDocument();
    expect(screen.getAllByText("knowledge.suggestionQueueAttempts").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "knowledge.suggestionQueueFailed (1)" }));

    expect(screen.getByText("Changed Doc")).toBeInTheDocument();
    expect(onOpenDocument).toHaveBeenNthCalledWith(1, "doc-1");
    expect(onOpenDocument).toHaveBeenNthCalledWith(2, "doc-2");
    expect(onOpenGraph).toHaveBeenCalledWith("queue-1");
    expect(onRetry).toHaveBeenCalledWith("queue-1");
    expect(onOpenPatchReview).toHaveBeenCalledWith("queue-1");
    expect(onDismiss).toHaveBeenCalledWith("queue-1");
  }, 15000);
});
