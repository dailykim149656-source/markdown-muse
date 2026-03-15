import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AiAgentTab from "@/components/editor/AiAgentTab";
import type { LiveAgentRuntimeState } from "@/hooks/useLiveAgent";

const createLiveAgentState = (): LiveAgentRuntimeState => ({
  addDriveReference: vi.fn(),
  availableLocalReferences: [],
  composerText: "Find a Google runbook",
  confirmPendingAction: vi.fn().mockResolvedValue(undefined),
  discardPendingAction: vi.fn(),
  isSubmitting: false,
  latestDraftPreview: null,
  latestDriveCandidates: [{
    excerpt: "Runbook excerpt",
    fileId: "file-1",
    fileName: "Runbook",
    modifiedTime: "2026-03-13T00:00:00Z",
    relevanceReason: "Matched terms: runbook, rollback.",
    webViewLink: "https://docs.google.com/document/d/file-1/edit",
  }],
  latestError: null,
  latestStatus: null,
  messages: [{
    createdAt: 1,
    id: "msg-1",
    role: "assistant",
    text: "I found a likely Google Doc match.",
  }],
  pendingConfirmation: null,
  queueDriveImport: vi.fn(),
  removeDriveReference: vi.fn(),
  resetThread: vi.fn(),
  selectedDriveReferences: [],
  selectedLocalReferenceIds: [],
  sendMessage: vi.fn().mockResolvedValue(undefined),
  setComposerText: vi.fn(),
  threadId: "thread-1",
  toggleLocalReference: vi.fn(),
});

describe("AiAgentTab", () => {
  it("renders candidate actions and draft controls", () => {
    const liveAgent = createLiveAgentState();

    render(
      <AiAgentTab
        activeDocumentName="Current Doc"
        liveAgent={liveAgent}
      />,
    );

    expect(screen.getByRole("heading", { name: "Agent" })).toBeInTheDocument();
    expect(screen.getByText("Current target: Current Doc")).toBeInTheDocument();
    expect(screen.getByText("Google Drive candidates")).toBeInTheDocument();
    expect(screen.getByText("Runbook")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Use as reference" }));
    fireEvent.click(screen.getByRole("button", { name: "Import into workspace" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset chat" }));

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

    render(
      <AiAgentTab
        activeDocumentName="Current Doc"
        liveAgent={liveAgent}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(liveAgent.confirmPendingAction).toHaveBeenCalledTimes(1);
    expect(liveAgent.discardPendingAction).toHaveBeenCalledTimes(1);
  });

  it("defers IME sync until composition ends", () => {
    const liveAgent = createLiveAgentState();

    render(
      <AiAgentTab
        activeDocumentName="Current Doc"
        liveAgent={liveAgent}
      />,
    );

    const textarea = screen.getByPlaceholderText("Ask the agent to revise this document or search Google Drive...");

    fireEvent.compositionStart(textarea);
    fireEvent.change(textarea, { target: { value: "ㅎ" } });
    fireEvent.change(textarea, { target: { value: "하" } });

    expect(liveAgent.setComposerText).not.toHaveBeenCalledWith("하");

    fireEvent.compositionEnd(textarea, {
      currentTarget: { value: "하" },
      target: { value: "하" },
    });

    expect(liveAgent.setComposerText).toHaveBeenCalledWith("하");
  });

  it("renders status banner without preview when agent status exists", () => {
    const liveAgent = {
      ...createLiveAgentState(),
      latestDriveCandidates: [],
      latestStatus: {
        kind: "gemini_unavailable" as const,
        message: "Gemini가 연결되어 있지 않습니다.",
      },
    };

    render(
      <AiAgentTab
        activeDocumentName="Current Doc"
        liveAgent={liveAgent}
      />,
    );

    expect(screen.getByText("Gemini가 연결되어 있지 않습니다.")).toBeInTheDocument();
    expect(screen.queryByText(/Draft preview:/)).not.toBeInTheDocument();
  });
});
