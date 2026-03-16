import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AiAgentTab from "@/components/editor/AiAgentTab";
import { I18nContext } from "@/i18n/I18nProvider";
import type { LiveAgentRuntimeState } from "@/hooks/useLiveAgent";

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

const createLiveAgentState = (): LiveAgentRuntimeState => ({
  addDriveReference: vi.fn(),
  artifacts: [{
    candidates: [{
      excerpt: "Runbook excerpt",
      fileId: "file-1",
      fileName: "Runbook",
      modifiedTime: "2026-03-13T00:00:00Z",
      relevanceReason: "Matched terms: runbook, rollback.",
      webViewLink: "https://docs.google.com/document/d/file-1/edit",
    }],
    id: "artifact-1",
    kind: "drive_candidates",
    query: "rollback runbook",
    resolvedReferences: [{
      kind: "active_document",
      label: "Current Doc",
    }],
  }],
  availableLocalReferences: [],
  availableTargetDocuments: [],
  composerText: "Find a Google runbook",
  confirmPendingAction: vi.fn().mockResolvedValue(undefined),
  createSummaryDocumentFromArtifact: vi.fn(),
  discardPendingAction: vi.fn(),
  isSubmitting: false,
  latestDraftPreview: null,
  latestDriveCandidates: [],
  latestError: null,
  latestStatus: null,
  messages: [{
    createdAt: 1,
    id: "msg-1",
    role: "assistant",
    text: "I found a likely Google Doc match.",
  }],
  openArtifactPatchReview: vi.fn(),
  pendingConfirmation: null,
  queueDriveImport: vi.fn(),
  removeDriveReference: vi.fn(),
  resolveArtifactDocumentTarget: vi.fn().mockResolvedValue(undefined),
  resetThread: vi.fn(),
  selectedDriveReferences: [],
  selectedLocalReferenceIds: [],
  sendMessage: vi.fn().mockResolvedValue(undefined),
  setComposerText: vi.fn(),
  threadId: "thread-1",
  toggleLocalReference: vi.fn(),
});

describe("AiAgentTab", () => {
  it("renders artifact actions and core controls", () => {
    const liveAgent = createLiveAgentState();

    renderWithI18n(
      <AiAgentTab
        activeDocumentName="Current Doc"
        liveAgent={liveAgent}
      />,
    );

    expect(screen.getByRole("heading", { name: "aiDialog.agent.title" })).toBeInTheDocument();
    expect(screen.getByText("aiDialog.agent.currentTarget")).toBeInTheDocument();
    expect(screen.getByText("aiDialog.agent.googleDriveCandidates")).toBeInTheDocument();
    expect(screen.getByText("Runbook")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "aiDialog.agent.useReference" }));
    fireEvent.click(screen.getByRole("button", { name: "aiDialog.agent.importWorkspace" }));
    fireEvent.click(screen.getByRole("button", { name: "aiDialog.agent.reset" }));

    expect(liveAgent.addDriveReference).toHaveBeenCalledTimes(1);
    expect(liveAgent.queueDriveImport).toHaveBeenCalledTimes(1);
    expect(liveAgent.resetThread).toHaveBeenCalledTimes(1);
  });

  it("renders pending confirmation actions", () => {
    const liveAgent = {
      ...createLiveAgentState(),
      pendingConfirmation: {
        fileId: "file-1",
        fileName: "Runbook",
        type: "import_drive_document" as const,
      },
    };

    renderWithI18n(
      <AiAgentTab
        activeDocumentName="Current Doc"
        liveAgent={liveAgent}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "aiDialog.agent.import" }));
    fireEvent.click(screen.getByRole("button", { name: "aiDialog.agent.cancel" }));

    expect(liveAgent.confirmPendingAction).toHaveBeenCalledTimes(1);
    expect(liveAgent.discardPendingAction).toHaveBeenCalledTimes(1);
  });

  it("defers IME sync until composition ends", () => {
    const liveAgent = createLiveAgentState();

    renderWithI18n(
      <AiAgentTab
        activeDocumentName="Current Doc"
        liveAgent={liveAgent}
      />,
    );

    const textarea = screen.getByPlaceholderText("aiDialog.agent.placeholder");

    fireEvent.compositionStart(textarea);
    fireEvent.change(textarea, { target: { value: "임시" } });
    fireEvent.change(textarea, { target: { value: "입력" } });

    expect(liveAgent.setComposerText).not.toHaveBeenCalledWith("입력");

    fireEvent.compositionEnd(textarea, {
      currentTarget: { value: "완료" },
      target: { value: "완료" },
    });

    expect(liveAgent.setComposerText).toHaveBeenCalledWith("완료");
  });

  it("renders status banner without draft preview when agent status exists", () => {
    const liveAgent = {
      ...createLiveAgentState(),
      artifacts: [],
      latestStatus: {
        kind: "gemini_unavailable" as const,
        message: "Gemini unavailable",
      },
    };

    renderWithI18n(
      <AiAgentTab
        activeDocumentName="Current Doc"
        liveAgent={liveAgent}
      />,
    );

    expect(screen.getByText("Gemini unavailable")).toBeInTheDocument();
    expect(screen.queryByText("aiDialog.agent.draftPreview")).not.toBeInTheDocument();
  });
});
