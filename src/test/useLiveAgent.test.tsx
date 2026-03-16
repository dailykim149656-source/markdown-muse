import type { ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { I18nContext } from "@/i18n/I18nProvider";
import { useLiveAgent } from "@/hooks/useLiveAgent";
import type { AgentTurnRequest } from "@/types/liveAgent";
import type { DocumentData } from "@/types/document";

const liveAgentTurnMock = vi.fn();

vi.mock("@/lib/ai/liveAgentClient", () => ({
  liveAgentTurn: (...args: Parameters<typeof liveAgentTurnMock>) => liveAgentTurnMock(...args),
}));

vi.mock("@/lib/ai/captureWorkspaceScreenshot", () => ({
  captureWorkspaceScreenshot: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <I18nContext.Provider
    value={{
      locale: "en",
      setLocale: vi.fn(),
      t: (key: string) => key,
    }}
  >
    {children}
  </I18nContext.Provider>
);

const createDocument = (overrides: Partial<DocumentData>): DocumentData => ({
  content: "# Draft",
  createdAt: 1,
  id: "doc-1",
  mode: "markdown",
  name: "Draft",
  sourceSnapshots: {
    markdown: "# Draft",
  },
  tiptapJson: null,
  updatedAt: 1,
  ...overrides,
});

describe("useLiveAgent", () => {
  beforeEach(() => {
    liveAgentTurnMock.mockReset();
    liveAgentTurnMock.mockResolvedValue({
      assistantMessage: {
        createdAt: Date.now(),
        id: "agent-1",
        role: "assistant",
        text: "Done.",
      },
      effect: { type: "reply_only" },
    });
  });

  it("always includes the active document and only selected local references", async () => {
    const activeDoc = createDocument({
      id: "doc-active",
      name: "Active Doc",
    });
    const localReference = createDocument({
      id: "doc-ref-1",
      name: "Reference One",
    });
    const unselectedReference = createDocument({
      id: "doc-ref-2",
      name: "Reference Two",
    });

    const { result } = renderHook(() => useLiveAgent({
      activeDoc,
      activeEditor: null,
      currentRenderableMarkdown: "# Active Doc",
      documents: [activeDoc, localReference, unselectedReference],
      getFreshRenderableMarkdown: async () => "# Active Doc",
      onAutoApplyPatchSet: vi.fn().mockResolvedValue(true),
      onCompareWithDocument: vi.fn(),
      onCreateDocumentDraft: vi.fn(),
      onCreateSummaryDocument: vi.fn(),
      onExtractProcedure: vi.fn(),
      onGenerateSection: vi.fn(),
      onGenerateToc: vi.fn(),
      onImportDriveDocument: vi.fn(),
      onOpenPatchReview: vi.fn(),
      onOpenWorkspaceConnection: vi.fn(),
      onSummarizeDocument: vi.fn(),
      onSuggestUpdates: vi.fn(),
    }), { wrapper });

    act(() => {
      result.current.toggleLocalReference(localReference.id);
    });

    await act(async () => {
      await result.current.sendMessage("Summarize this document.");
    });

    const request = liveAgentTurnMock.mock.calls[0]?.[0] as AgentTurnRequest;

    expect(request.activeDocument?.documentId).toBe("doc-active");
    expect(request.localReferences.map((reference) => reference.documentId)).toEqual(["doc-ref-1"]);
    expect(request.localReferences.some((reference) => reference.documentId === "doc-active")).toBe(false);
  });

  it("ignores attempts to add the active document as a local reference", async () => {
    const activeDoc = createDocument({
      id: "doc-active",
      name: "Active Doc",
    });

    const { result } = renderHook(() => useLiveAgent({
      activeDoc,
      activeEditor: null,
      currentRenderableMarkdown: "# Active Doc",
      documents: [activeDoc],
      getFreshRenderableMarkdown: async () => "# Active Doc",
      onAutoApplyPatchSet: vi.fn().mockResolvedValue(true),
      onCompareWithDocument: vi.fn(),
      onCreateDocumentDraft: vi.fn(),
      onCreateSummaryDocument: vi.fn(),
      onExtractProcedure: vi.fn(),
      onGenerateSection: vi.fn(),
      onGenerateToc: vi.fn(),
      onImportDriveDocument: vi.fn(),
      onOpenPatchReview: vi.fn(),
      onOpenWorkspaceConnection: vi.fn(),
      onSummarizeDocument: vi.fn(),
      onSuggestUpdates: vi.fn(),
    }), { wrapper });

    act(() => {
      result.current.toggleLocalReference(activeDoc.id);
    });

    expect(result.current.selectedLocalReferenceIds).toEqual([]);

    await act(async () => {
      await result.current.sendMessage("Summarize this document.");
    });

    const request = liveAgentTurnMock.mock.calls[0]?.[0] as AgentTurnRequest;
    expect(request.localReferences).toEqual([]);
  });

  it("blocks document-based agent work when the active document is not rich-text", async () => {
    const activeDoc = createDocument({
      content: "{\n  \"draft\": true\n}",
      id: "doc-json",
      mode: "json",
      name: "Config",
      sourceSnapshots: undefined,
    });

    const { result } = renderHook(() => useLiveAgent({
      activeDoc,
      activeEditor: null,
      currentRenderableMarkdown: "",
      documents: [activeDoc],
      getFreshRenderableMarkdown: async () => "",
      onAutoApplyPatchSet: vi.fn().mockResolvedValue(true),
      onCompareWithDocument: vi.fn(),
      onCreateDocumentDraft: vi.fn(),
      onCreateSummaryDocument: vi.fn(),
      onExtractProcedure: vi.fn(),
      onGenerateSection: vi.fn(),
      onGenerateToc: vi.fn(),
      onImportDriveDocument: vi.fn(),
      onOpenPatchReview: vi.fn(),
      onOpenWorkspaceConnection: vi.fn(),
      onSummarizeDocument: vi.fn(),
      onSuggestUpdates: vi.fn(),
    }), { wrapper });

    await act(async () => {
      await result.current.sendMessage("Summarize this document.");
    });

    expect(liveAgentTurnMock).not.toHaveBeenCalled();
    expect(result.current.latestError).toBe("hooks.ai.richTextOnly");
  });

  it("still allows Drive-oriented requests when the active document is not rich-text", async () => {
    const activeDoc = createDocument({
      content: "{\n  \"draft\": true\n}",
      id: "doc-json",
      mode: "json",
      name: "Config",
      sourceSnapshots: undefined,
    });

    const { result } = renderHook(() => useLiveAgent({
      activeDoc,
      activeEditor: null,
      currentRenderableMarkdown: "",
      documents: [activeDoc],
      getFreshRenderableMarkdown: async () => "",
      onAutoApplyPatchSet: vi.fn().mockResolvedValue(true),
      onCompareWithDocument: vi.fn(),
      onCreateDocumentDraft: vi.fn(),
      onCreateSummaryDocument: vi.fn(),
      onExtractProcedure: vi.fn(),
      onGenerateSection: vi.fn(),
      onGenerateToc: vi.fn(),
      onImportDriveDocument: vi.fn(),
      onOpenPatchReview: vi.fn(),
      onOpenWorkspaceConnection: vi.fn(),
      onSummarizeDocument: vi.fn(),
      onSuggestUpdates: vi.fn(),
    }), { wrapper });

    await act(async () => {
      await result.current.sendMessage("Search Google Drive for the rollback runbook.");
    });

    expect(liveAgentTurnMock).toHaveBeenCalledTimes(1);
    const request = liveAgentTurnMock.mock.calls[0]?.[0] as AgentTurnRequest;
    expect(request.activeDocument).toBeNull();
  });

  it("preserves handover document intent through the summary artifact flow", async () => {
    const activeDoc = createDocument({
      id: "doc-active",
      name: "Active Doc",
    });
    const onCreateSummaryDocument = vi.fn();
    const onSummarizeDocument = vi.fn().mockResolvedValue({
      attributions: [{
        chunkId: "chunk-1",
        ingestionId: "doc-active",
        rationale: "Grounded in the active document.",
      }],
      bulletPoints: ["Key handover point"],
      requestId: "req-1",
      summary: "Summary body",
    });

    liveAgentTurnMock.mockResolvedValueOnce({
      assistantMessage: {
        createdAt: Date.now(),
        id: "agent-1",
        role: "assistant",
        text: "I prepared a summary request and a handover document can be created after review.",
      },
      effect: {
        capability: "summarize_document",
        createDocumentAfter: true,
        createDocumentKind: "handover",
        objective: "Summarize the current document and prepare a handover.",
        type: "delegate_ai_capability",
      },
    });

    const { result } = renderHook(() => useLiveAgent({
      activeDoc,
      activeEditor: null,
      currentRenderableMarkdown: "# Active Doc",
      documents: [activeDoc],
      getFreshRenderableMarkdown: async () => "# Active Doc",
      onAutoApplyPatchSet: vi.fn().mockResolvedValue(true),
      onCompareWithDocument: vi.fn(),
      onCreateDocumentDraft: vi.fn(),
      onCreateSummaryDocument,
      onExtractProcedure: vi.fn(),
      onGenerateSection: vi.fn(),
      onGenerateToc: vi.fn(),
      onImportDriveDocument: vi.fn(),
      onOpenPatchReview: vi.fn(),
      onOpenWorkspaceConnection: vi.fn(),
      onSummarizeDocument,
      onSuggestUpdates: vi.fn(),
    }), { wrapper });

    await act(async () => {
      await result.current.sendMessage("문서 요약해주고 인수인계서 만들어줘");
    });

    const summaryArtifact = result.current.artifacts.find((artifact) => artifact.kind === "summary");

    expect(summaryArtifact).toEqual(expect.objectContaining({
      createDocumentAfter: true,
      createDocumentKind: "handover",
      kind: "summary",
    }));

    act(() => {
      result.current.createSummaryDocumentFromArtifact(summaryArtifact!.id);
    });

    expect(onCreateSummaryDocument).toHaveBeenCalledWith(expect.objectContaining({
      documentKind: "handover",
      objective: "Summarize the current document and prepare a handover.",
    }));
  });
});
