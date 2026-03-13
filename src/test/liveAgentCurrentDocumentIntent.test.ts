import { describe, expect, it } from "vitest";
import {
  hasExplicitCurrentDocumentUpdateRequestInConversation,
  isExplicitCurrentDocumentUpdateRequest,
} from "../../server/modules/agent/buildTurnPrompt";

describe("live agent current-document intent detection", () => {
  it("detects an English current-document update request", () => {
    expect(isExplicitCurrentDocumentUpdateRequest("Update the current document with the new owner and approver.")).toBe(true);
  });

  it("detects a Korean current-document update request", () => {
    expect(isExplicitCurrentDocumentUpdateRequest("\uC778\uACC4\uC790\uB294 \uD64D\uAE38\uB3D9, \uC778\uC218\uC790\uB294 \uC2EC\uCCAD\uC774. \uC774 \uB0B4\uC6A9\uC744 \uBB38\uC11C\uC5D0 \uBC18\uC601\uD574")).toBe(true);
  });

  it("detects a Korean current-document update request with current-document wording", () => {
    expect(isExplicitCurrentDocumentUpdateRequest("\uD604\uC7AC \uBB38\uC11C\uC5D0\uC11C \uC778\uACC4\uC790\uB294 \uD64D\uAE38\uB3D9, \uC778\uC218\uC790\uB294 \uC2EC\uCCAD\uC774\uB85C \uC785\uB825\uD574\uC918")).toBe(true);
  });

  it("keeps current-document update intent across follow-up turns", () => {
    expect(hasExplicitCurrentDocumentUpdateRequestInConversation([
      {
        createdAt: 1,
        id: "m1",
        role: "user",
        text: "Update the current document with the new handover details.",
      },
      {
        createdAt: 2,
        id: "m2",
        role: "assistant",
        text: "Which names should I use?",
      },
      {
        createdAt: 3,
        id: "m3",
        role: "user",
        text: "Handover owner is Hong Gil-dong and the recipient is Sim Cheong-i.",
      },
    ])).toBe(true);
  });
});
