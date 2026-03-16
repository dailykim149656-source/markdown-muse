import { afterEach, describe, expect, it } from "vitest";
import {
  readRecentNavigatorGoals,
  recordRecentNavigatorGoal,
  RECENT_GOALS_STORAGE_KEY,
} from "@/lib/visualNavigator/recentGoals";

describe("recent navigator goals", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("stores recent goals with newest-first deduplication", () => {
    recordRecentNavigatorGoal({
      intent: "Open Patch Review.",
      label: "Open Patch Review",
      rationale: "Review patches.",
    });
    recordRecentNavigatorGoal({
      intent: "Open the Google Workspace connection dialog.",
      label: "Open Google Workspace",
      rationale: "Open Google.",
    });
    recordRecentNavigatorGoal({
      intent: "Open Patch Review.",
      label: "Open Patch Review",
      rationale: "Review patches again.",
    });

    expect(readRecentNavigatorGoals()).toEqual([{
      intent: "Open Patch Review.",
      label: "Open Patch Review",
      rationale: "Review patches again.",
    }, {
      intent: "Open the Google Workspace connection dialog.",
      label: "Open Google Workspace",
      rationale: "Open Google.",
    }]);
    expect(window.localStorage.getItem(RECENT_GOALS_STORAGE_KEY)).toContain("Open Patch Review.");
  });
});
