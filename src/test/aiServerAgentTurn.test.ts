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

const createAgentRequest = ({
  activeDocumentName = "2Team_스크립트",
  messages,
}: {
  activeDocumentName?: string;
  messages: AgentTurnRequest["messages"];
}): AgentTurnRequest => ({
  activeDocument: {
    documentId: "doc-active",
    existingHeadings: [],
    fileName: activeDocumentName,
    markdown: "# Active Doc\n\nRelease checklist",
    mode: "markdown",
  },
  availableTargetDocuments: [],
  driveReferenceFileIds: [],
  localReferences: [],
  messages,
  targetDefault: "active_document",
  threadId: "thread-1",
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

  it("rewrites missing-document follow-up into a summarize handover action for the active document", async () => {
    resolveWorkspaceSessionForAgentMock.mockResolvedValue({
      presentCookieNames: ["__session"],
      sessionLookupFailed: false,
      workspaceConnected: false,
    });
    generateMultimodalStructuredJsonMock.mockResolvedValue({
      action: "ask_followup",
      confidence: 0.92,
      missingInformation: ["요약할 문서"],
      reason: "요약 대상을 확인해야 합니다.",
    });

    const { handleAgentTurn } = await import("../../server/aiServer");
    const response = await handleAgentTurn({ method: "POST", url: "/api/ai/agent/turn" } as never, createAgentRequest({
      messages: [{
        createdAt: 1,
        id: "msg-1",
        role: "user",
        text: "문서 요약해주고 인수인계서 만들어줘",
      }],
    }), "req-handover-1");

    expect(response.effect).toEqual(expect.objectContaining({
      capability: "summarize_document",
      createDocumentAfter: true,
      createDocumentKind: "handover",
      objective: "문서 요약해주고 인수인계서 만들어줘",
      type: "delegate_ai_capability",
    }));
    expect(response.assistantMessage.text).toContain("handover document");
  });

  it("preserves summary intent across a follow-up that says 현재 대상 문서", async () => {
    resolveWorkspaceSessionForAgentMock.mockResolvedValue({
      presentCookieNames: ["__session"],
      sessionLookupFailed: false,
      workspaceConnected: false,
    });
    generateMultimodalStructuredJsonMock.mockResolvedValue({
      action: "ask_followup",
      confidence: 0.91,
      missingInformation: ["요약할 문서"],
      reason: "요약 대상을 확인해야 합니다.",
    });

    const { handleAgentTurn } = await import("../../server/aiServer");
    const response = await handleAgentTurn({ method: "POST", url: "/api/ai/agent/turn" } as never, createAgentRequest({
      messages: [{
        createdAt: 1,
        id: "msg-1",
        role: "user",
        text: "문서 요약해주고 인수인계서 만들어줘",
      }, {
        createdAt: 2,
        id: "msg-2",
        role: "assistant",
        text: "계속 진행하려면 다음 정보가 더 필요합니다: 요약할 문서.",
      }, {
        createdAt: 3,
        id: "msg-3",
        role: "user",
        text: "현재 대상 문서",
      }],
    }), "req-handover-2");

    expect(response.effect).toEqual(expect.objectContaining({
      capability: "summarize_document",
      createDocumentKind: "handover",
      objective: "문서 요약해주고 인수인계서 만들어줘",
      type: "delegate_ai_capability",
    }));
  });

  it("pins the active document when the follow-up names the open document file", async () => {
    resolveWorkspaceSessionForAgentMock.mockResolvedValue({
      presentCookieNames: ["__session"],
      sessionLookupFailed: false,
      workspaceConnected: false,
    });
    generateMultimodalStructuredJsonMock.mockResolvedValue({
      action: "ask_followup",
      confidence: 0.9,
      missingInformation: ["요약할 문서"],
      reason: "요약 대상을 확인해야 합니다.",
    });

    const { handleAgentTurn } = await import("../../server/aiServer");
    const response = await handleAgentTurn({ method: "POST", url: "/api/ai/agent/turn" } as never, createAgentRequest({
      messages: [{
        createdAt: 1,
        id: "msg-1",
        role: "user",
        text: "문서 요약해주고 인수인계서 만들어줘",
      }, {
        createdAt: 2,
        id: "msg-2",
        role: "assistant",
        text: "계속 진행하려면 다음 정보가 더 필요합니다: 요약할 문서.",
      }, {
        createdAt: 3,
        id: "msg-3",
        role: "user",
        text: "2Team_스크립트",
      }],
    }), "req-handover-3");

    expect(response.effect).toEqual(expect.objectContaining({
      capability: "summarize_document",
      createDocumentKind: "handover",
      objective: "문서 요약해주고 인수인계서 만들어줘",
      type: "delegate_ai_capability",
    }));
  });

  it("does not redirect compare flows to the active document", async () => {
    resolveWorkspaceSessionForAgentMock.mockResolvedValue({
      presentCookieNames: ["__session"],
      sessionLookupFailed: false,
      workspaceConnected: false,
    });
    generateMultimodalStructuredJsonMock.mockResolvedValue({
      action: "compare_documents",
      confidence: 0.88,
      missingInformation: ["target document"],
      reason: "A comparison target is still needed.",
    });

    const { handleAgentTurn } = await import("../../server/aiServer");
    const response = await handleAgentTurn({ method: "POST", url: "/api/ai/agent/turn" } as never, createAgentRequest({
      messages: [{
        createdAt: 1,
        id: "msg-1",
        role: "user",
        text: "현재 문서와 비교해줘",
      }],
    }), "req-compare");

    expect(response.effect).toEqual(expect.objectContaining({
      capability: "compare_documents",
      targetDocumentId: undefined,
      type: "delegate_ai_capability",
    }));
  });
});
