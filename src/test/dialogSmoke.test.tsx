import type { ComponentProps, ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AiAssistantDialog from "@/components/editor/AiAssistantDialog";
import KeyboardShortcutsModal from "@/components/editor/KeyboardShortcutsModal";
import PatchReviewDialog from "@/components/editor/PatchReviewDialog";
import ShareLinkDialog from "@/components/editor/ShareLinkDialog";
import type { PatchPreviewResult } from "@/hooks/useAiAssistant";
import { I18nContext } from "@/i18n/I18nProvider";
import type { DocumentComparisonDelta } from "@/lib/ai/compareDocuments";

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,test"),
  },
}));

const renderWithI18n = (ui: ReactNode) =>
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

const visualNavigatorStub = {
  canStart: false,
  clearHistory: vi.fn(),
  confirmPendingAction: vi.fn(),
  history: [],
  intent: "",
  isRunning: false,
  lastConfidence: null,
  lastError: null,
  lastRationale: null,
  pendingConfirmation: null,
  rejectPendingAction: vi.fn(),
  setIntent: vi.fn(),
  startRun: vi.fn(),
  statusText: null,
  stopReason: null,
  stopRun: vi.fn(),
};

const liveAgentStub: ComponentProps<typeof AiAssistantDialog>["liveAgent"] = {
  addDriveReference: vi.fn(),
  artifacts: [],
  availableLocalReferences: [],
  availableTargetDocuments: [],
  composerText: "",
  confirmPendingAction: vi.fn(),
  createSummaryDocumentFromArtifact: vi.fn(),
  discardPendingAction: vi.fn(),
  isSubmitting: false,
  latestDraftPreview: null,
  latestDriveCandidates: [],
  latestError: null,
  latestStatus: null,
  messages: [],
  openArtifactPatchReview: vi.fn(),
  pendingConfirmation: null,
  queueDriveImport: vi.fn(),
  removeDriveReference: vi.fn(),
  resolveArtifactDocumentTarget: vi.fn(),
  resetThread: vi.fn(),
  selectedDriveReferences: [],
  selectedLocalReferenceIds: [],
  sendMessage: vi.fn(),
  setComposerText: vi.fn(),
  threadId: "thread-1",
  toggleLocalReference: vi.fn(),
};

const defaultAiAssistantDialogProps: ComponentProps<typeof AiAssistantDialog> = {
  activeDocumentName: "Active Doc",
  aiUnavailableMessage: null,
  busyAction: null,
  compareCandidates: [],
  comparePreview: null,
  lastSummaryObjective: null,
  liveAgent: liveAgentStub,
  onCompare: vi.fn(),
  onCreateSummaryDocument: vi.fn(),
  onExtractProcedure: vi.fn(),
  onGenerateSection: vi.fn(),
  onGenerateToc: vi.fn(),
  onLoadTocPatch: vi.fn(),
  onOpenChange: vi.fn(),
  onSuggestUpdates: vi.fn(),
  onSummarize: vi.fn(),
  open: true,
  procedureResult: null,
  richTextAvailable: true,
  summaryResult: null,
  tocPreview: null,
  updateSuggestionPreview: null,
  visualNavigator: visualNavigatorStub,
};

const buildPreview = (
  deltas: DocumentComparisonDelta[],
  targetDocumentName = "Reference Doc",
): PatchPreviewResult => ({
  comparison: {
    counts: deltas.reduce((counts, delta) => {
      counts[delta.kind] += 1;
      return counts;
    }, {
      added: 0,
      changed: 0,
      inconsistent: 0,
      removed: 0,
    }),
    deltas,
    sourceDocumentId: "doc-active",
    targetDocumentId: "doc-reference",
  },
  patchCount: deltas.length,
  patchSet: null,
  patchSetTitle: "Comparison patch set",
  targetDocumentName,
});

describe("Dialog smoke paths", () => {
  it("renders ShareLinkDialog when opened", () => {
    renderWithI18n(
      <ShareLinkDialog
        link={null}
        onCopy={vi.fn()}
        onOpenChange={vi.fn()}
        open
      />,
    );

    expect(screen.getByText("shareDialog.title")).toBeInTheDocument();
  });

  it("renders ShareLinkDialog with a real link and QR path", async () => {
    renderWithI18n(
      <ShareLinkDialog
        link="https://example.com/doc"
        onCopy={vi.fn()}
        onOpenChange={vi.fn()}
        open
      />,
    );

    expect(screen.getByDisplayValue("https://example.com/doc")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByAltText("shareDialog.qrAlt")).toBeInTheDocument();
    });
  });

  it("renders PatchReviewDialog when opened", () => {
    renderWithI18n(
      <PatchReviewDialog
        acceptedPatchCount={0}
        onAccept={vi.fn()}
        onAcceptSelected={vi.fn()}
        onApply={vi.fn()}
        onClear={vi.fn()}
        onEdit={vi.fn()}
        lastApplyReport={null}
        onLoadPatchSet={vi.fn()}
        onOpenChange={vi.fn()}
        onReject={vi.fn()}
        onRejectSelected={vi.fn()}
        open
        patchSet={null}
        workspaceSyncWarnings={[]}
      />,
    );

    expect(screen.getByText("patchReview.title")).toBeInTheDocument();
  });

  it("keeps PatchReviewDialog constrained inside the viewport layout when a patch set is loaded", () => {
    renderWithI18n(
      <PatchReviewDialog
        acceptedPatchCount={1}
        onAccept={vi.fn()}
        onAcceptSelected={vi.fn()}
        onApply={vi.fn()}
        onClear={vi.fn()}
        onEdit={vi.fn()}
        lastApplyReport={null}
        onLoadPatchSet={vi.fn()}
        onOpenChange={vi.fn()}
        onReject={vi.fn()}
        onRejectSelected={vi.fn()}
        open
        patchSet={{
          author: "ai",
          createdAt: Date.now(),
          documentId: "doc-1",
          patchSetId: "set-1",
          patches: [{
            author: "ai",
            operation: "replace_text_range",
            originalText: "Old intro",
            patchId: "patch-1",
            payload: { kind: "replace_text", text: "New intro" },
            status: "accepted",
            suggestedText: "New intro",
            target: { endOffset: 5, nodeId: "blk_1", startOffset: 0, targetType: "text_range" },
            title: "Update intro",
          }],
          status: "in_review",
          title: "Review updates",
        }}
        workspaceSyncWarnings={[]}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "patchReview.title" });
    expect(dialog).toHaveClass("overflow-hidden");
    expect(dialog).toHaveClass("grid");
    expect(screen.getByRole("button", { name: "patchReview.applyAccepted" })).toBeInTheDocument();
  });

  it("renders AiAssistantDialog when opened", () => {
    renderWithI18n(
      <AiAssistantDialog
        {...defaultAiAssistantDialogProps}
        richTextAvailable={false}
      />,
    );

    expect(screen.getByText("aiDialog.title")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Agent" })).toBeInTheDocument();
  });

  it("disables AI action buttons when Gemini is unavailable", () => {
    renderWithI18n(
      <AiAssistantDialog
        {...defaultAiAssistantDialogProps}
        aiUnavailableMessage="Gemini가 연결되어 있지 않습니다."
      />,
    );

    expect(screen.getAllByText("Gemini가 연결되어 있지 않습니다.").length).toBeGreaterThan(0);
    expect(screen.getByRole("tab", { name: "aiDialog.tabs.summary" })).toBeInTheDocument();
  });

  it("reveals changed comparison details only when requested", () => {
    const changedDelta: DocumentComparisonDelta = {
      deltaId: "delta-compare",
      kind: "changed",
      similarityScore: 0.72,
      source: {
        chunkIds: ["chunk-source-1"],
        ingestionId: "doc-active",
        level: 2,
        path: ["Overview", "Changed section"],
        sectionId: "source-section",
        text: "Old body paragraph",
        title: "Changed section",
      },
      summary: "Changed section summary",
      target: {
        chunkIds: ["chunk-target-1"],
        ingestionId: "doc-reference",
        level: 2,
        path: ["Overview", "Changed section"],
        sectionId: "target-section",
        text: "New body paragraph",
        title: "Changed section",
      },
    };

    renderWithI18n(
      <AiAssistantDialog
        {...defaultAiAssistantDialogProps}
        comparePreview={buildPreview([changedDelta])}
        initialTab="compare"
      />,
    );

    expect(screen.getByRole("button", { name: "aiDialog.details.show" })).toBeInTheDocument();
    expect(screen.queryByText("Changed section")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "aiDialog.details.show" }));

    expect(screen.getByText("Changed section")).toBeInTheDocument();
    expect(screen.getByText("Changed section summary")).toBeInTheDocument();
    expect(screen.getByText("Old body paragraph")).toBeInTheDocument();
    expect(screen.getByText("New body paragraph")).toBeInTheDocument();
    expect(screen.getByText("aiDialog.details.similarity")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "aiDialog.details.hide" }));
    expect(screen.queryByText("Changed section")).not.toBeInTheDocument();
  });

  it("shows target-only details for added update sections", () => {
    const addedDelta: DocumentComparisonDelta = {
      deltaId: "delta-added",
      kind: "added",
      similarityScore: 0,
      summary: "Added section summary",
      target: {
        chunkIds: ["chunk-target-1"],
        ingestionId: "doc-reference",
        level: 2,
        path: ["Appendix", "Added section"],
        sectionId: "target-section",
        text: "Target-only body",
        title: "Added section",
      },
    };

    renderWithI18n(
      <AiAssistantDialog
        {...defaultAiAssistantDialogProps}
        initialTab="update"
        updateSuggestionPreview={buildPreview([addedDelta])}
      />,
    );

    expect(screen.getByRole("button", { name: "aiDialog.details.show" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "aiDialog.details.show" }));

    expect(screen.getByText("Added section")).toBeInTheDocument();
    expect(screen.getByText("Target-only body")).toBeInTheDocument();
    expect(screen.queryByText("Source-only body")).not.toBeInTheDocument();
  });

  it("shows source-only details for removed update sections", () => {
    const removedDelta: DocumentComparisonDelta = {
      deltaId: "delta-removed",
      kind: "removed",
      similarityScore: 0,
      source: {
        chunkIds: ["chunk-source-1"],
        ingestionId: "doc-active",
        level: 2,
        path: ["Appendix", "Removed section"],
        sectionId: "source-section",
        text: "Source-only body",
        title: "Removed section",
      },
      summary: "Removed section summary",
    };

    renderWithI18n(
      <AiAssistantDialog
        {...defaultAiAssistantDialogProps}
        initialTab="update"
        updateSuggestionPreview={buildPreview([removedDelta])}
      />,
    );

    expect(screen.getByRole("button", { name: "aiDialog.details.show" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "aiDialog.details.show" }));

    expect(screen.getByText("Removed section")).toBeInTheDocument();
    expect(screen.getByText("Source-only body")).toBeInTheDocument();
    expect(screen.queryByText("Target-only body")).not.toBeInTheDocument();
  });

  it("shows an empty state when a preview has no detailed deltas", () => {
    renderWithI18n(
      <AiAssistantDialog
        {...defaultAiAssistantDialogProps}
        initialTab="update"
        updateSuggestionPreview={buildPreview([])}
      />,
    );

    expect(screen.getByRole("button", { name: "aiDialog.details.show" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "aiDialog.details.show" }));

    expect(screen.getByText("aiDialog.details.empty")).toBeInTheDocument();
  });

  it("renders KeyboardShortcutsModal when opened", () => {
    renderWithI18n(
      <KeyboardShortcutsModal
        onOpenChange={vi.fn()}
        open
      />,
    );

    expect(screen.getByText("keyboardShortcuts.title")).toBeInTheDocument();
    expect(screen.getByText("keyboardShortcuts.description")).toBeInTheDocument();
    expect(screen.getByText(/keyboardShortcuts\.platformHint/)).toBeInTheDocument();
  });
});
