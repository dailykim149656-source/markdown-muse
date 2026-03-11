import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PatchReviewDialog from "@/components/editor/PatchReviewDialog";
import { I18nContext } from "@/i18n/I18nProvider";
import type { DocumentPatchSet } from "@/types/documentPatch";

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

describe("PatchReviewDialog metrics", () => {
  it("renders provenance and confidence summary", () => {
    const patchSet: DocumentPatchSet = {
      author: "ai",
      createdAt: Date.now(),
      description: "Patch set",
      documentId: "doc-1",
      patchSetId: "patch-set-1",
      patches: [
        {
          author: "ai",
          confidence: 0.9,
          operation: "replace_text_range",
          patchId: "patch-1",
          reason: "Update section",
          sources: [{ chunkId: "chunk-1", sourceId: "source-1" }],
          status: "pending",
          suggestedText: "New text",
          target: { nodeId: "node-1", textRange: { end: 10, start: 0 }, type: "text_range" },
          title: "Patch One",
        },
        {
          author: "ai",
          confidence: 0.55,
          operation: "replace_text_range",
          patchId: "patch-2",
          reason: "Follow-up update",
          status: "pending",
          suggestedText: "Other text",
          target: { nodeId: "node-2", textRange: { end: 12, start: 0 }, type: "text_range" },
          title: "Patch Two",
        },
      ],
      status: "in_review",
      title: "Update suggestions",
    };

    renderWithI18n(
      <PatchReviewDialog
        acceptedPatchCount={1}
        onAccept={vi.fn()}
        onApply={vi.fn()}
        onClear={vi.fn()}
        onEdit={vi.fn()}
        onLoadPatchSet={vi.fn()}
        onOpenChange={vi.fn()}
        onReject={vi.fn()}
        open
        patchSet={patchSet}
      />,
    );

    expect(screen.getByText("patchReview.metricPatches")).toBeInTheDocument();
    expect(screen.getByText("patchReview.metricConfidence")).toBeInTheDocument();
    expect(screen.getByText("patchReview.metricProvenance")).toBeInTheDocument();
    expect(screen.getByText("patchReview.metricSources")).toBeInTheDocument();
    expect(screen.getByText("patchReview.confidenceMedium")).toBeInTheDocument();
    expect(screen.getByText('patchReview.metricAccepted:{"count":1}')).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText('patchReview.provenanceHintMissing:{"count":1}')).toBeInTheDocument();
    expect(screen.getByText('patchReview.provenanceGapCount:{"count":1}')).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "patchReview.provenanceGapsOnly" }));

    expect(screen.getByText("patchReview.provenanceGapTitle")).toBeInTheDocument();
    expect(screen.getByText("Patch Two")).toBeInTheDocument();
  }, 15000);
});
