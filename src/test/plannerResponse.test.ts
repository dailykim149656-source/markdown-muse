import { describe, expect, it } from "vitest";
import { plannerNeedsFollowup } from "../../server/modules/agent/buildPlannerPrompt";
import type { AgentPlannerResponse } from "../../server/modules/agent/plannerResponse";

describe("normalizePlannerResponse", () => {
  it("normalizes unknown actions to ask_followup", async () => {
    const { normalizePlannerResponse: normalize } = await import("../../server/modules/agent/plannerResponse");
    const response = normalize({
      action: "do_everything",
      arguments: {
        fieldKeys: ["", "approver"],
      },
      confidence: 2,
      missingInformation: ["", "target section"],
      reason: "Need more detail.",
      target: {
        headingNodeId: "heading-1",
        sectionId: "section-1",
      },
    });

    expect(response).toEqual({
      action: "ask_followup",
      arguments: {
        fieldKeys: ["approver"],
      },
      confidence: 1,
      missingInformation: ["target section"],
      reason: "Need more detail.",
      target: {
        headingNodeId: "heading-1",
        sectionId: "section-1",
      },
    });
  });

  it("marks low-confidence plans as follow-up candidates", () => {
    const planner: AgentPlannerResponse = {
      action: "update_current_document",
      confidence: 0.42,
      missingInformation: [],
      reason: "Not enough certainty.",
    };

    expect(plannerNeedsFollowup(planner, 0.65)).toBe(true);
  });

  it("marks plans with missing information as follow-up candidates", () => {
    const planner: AgentPlannerResponse = {
      action: "create_new_document",
      confidence: 0.91,
      missingInformation: ["document purpose"],
      reason: "Need more detail.",
    };

    expect(plannerNeedsFollowup(planner, 0.65)).toBe(true);
  });

  it("keeps summarize_document arguments including createDocumentAfter", async () => {
    const { normalizePlannerResponse: normalize } = await import("../../server/modules/agent/plannerResponse");
    const response = normalize({
      action: "summarize_document",
      arguments: {
        createDocumentAfter: true,
        prompt: "Summarize the current document.",
      },
      confidence: 0.9,
      missingInformation: [],
      reason: "The user asked for a summary document.",
    });

    expect(response).toEqual({
      action: "summarize_document",
      arguments: {
        createDocumentAfter: true,
        prompt: "Summarize the current document.",
      },
      confidence: 0.9,
      missingInformation: [],
      reason: "The user asked for a summary document.",
      target: undefined,
    });
  });

  it("allows compare_documents to proceed without blocking follow-up when the target is unresolved", () => {
    const planner: AgentPlannerResponse = {
      action: "compare_documents",
      confidence: 0.88,
      missingInformation: ["target document"],
      reason: "The user wants a comparison but did not name the target.",
    };

    expect(plannerNeedsFollowup(planner, 0.65)).toBe(false);
  });
});
