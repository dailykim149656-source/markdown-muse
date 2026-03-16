import { describe, expect, it } from "vitest";
import { buildDeterministicCurrentDocumentDraftResponse } from "../../server/modules/agent/currentDocumentFallback";

describe("buildDeterministicCurrentDocumentDraftResponse", () => {
  it("builds a replace_document_body draft for headingless field documents", () => {
    const response = buildDeterministicCurrentDocumentDraftResponse({
      latestUserMessage: "\uC778\uACC4\uC790\uB294 \uD64D\uAE38\uB3D9, \uC778\uC218\uC790\uB294 \uC2EC\uCCAD\uC774. \uC774 \uB0B4\uC6A9\uC744 \uBB38\uC11C\uC5D0 \uBC18\uC601\uD574",
      locale: "ko",
      request: {
        activeDocument: {
          documentId: "doc-1",
          existingHeadings: [],
          fileName: "handover.md",
          markdown: "\uC778\uACC4\uC790: TBD\n\n\uC778\uC218\uC790: TBD",
          mode: "markdown",
        },
        driveReferenceFileIds: [],
        localReferences: [],
        messages: [],
        targetDefault: "active_document",
        threadId: "thread-1",
      },
    });

    expect(response?.effect.type).toBe("draft_current_document");
    expect(response?.currentDocumentDraft?.edits[0]?.kind).toBe("replace_document_body");
    expect(response?.currentDocumentDraft?.edits[0]?.markdownBody).toContain("\uC778\uACC4\uC790: \uD64D\uAE38\uB3D9");
    expect(response?.currentDocumentDraft?.edits[0]?.markdownBody).toContain("\uC778\uC218\uC790: \uC2EC\uCCAD\uC774");
  });

  it("builds a replace_document_body draft even when the current document has headings", () => {
    const response = buildDeterministicCurrentDocumentDraftResponse({
      latestUserMessage: "\uC778\uACC4\uC790\uB294 \uD64D\uAE38\uB3D9, \uC778\uC218\uC790\uB294 \uC2EC\uCCAD\uC774. \uC774 \uB0B4\uC6A9\uC744 \uBB38\uC11C\uC5D0 \uBC18\uC601\uD574",
      locale: "ko",
      request: {
        activeDocument: {
          documentId: "doc-1",
          existingHeadings: [{
            level: 1,
            nodeId: "heading-1",
            text: "Overview",
          }],
          fileName: "handover.md",
          markdown: "# Overview\n\n\uC778\uACC4\uC790: TBD",
          mode: "markdown",
        },
        driveReferenceFileIds: [],
        localReferences: [],
        messages: [],
        targetDefault: "active_document",
        threadId: "thread-1",
      },
    });

    expect(response?.effect.type).toBe("draft_current_document");
    expect(response?.currentDocumentDraft?.edits[0]?.kind).toBe("replace_document_body");
    expect(response?.currentDocumentDraft?.edits[0]?.markdownBody).toContain("\uC778\uACC4\uC790: \uD64D\uAE38\uB3D9");
  });
});
