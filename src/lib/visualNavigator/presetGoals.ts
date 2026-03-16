import type {
  NavigatorGoalSuggestion,
  NavigatorUiHints,
} from "@/types/visualNavigator";

export interface NavigatorGoalOption extends NavigatorGoalSuggestion {
  deemphasized?: boolean;
  key: string;
  source: "preset" | "recent" | "suggested";
}

const PRESET_GOALS: NavigatorGoalOption[] = [
  {
    intent: "Open the Google Workspace connection dialog.",
    key: "open-google-workspace",
    label: "Open Google Workspace",
    rationale: "Open the Google Workspace connection flow from the current Docsy session.",
    source: "preset",
  },
  {
    intent: "Open Patch Review.",
    key: "open-patch-review",
    label: "Open Patch Review",
    rationale: "Move directly into the review-first patch workflow.",
    source: "preset",
  },
  {
    intent: "Switch the editor to HTML mode.",
    key: "switch-html",
    label: "Switch to HTML",
    rationale: "Change the current editor mode to HTML.",
    source: "preset",
  },
  {
    intent: "Switch the editor to LaTeX mode.",
    key: "switch-latex",
    label: "Switch to LaTeX",
    rationale: "Change the current editor mode to LaTeX.",
    source: "preset",
  },
  {
    intent: "Open AI Assistant.",
    key: "open-ai-assistant",
    label: "Open AI Assistant",
    rationale: "Bring the assistant surface into view.",
    source: "preset",
  },
];

export const getNavigatorPresetGoals = (uiHints?: NavigatorUiHints): NavigatorGoalOption[] =>
  PRESET_GOALS.map((goal) => {
    if (!uiHints) {
      return goal;
    }

    if (goal.key === "open-google-workspace" && uiHints.modals.workspaceConnectionOpen) {
      return {
        ...goal,
        deemphasized: true,
      };
    }

    if (goal.key === "open-patch-review" && uiHints.modals.patchReviewOpen) {
      return {
        ...goal,
        deemphasized: true,
      };
    }

    if (goal.key === "open-ai-assistant" && uiHints.modals.aiAssistantOpen) {
      return {
        ...goal,
        deemphasized: true,
      };
    }

    return goal;
  });
