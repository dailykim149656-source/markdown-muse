import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
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

  it("renders AiAssistantDialog when opened", () => {
    renderWithI18n(
      <AiAssistantDialog
        busyAction={null}
        compareCandidates={[]}
        comparePreview={null}
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
    expect(screen.getByText("aiDialog.richTextOnlyTitle")).toBeInTheDocument();
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
