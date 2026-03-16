import { describe, expect, it } from "vitest";
import { buildAgentPreRouteHints } from "../../server/modules/agent/preRouteAgentTurn";
import type { AgentTurnRequest } from "@/types/liveAgent";

const createRequest = (): AgentTurnRequest => ({
  activeDocument: {
    documentId: "doc-1",
    existingHeadings: [],
    fileName: "Current Spec",
    markdown: "# Current Spec",
    mode: "markdown",
  },
  availableTargetDocuments: [{
    documentId: "doc-2",
    fileName: "Release Notes",
    mode: "markdown",
  }, {
    documentId: "doc-3",
    fileName: "Rollback Runbook",
    mode: "markdown",
  }],
  driveReferenceFileIds: [],
  localReferences: [],
  messages: [],
  targetDefault: "active_document",
  threadId: "thread-1",
});

describe("buildAgentPreRouteHints", () => {
  it("pins active document references from explicit current-document wording", () => {
    const hints = buildAgentPreRouteHints({
      driveReferences: [],
      latestUserMessage: "Use this document to summarize the rollout.",
      request: createRequest(),
    });

    expect(hints.activeDocumentPinned).toBe(true);
  });

  it("pins Korean active document variants", () => {
    const request = createRequest();

    expect(buildAgentPreRouteHints({
      driveReferences: [],
      latestUserMessage: "현재 대상 문서를 요약해줘.",
      request,
    }).activeDocumentPinned).toBe(true);

    expect(buildAgentPreRouteHints({
      driveReferences: [],
      latestUserMessage: "현재 문서를 요약해줘.",
      request,
    }).activeDocumentPinned).toBe(true);

    expect(buildAgentPreRouteHints({
      driveReferences: [],
      latestUserMessage: "이 문서를 요약해줘.",
      request,
    }).activeDocumentPinned).toBe(true);
  });

  it("pins the active document when the message names the open document file", () => {
    const request = {
      ...createRequest(),
      activeDocument: {
        ...createRequest().activeDocument!,
        fileName: "2Team_스크립트",
      },
    };

    const hints = buildAgentPreRouteHints({
      driveReferences: [],
      latestUserMessage: "2Team_스크립트 요약해주고 인수인계서 만들어줘",
      request,
    });

    expect(hints.activeDocumentPinned).toBe(true);
    expect(hints.localTarget).toBeNull();
  });

  it("resolves a strong open-document match before any Drive fallback", () => {
    const hints = buildAgentPreRouteHints({
      driveReferences: [{
        excerpt: "Drive excerpt",
        fileId: "file-1",
        fileName: "Release Notes",
      }],
      latestUserMessage: "Compare this document with release notes.",
      request: createRequest(),
    });

    expect(hints.localTarget).toEqual(expect.objectContaining({
      documentId: "doc-2",
      fileName: "Release Notes",
    }));
    expect(hints.driveReferenceTarget).toEqual(expect.objectContaining({
      fileId: "file-1",
    }));
  });
});
