import { describe, expect, it } from "vitest";
import { buildActiveDocumentRetrievalContext } from "../../server/modules/agent/buildActiveDocumentRetrievalContext";

describe("buildActiveDocumentRetrievalContext", () => {
  it("extracts top section targets and active document graph for long documents", () => {
    const context = buildActiveDocumentRetrievalContext({
      latestUserMessage: "\uBC30\uD3EC \uC808\uCC28\uC758 \uC2B9\uC778\uC790\uB97C \uAE40\uCCA0\uC218\uB85C \uBC14\uAFD4\uC918",
      request: {
        activeDocument: {
          documentId: "doc-1",
          existingHeadings: [
            { level: 1, nodeId: "h-overview", text: "Overview" },
            { level: 2, nodeId: "h-deploy", text: "Deployment Procedure" },
          ],
          fileName: "runbook.md",
          markdown: [
            "# Overview",
            "",
            "General notes.",
            "",
            "## Deployment Procedure",
            "",
            "\uC2B9\uC778\uC790: TBD",
            "",
            "\uBC30\uD3EC \uC804\uC5D0 \uC2B9\uC778\uC790\uB97C \uD655\uC778\uD569\uB2C8\uB2E4.",
          ].join("\n"),
          mode: "markdown",
        },
        driveReferenceFileIds: [],
        graphContext: {
          workspaceHints: {
            impactSummary: {
              impactedDocumentCount: 2,
              inboundReferenceCount: 1,
              issueCount: 1,
              outboundReferenceCount: 1,
            },
            issues: [{
              id: "issue-1",
              kind: "outdated_source",
              message: "Deployment doc changed.",
              relatedDocumentIds: ["doc-1", "doc-2"],
              severity: "warning",
            }],
            relatedDocuments: [{
              documentId: "doc-2",
              name: "Ops Guide",
              recommendationScore: 88,
              relationKinds: ["referenced_by"],
            }],
          },
        },
        localReferences: [],
        messages: [],
        targetDefault: "active_document",
        threadId: "thread-1",
      },
    });

    expect(context?.topSectionTargets[0]?.headingNodeId).toBe("h-deploy");
    expect(context?.topSectionTargets[0]?.sectionId).toBeTruthy();
    expect(context?.activeDocumentGraph.nodes.length).toBeGreaterThan(0);
    expect(context?.activeDocumentGraph.edges.length).toBeGreaterThan(0);
    expect(context?.workspaceGraphHints?.relatedDocuments[0]?.documentId).toBe("doc-2");
  });

  it("extracts graph-ranked field targets from key-value lines and markdown tables", () => {
    const context = buildActiveDocumentRetrievalContext({
      latestUserMessage: "\uB2F4\uB2F9\uC790\uB97C \uD64D\uAE38\uB3D9\uC73C\uB85C, \uC77C\uC815\uC744 \uB0B4\uC77C\uB85C \uBC14\uAFC8",
      request: {
        activeDocument: {
          documentId: "doc-1",
          existingHeadings: [],
          fileName: "handover.md",
          markdown: [
            "\uB2F4\uB2F9\uC790: TBD",
            "",
            "| \uD56D\uBAA9 | \uC77C\uC815 |",
            "| --- | --- |",
            "| \uC778\uC218 | TBD |",
          ].join("\n"),
          mode: "markdown",
        },
        driveReferenceFileIds: [],
        localReferences: [],
        messages: [],
        targetDefault: "active_document",
        threadId: "thread-1",
      },
    });

    expect(context?.topFieldTargets.some((candidate) => candidate.fieldLabel === "\uB2F4\uB2F9\uC790")).toBe(true);
    expect(context?.topFieldTargets.some((candidate) => candidate.kind === "table_cell" && candidate.fieldLabel === "\uC77C\uC815")).toBe(true);
  });
});
