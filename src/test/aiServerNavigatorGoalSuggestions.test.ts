import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NavigatorGoalSuggestionRequest } from "@/types/visualNavigator";

const generateMultimodalStructuredJsonMock = vi.fn();

const ORIGINAL_ENV = {
  VITEST: process.env.VITEST,
};

beforeEach(() => {
  vi.resetModules();
  generateMultimodalStructuredJsonMock.mockReset();
  process.env.VITEST = "true";
  vi.doMock("../../server/modules/gemini/client", async () => {
    const actual = await vi.importActual<typeof import("../../server/modules/gemini/client")>("../../server/modules/gemini/client");

    return {
      ...actual,
      generateMultimodalStructuredJson: (...args: Parameters<typeof generateMultimodalStructuredJsonMock>) =>
        generateMultimodalStructuredJsonMock(...args),
    };
  });
});

afterEach(() => {
  process.env.VITEST = ORIGINAL_ENV.VITEST;
});

describe("handleNavigatorGoalSuggestions", () => {
  it("returns normalized goal suggestions from multimodal input", async () => {
    generateMultimodalStructuredJsonMock.mockResolvedValue({
      suggestions: [{
        confidence: 0.92,
        intent: "Open Patch Review.",
        label: "Open Patch Review",
        rationale: "Patch Review is visible.",
      }],
    });

    const { handleNavigatorGoalSuggestions } = await import("../../server/aiServer");
    const response = await handleNavigatorGoalSuggestions({
      recentHistory: [],
      screenshot: {
        capturedAt: Date.now(),
        dataBase64: "abc",
        height: 720,
        mimeType: "image/jpeg",
        width: 1280,
      },
      ui: {
        modals: {
          aiAssistantOpen: true,
          patchReviewOpen: false,
          workspaceConnectionOpen: false,
        },
        route: "/editor",
        viewport: {
          height: 720,
          width: 1280,
        },
        visibleLabels: ["Patch Review"],
        visibleTargets: [{
          dataTarget: "header-open-patch-review",
          label: "Patch Review",
          role: "button",
        }],
      },
    } satisfies NavigatorGoalSuggestionRequest);

    expect(response.suggestions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        intent: "Open Patch Review.",
        label: "Open Patch Review",
      }),
    ]));
  }, 60_000);
});
