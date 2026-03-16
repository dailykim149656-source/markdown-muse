import { describe, expect, it } from "vitest";
import { normalizeNavigatorTurnResponse } from "../../server/modules/navigator/turnResponse";

describe("normalizeNavigatorTurnResponse", () => {
  it("normalizes click responses with semantic targets", () => {
    const response = normalizeNavigatorTurnResponse({
      action: {
        target: {
          dataTarget: "header-google-menu",
          name: "Google Workspace",
          role: "button",
        },
        type: "click",
      },
      confidence: 1.2,
      rationale: "Open the menu first.",
      statusText: "Opening Google Workspace.",
    });

    expect(response).toEqual({
      action: {
        target: {
          dataTarget: "header-google-menu",
          name: "Google Workspace",
          role: "button",
        },
        type: "click",
      },
      confidence: 1,
      rationale: "Open the menu first.",
      statusText: "Opening Google Workspace.",
    });
  });

  it("falls back to ask_followup when a click target is missing", () => {
    const response = normalizeNavigatorTurnResponse({
      action: {
        type: "click",
      },
      confidence: -4,
      rationale: "",
      statusText: "",
    });

    expect(response.action).toEqual({
      question: "I could not identify which UI element to click.",
      type: "ask_followup",
    });
    expect(response.confidence).toBe(0);
  });
});
