import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentTurnRequest } from "../../src/types/liveAgent";

const generateMultimodalStructuredJsonMock = vi.fn();
const resolveWorkspaceSessionForAgentMock = vi.fn();

const ORIGINAL_ENV = {
  VITEST: process.env.VITEST,
};

beforeEach(() => {
  vi.resetModules();
  generateMultimodalStructuredJsonMock.mockReset();
  resolveWorkspaceSessionForAgentMock.mockReset();
  process.env.VITEST = "true";
  vi.doMock("../../server/modules/gemini/client", async () => {
    const actual = await vi.importActual<typeof import("../../server/modules/gemini/client")>("../../server/modules/gemini/client");

    return {
      ...actual,
      generateMultimodalStructuredJson: (...args: Parameters<typeof generateMultimodalStructuredJsonMock>) =>
        generateMultimodalStructuredJsonMock(...args),
    };
  });
  vi.doMock("../../server/modules/agent/resolveWorkspaceSessionForAgent", () => ({
    resolveWorkspaceSessionForAgent: (...args: Parameters<typeof resolveWorkspaceSessionForAgentMock>) =>
      resolveWorkspaceSessionForAgentMock(...args),
  }));
});

afterEach(() => {
  process.env.VITEST = ORIGINAL_ENV.VITEST;
});

describe("handleAgentTurn", () => {
  it("returns a structured agent response instead of throwing when workspace session lookup degrades", async () => {
    resolveWorkspaceSessionForAgentMock.mockResolvedValue({
      presentCookieNames: ["__session"],
      sessionLookupFailed: true,
      workspaceConnected: false,
    });
    generateMultimodalStructuredJsonMock.mockResolvedValue({
      action: "search_drive_documents",
      arguments: {
        query: "find the rollback runbook",
      },
      confidence: 0.95,
      missingInformation: [],
      reason: "Search Google Drive.",
    });

    const { handleAgentTurn } = await import("../../server/aiServer");
    const response = await handleAgentTurn({
      headers: {
        cookie: "__session=stale-session",
      },
      method: "POST",
      url: "/api/ai/agent/turn",
    } as never, {
      activeDocument: null,
      availableTargetDocuments: [],
      driveReferenceFileIds: [],
      localReferences: [],
      messages: [{
        createdAt: Date.now(),
        id: "msg-1",
        role: "user",
        text: "Find the rollback runbook in Google Drive.",
      }],
      targetDefault: "active_document",
      threadId: "thread-1",
    } satisfies AgentTurnRequest, "req-3");

    expect(resolveWorkspaceSessionForAgentMock).toHaveBeenCalledWith(expect.any(Object), "req-3");
    expect(response.assistantMessage).toEqual(expect.objectContaining({
      role: "assistant",
      text: expect.any(String),
    }));
    expect(response.effect).toEqual(expect.objectContaining({
      type: expect.any(String),
    }));
  }, 60_000);
});
