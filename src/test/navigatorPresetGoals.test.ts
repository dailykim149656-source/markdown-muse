import { describe, expect, it } from "vitest";
import { getNavigatorPresetGoals } from "@/lib/visualNavigator/presetGoals";

describe("getNavigatorPresetGoals", () => {
  it("keeps stable quick-action intents for the demo flows", () => {
    const goals = getNavigatorPresetGoals();
    const intents = goals.map((goal) => goal.intent);

    expect(intents).toContain("Open the Google Workspace connection dialog.");
    expect(intents).toContain("Open Patch Review.");
    expect(intents).toContain("Switch the editor to HTML mode.");
    expect(intents).toContain("Switch the editor to LaTeX mode.");
    expect(intents).toContain("Open AI Assistant.");
  });

  it("deemphasizes presets for already-open surfaces", () => {
    const goals = getNavigatorPresetGoals({
      modals: {
        aiAssistantOpen: true,
        patchReviewOpen: true,
        workspaceConnectionOpen: true,
      },
      route: "/editor",
      viewport: {
        height: 720,
        width: 1280,
      },
      visibleLabels: [],
      visibleTargets: [],
    });

    expect(goals.find((goal) => goal.key === "open-google-workspace")?.deemphasized).toBe(true);
    expect(goals.find((goal) => goal.key === "open-patch-review")?.deemphasized).toBe(true);
    expect(goals.find((goal) => goal.key === "open-ai-assistant")?.deemphasized).toBe(true);
  });
});
