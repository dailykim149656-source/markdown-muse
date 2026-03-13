import { describe, expect, it } from "vitest";
import { hasExplicitNewDraftRequestInConversation, isExplicitNewDraftRequest } from "../../server/modules/agent/buildTurnPrompt";

describe("live agent new-draft intent detection", () => {
  it("detects an explicit new-draft request from the latest user message", () => {
    expect(isExplicitNewDraftRequest("자기소개서 작성을 해줘. 양식을 만들어줄래?")).toBe(true);
  });

  it("keeps new-draft intent across follow-up turns in the same conversation", () => {
    expect(hasExplicitNewDraftRequestInConversation([
      {
        createdAt: 1,
        id: "m1",
        role: "user",
        text: "자기소개서 작성을 해줘. 양식을 만들어줄래?",
      },
      {
        createdAt: 2,
        id: "m2",
        role: "assistant",
        text: "어떤 내용을 포함하면 좋을까요?",
      },
      {
        createdAt: 3,
        id: "m3",
        role: "user",
        text: "이름, 경력, 학력, 기술은 있어야 할 것 같아",
      },
    ])).toBe(true);
  });
});
