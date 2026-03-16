import { describe, expect, it } from "vitest";
import { normalizeNavigatorGoalSuggestionResponse } from "../../server/modules/navigator/goalSuggestionResponse";

describe("normalizeNavigatorGoalSuggestionResponse", () => {
  it("deduplicates suggestions by intent and clamps confidence", () => {
    const response = normalizeNavigatorGoalSuggestionResponse({
      request: {
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
            aiAssistantOpen: false,
            patchReviewOpen: false,
            workspaceConnectionOpen: false,
          },
          route: "/editor",
          viewport: {
            height: 720,
            width: 1280,
          },
          visibleLabels: [],
          visibleTargets: [],
        },
      },
      response: {
        suggestions: [{
          confidence: 2,
          intent: "Open Patch Review.",
          label: "Open Patch Review",
          rationale: "Review is visible.",
        }, {
          confidence: 0.5,
          intent: "Open Patch Review.",
          label: "Open Review",
          rationale: "Duplicate intent.",
        }],
      },
    });

    expect(response.suggestions).toEqual([{
      confidence: 1,
      intent: "Open Patch Review.",
      label: "Open Patch Review",
      rationale: "Review is visible.",
    }]);
  });

  it("adds heuristic suggestions when stable targets are visible", () => {
    const response = normalizeNavigatorGoalSuggestionResponse({
      request: {
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
          visibleLabels: ["Google"],
          visibleTargets: [{
            dataTarget: "header-google-menu",
            label: "Google Workspace",
            role: "button",
          }, {
            dataTarget: "header-open-patch-review",
            label: "Patch Review",
            role: "button",
          }],
        },
      },
      response: {
        suggestions: [],
      },
    });

    expect(response.suggestions.map((suggestion) => suggestion.label)).toContain("Open Google Workspace");
    expect(response.suggestions.map((suggestion) => suggestion.label)).toContain("Open Patch Review");
  });
});
