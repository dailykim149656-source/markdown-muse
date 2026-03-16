import { describe, expect, it, vi } from "vitest";
import type { AgentExecutionContext, AgentPlannerResponse } from "../../server/modules/agent/plannerResponse";
import type { ActiveDocumentRetrievalContext } from "../../server/modules/agent/buildActiveDocumentRetrievalContext";
import { executePlannedAction } from "../../server/modules/agent/executePlannedAction";

const generateMultimodalStructuredJson = vi.fn();
const generateStructuredJson = vi.fn();
const searchDriveDocuments = vi.fn();

vi.mock("../../server/modules/gemini/client", async () => {
  const actual = await vi.importActual<typeof import("../../server/modules/gemini/client")>("../../server/modules/gemini/client");

  return {
    ...actual,
    generateMultimodalStructuredJson: (...args: Parameters<typeof generateMultimodalStructuredJson>) => generateMultimodalStructuredJson(...args),
    generateStructuredJson: (...args: Parameters<typeof generateStructuredJson>) => generateStructuredJson(...args),
  };
});

vi.mock("../../server/modules/workspace/searchDriveDocuments", async () => {
  const actual = await vi.importActual<typeof import("../../server/modules/workspace/searchDriveDocuments")>("../../server/modules/workspace/searchDriveDocuments");

  return {
    ...actual,
    searchDriveDocuments: (...args: Parameters<typeof searchDriveDocuments>) => searchDriveDocuments(...args),
  };
});

const createContext = (overrides?: Partial<AgentExecutionContext>): AgentExecutionContext => ({
  driveReferences: [],
  httpRequest: { headers: {}, method: "POST", url: "/api/ai/agent/turn" } as never,
  latestUserMessage: "\uC778\uACC4\uC790\uB294 \uD64D\uAE38\uB3D9, \uC778\uC218\uC790\uB294 \uC2EC\uCCAD\uC774. \uC774 \uB0B4\uC6A9\uC744 \uBB38\uC11C\uC5D0 \uBC18\uC601\uD574",
  request: {
    activeDocument: {
      documentId: "doc-1",
      existingHeadings: [],
      fileName: "handover.md",
      markdown: "\uC778\uACC4\uC790: TBD\n\n\uC778\uC218\uC790: TBD",
      mode: "markdown",
    },
    availableTargetDocuments: [],
    driveReferenceFileIds: [],
    localReferences: [],
    locale: "ko",
    messages: [],
    targetDefault: "active_document",
    threadId: "thread-1",
  },
  retrievalContext: {
    documentSummary: {
      chunkCount: 1,
      fileName: "handover.md",
      headingCount: 0,
      markdownLength: 16,
      mode: "markdown",
      preview: "\uC778\uACC4\uC790: TBD\n\n\uC778\uC218\uC790: TBD",
      sectionCount: 0,
    },
    fieldCandidates: [
      {
        fieldKey: "\uC778\uACC4\uC790",
        fieldLabel: "\uC778\uACC4\uC790",
        kind: "key_value_line",
        lineIndex: 0,
        lineText: "\uC778\uACC4\uC790: TBD",
      },
      {
        fieldKey: "\uC778\uC218\uC790",
        fieldLabel: "\uC778\uC218\uC790",
        kind: "key_value_line",
        lineIndex: 2,
        lineText: "\uC778\uC218\uC790: TBD",
      },
    ],
    headingLookup: [],
    lineContexts: [{}, {}, {}],
    normalizedDocument: {
      chunks: [],
      fileName: "handover.md",
      images: [],
      importedAt: 1,
      ingestionId: "doc-1",
      metadata: {},
      plainText: "\uC778\uACC4\uC790 TBD \uC778\uC218\uC790 TBD",
      sections: [],
      sourceFormat: "markdown",
    } as ActiveDocumentRetrievalContext["normalizedDocument"],
    sectionRanges: [],
    topFieldCandidates: [
      {
        fieldKey: "\uC778\uACC4\uC790",
        fieldLabel: "\uC778\uACC4\uC790",
        kind: "key_value_line",
        lineIndex: 0,
        lineText: "\uC778\uACC4\uC790: TBD",
        matchedTerms: ["\uC778\uACC4\uC790"],
        score: 10,
      },
      {
        fieldKey: "\uC778\uC218\uC790",
        fieldLabel: "\uC778\uC218\uC790",
        kind: "key_value_line",
        lineIndex: 2,
        lineText: "\uC778\uC218\uC790: TBD",
        matchedTerms: ["\uC778\uC218\uC790"],
        score: 10,
      },
    ],
    topFieldTargets: [
      {
        fieldKey: "\uC778\uACC4\uC790",
        fieldLabel: "\uC778\uACC4\uC790",
        graphNodeId: "field:root:0:\uC778\uACC4\uC790",
        graphScore: 4,
        kind: "key_value_line",
        lineIndex: 0,
        lineText: "\uC778\uACC4\uC790: TBD",
        matchedTerms: ["\uC778\uACC4\uC790"],
        retrievalScore: 10,
        score: 14,
      },
      {
        fieldKey: "\uC778\uC218\uC790",
        fieldLabel: "\uC778\uC218\uC790",
        graphNodeId: "field:root:2:\uC778\uC218\uC790",
        graphScore: 4,
        kind: "key_value_line",
        lineIndex: 2,
        lineText: "\uC778\uC218\uC790: TBD",
        matchedTerms: ["\uC778\uC218\uC790"],
        retrievalScore: 10,
        score: 14,
      },
    ],
    topSectionMatches: [],
    topSectionTargets: [],
    workspaceGraphHints: null,
  },
  workspaceConnected: true,
  ...overrides,
});

describe("executePlannedAction", () => {
  it("uses retrieval field candidates for headingless current-document updates", async () => {
    const planner: AgentPlannerResponse = {
      action: "update_current_document",
      arguments: {
        fieldKeys: ["\uC778\uACC4\uC790", "\uC778\uC218\uC790"],
      },
      confidence: 0.92,
      missingInformation: [],
      reason: "Update the active document.",
    };

    const result = await executePlannedAction(createContext(), planner);

    expect(result.rawResponse.effect?.type).toBe("draft_current_document");
    expect(result.telemetry?.deterministicFallbackUsed).toBe(true);
    expect(result.rawResponse.effect).toEqual(expect.objectContaining({
      deliveryMode: "direct_apply",
    }));
  });

  it("falls back to the top retrieval field candidate when planner fieldKeys are missing", async () => {
    const planner: AgentPlannerResponse = {
      action: "update_current_document",
      confidence: 0.92,
      missingInformation: [],
      reason: "Update the active document.",
      target: {
        headingNodeId: "h-deploy",
        sectionId: "deployment-procedure",
      },
    };

    const result = await executePlannedAction(createContext({
      latestUserMessage: "\uC2B9\uC778\uC790\uB97C \uAE40\uCCA0\uC218\uB85C \uBC14\uAFD4\uC918",
      request: {
        activeDocument: {
          documentId: "doc-2",
          existingHeadings: [
            { level: 1, nodeId: "h-overview", text: "Overview" },
            { level: 2, nodeId: "h-deploy", text: "Deployment Procedure" },
          ],
          fileName: "runbook.md",
          markdown: "# Overview\n\nGeneral notes.\n\n## Deployment Procedure\n\n\uC2B9\uC778\uC790: TBD\n\nSteps.",
          mode: "markdown",
        },
        availableTargetDocuments: [],
        driveReferenceFileIds: [],
        localReferences: [],
        locale: "ko",
        messages: [],
        targetDefault: "active_document",
        threadId: "thread-2",
      },
      retrievalContext: {
        documentSummary: {
          chunkCount: 2,
          fileName: "runbook.md",
          headingCount: 2,
          markdownLength: 60,
          mode: "markdown",
          preview: "preview",
          sectionCount: 2,
        },
        fieldCandidates: [{
          fieldKey: "\uC2B9\uC778\uC790",
          fieldLabel: "\uC2B9\uC778\uC790",
          headingNodeId: "h-deploy",
          headingTitle: "Deployment Procedure",
          kind: "key_value_line",
          lineIndex: 6,
          lineText: "\uC2B9\uC778\uC790: TBD",
          sectionId: "deployment-procedure",
        }],
        headingLookup: [{
          headingNodeId: "h-overview",
          headingTitle: "Overview",
          level: 1,
          sectionId: "overview",
        }, {
          headingNodeId: "h-deploy",
          headingTitle: "Deployment Procedure",
          level: 2,
          sectionId: "deployment-procedure",
        }],
        lineContexts: [{}, {}, {}, {}, {}, {}, { headingNodeId: "h-deploy", headingTitle: "Deployment Procedure", sectionId: "deployment-procedure" }, {}],
        normalizedDocument: {
          chunks: [],
          fileName: "runbook.md",
          images: [],
          importedAt: 1,
          ingestionId: "doc-2",
          metadata: {},
          plainText: "",
          sections: [],
          sourceFormat: "markdown",
        } as ActiveDocumentRetrievalContext["normalizedDocument"],
        sectionRanges: [{
          bodyEndLineIndex: 8,
          bodyMarkdown: "\uC2B9\uC778\uC790: TBD\n\nSteps.",
          bodyStartLineIndex: 6,
          endLineIndex: 8,
          headingLineIndex: 4,
          headingNodeId: "h-deploy",
          headingTitle: "Deployment Procedure",
          level: 2,
          sectionId: "deployment-procedure",
          startLineIndex: 4,
        }],
        topFieldCandidates: [{
          fieldKey: "\uC2B9\uC778\uC790",
          fieldLabel: "\uC2B9\uC778\uC790",
          headingNodeId: "h-deploy",
          headingTitle: "Deployment Procedure",
          kind: "key_value_line",
          lineIndex: 6,
          lineText: "\uC2B9\uC778\uC790: TBD",
          matchedTerms: ["\uC2B9\uC778\uC790"],
          score: 20,
          sectionId: "deployment-procedure",
        }],
        topFieldTargets: [{
          fieldKey: "\uC2B9\uC778\uC790",
          fieldLabel: "\uC2B9\uC778\uC790",
          graphNodeId: "field:deployment-procedure:6:\uC2B9\uC778\uC790",
          graphScore: 12,
          headingNodeId: "h-deploy",
          headingTitle: "Deployment Procedure",
          kind: "key_value_line",
          lineIndex: 6,
          lineText: "\uC2B9\uC778\uC790: TBD",
          matchedTerms: ["\uC2B9\uC778\uC790"],
          retrievalScore: 20,
          score: 32,
          sectionId: "deployment-procedure",
        }],
        topSectionMatches: [{
          chunkId: "deployment-procedure-chunk-01",
          excerpt: "\uC2B9\uC778\uC790: TBD Steps.",
          headingNodeId: "h-deploy",
          headingTitle: "Deployment Procedure",
          matchedTerms: ["\uC2B9\uC778\uC790"],
          score: 20,
          sectionId: "deployment-procedure",
        }],
        topSectionTargets: [{
          graphNodeId: "section:deployment-procedure",
          graphScore: 14,
          headingNodeId: "h-deploy",
          headingTitle: "Deployment Procedure",
          level: 2,
          matchedTerms: ["\uC2B9\uC778\uC790"],
          retrievalScore: 20,
          score: 34,
          sectionId: "deployment-procedure",
        }],
        workspaceGraphHints: null,
      },
    }), planner);

    expect(result.rawResponse.effect?.type).toBe("draft_current_document");
  });

  it("returns candidate list for drive search actions", async () => {
    searchDriveDocuments.mockResolvedValueOnce([{
      excerpt: "Runbook excerpt",
      fileId: "file-1",
      fileName: "Runbook",
      relevanceReason: "Matched terms: runbook.",
    }]);

    const planner: AgentPlannerResponse = {
      action: "search_drive_documents",
      arguments: {
        query: "find the runbook",
      },
      confidence: 0.9,
      missingInformation: [],
      reason: "Search Google Drive.",
    };

    const result = await executePlannedAction(createContext(), planner);

    expect(result.rawResponse.effect?.type).toBe("show_drive_candidates");
    expect(result.driveCandidates).toHaveLength(1);
  });

  it("degrades drive search actions to open_google_connect when workspace lookup is unavailable", async () => {
    const planner: AgentPlannerResponse = {
      action: "search_drive_documents",
      arguments: {
        query: "find the runbook",
      },
      confidence: 0.9,
      missingInformation: [],
      reason: "Search Google Drive.",
    };

    const result = await executePlannedAction(createContext({
      workspaceConnected: false,
    }), planner);

    expect(result.rawResponse.effect?.type).toBe("open_google_connect");
    expect(result.telemetry).toEqual(expect.objectContaining({
      driveAuthGateUsed: true,
      executorAction: "search_drive_documents",
    }));
  });

  it("returns ready_to_import when a selected drive reference is unambiguous", async () => {
    const planner: AgentPlannerResponse = {
      action: "prepare_drive_import",
      confidence: 0.88,
      missingInformation: [],
      reason: "Import the selected Google Doc.",
      target: {
        fileId: "file-1",
      },
    };

    const result = await executePlannedAction(createContext({
      driveReferences: [{
        excerpt: "Runbook excerpt",
        fileId: "file-1",
        fileName: "Runbook",
      }],
    }), planner);

    expect(result.rawResponse.effect).toEqual({
      fileId: "file-1",
      fileName: "Runbook",
      type: "ready_to_import_drive_file",
    });
  });

  it("routes delegated actions to delegate_ai_capability", async () => {
    const planner: AgentPlannerResponse = {
      action: "generate_toc",
      confidence: 0.92,
      missingInformation: [],
      reason: "Generate a TOC.",
    };

    const result = await executePlannedAction(createContext(), planner);

    expect(result.rawResponse.effect?.type).toBe("delegate_ai_capability");
  });

  it("prefers an exact open document match before Drive fallback for delegated compare actions", async () => {
    const planner: AgentPlannerResponse = {
      action: "compare_documents",
      confidence: 0.92,
      missingInformation: [],
      reason: "Compare against the release notes.",
    };

    const result = await executePlannedAction(createContext({
      latestUserMessage: "Compare this document with release notes.",
      request: {
        activeDocument: {
          documentId: "doc-1",
          existingHeadings: [],
          fileName: "handover.md",
          markdown: "Owner: TBD",
          mode: "markdown",
        },
        availableTargetDocuments: [{
          documentId: "doc-2",
          fileName: "Release Notes",
          mode: "markdown",
        }],
        driveReferenceFileIds: [],
        localReferences: [],
        locale: "en",
        messages: [],
        targetDefault: "active_document",
        threadId: "thread-3",
      },
    }), planner);

    expect(result.rawResponse.effect).toEqual(expect.objectContaining({
      targetDocumentId: "doc-2",
      type: "delegate_ai_capability",
    }));
  });

  it("falls back to an exact Drive reference for delegated compare actions when no local target matches", async () => {
    const planner: AgentPlannerResponse = {
      action: "compare_documents",
      confidence: 0.92,
      missingInformation: [],
      reason: "Compare against the rollback runbook.",
    };

    const result = await executePlannedAction(createContext({
      latestUserMessage: "Compare this document with rollback runbook.",
      driveReferences: [{
        excerpt: "Runbook excerpt",
        fileId: "file-1",
        fileName: "Rollback Runbook",
      }],
      request: {
        activeDocument: {
          documentId: "doc-1",
          existingHeadings: [],
          fileName: "handover.md",
          markdown: "Owner: TBD",
          mode: "markdown",
        },
        availableTargetDocuments: [],
        driveReferenceFileIds: ["file-1"],
        localReferences: [],
        locale: "en",
        messages: [],
        targetDefault: "active_document",
        threadId: "thread-4",
      },
    }), planner);

    expect(result.rawResponse.effect).toEqual(expect.objectContaining({
      targetDocumentName: "Rollback Runbook",
      targetFileId: "file-1",
      type: "delegate_ai_capability",
    }));
  });
});
