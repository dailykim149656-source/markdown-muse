import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AiAssistantDialog from "@/components/editor/AiAssistantDialog";
import KeyboardShortcutsModal from "@/components/editor/KeyboardShortcutsModal";
import PatchReviewDialog from "@/components/editor/PatchReviewDialog";
import ShareLinkDialog from "@/components/editor/ShareLinkDialog";
import { I18nContext } from "@/i18n/I18nProvider";

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
        onApply={vi.fn()}
        onClear={vi.fn()}
        onEdit={vi.fn()}
        onLoadPatchSet={vi.fn()}
        onOpenChange={vi.fn()}
        onReject={vi.fn()}
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
        onApply={vi.fn()}
        onClear={vi.fn()}
        onEdit={vi.fn()}
        onLoadPatchSet={vi.fn()}
        onOpenChange={vi.fn()}
        onReject={vi.fn()}
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
        activeDocumentName="Active Doc"
        busyAction={null}
        compareCandidates={[]}
        comparePreview={null}
        liveAgent={{
          addDriveReference: vi.fn(),
          availableLocalReferences: [],
          composerText: "",
          confirmPendingAction: vi.fn(),
          discardPendingAction: vi.fn(),
          isSubmitting: false,
          latestDraftPreview: null,
          latestDriveCandidates: [],
          latestError: null,
          latestStatus: null,
          messages: [],
          pendingConfirmation: null,
          queueDriveImport: vi.fn(),
          removeDriveReference: vi.fn(),
          resetThread: vi.fn(),
          selectedDriveReferences: [],
          selectedLocalReferenceIds: [],
          sendMessage: vi.fn(),
          setComposerText: vi.fn(),
          threadId: "thread-1",
          toggleLocalReference: vi.fn(),
        }}
        onCompare={vi.fn()}
        onExtractProcedure={vi.fn()}
        onGenerateSection={vi.fn()}
        onGenerateToc={vi.fn()}
        onLoadTocPatch={vi.fn()}
        onOpenChange={vi.fn()}
        onSuggestUpdates={vi.fn()}
        onSummarize={vi.fn()}
        open
        procedureResult={null}
        richTextAvailable={false}
        summaryResult={null}
        tocPreview={null}
        updateSuggestionPreview={null}
      />,
    );

    expect(screen.getByText("aiDialog.title")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Agent" })).toBeInTheDocument();
  });

  it("disables AI action buttons when Gemini is unavailable", async () => {
    renderWithI18n(
      <AiAssistantDialog
        activeDocumentName="Active Doc"
        aiUnavailableMessage="Gemini가 연결되어 있지 않습니다."
        busyAction={null}
        compareCandidates={[]}
        comparePreview={null}
        liveAgent={{
          addDriveReference: vi.fn(),
          availableLocalReferences: [],
          composerText: "",
          confirmPendingAction: vi.fn(),
          discardPendingAction: vi.fn(),
          isSubmitting: false,
          latestDraftPreview: null,
          latestDriveCandidates: [],
          latestError: null,
          latestStatus: null,
          messages: [],
          pendingConfirmation: null,
          queueDriveImport: vi.fn(),
          removeDriveReference: vi.fn(),
          resetThread: vi.fn(),
          selectedDriveReferences: [],
          selectedLocalReferenceIds: [],
          sendMessage: vi.fn(),
          setComposerText: vi.fn(),
          threadId: "thread-1",
          toggleLocalReference: vi.fn(),
        }}
        onCompare={vi.fn()}
        onExtractProcedure={vi.fn()}
        onGenerateSection={vi.fn()}
        onGenerateToc={vi.fn()}
        onLoadTocPatch={vi.fn()}
        onOpenChange={vi.fn()}
        onSuggestUpdates={vi.fn()}
        onSummarize={vi.fn()}
        open
        procedureResult={null}
        richTextAvailable
        summaryResult={null}
        tocPreview={null}
        updateSuggestionPreview={null}
      />,
    );

    expect(screen.getAllByText("Gemini가 연결되어 있지 않습니다.").length).toBeGreaterThan(0);
    expect(screen.getByRole("tab", { name: "aiDialog.tabs.summary" })).toBeInTheDocument();
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
