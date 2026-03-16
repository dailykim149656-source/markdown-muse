import { describe, expect, it } from "vitest";
import { assertAgentTurnPayload } from "../../scripts/check-ai-runtime-smoke.mjs";

describe("AI runtime smoke assertions", () => {
  it("fails when agent turn returns an agentStatus error", () => {
    expect(() => assertAgentTurnPayload({
      agentStatus: {
        kind: "gemini_unavailable",
        message: "Gemini is not connected.",
      },
      assistantMessage: {
        text: "Gemini is not connected.",
      },
      effect: {
        type: "reply_only",
      },
    })).toThrow(/agentStatus=gemini_unavailable/i);
  });

  it("accepts a reply when no agentStatus error is present", () => {
    expect(() => assertAgentTurnPayload({
      assistantMessage: {
        text: "Smoke test complete.",
      },
      effect: {
        type: "reply_only",
      },
    })).not.toThrow();
  });
});
