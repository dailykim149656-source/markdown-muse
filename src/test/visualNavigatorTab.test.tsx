import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import VisualNavigatorTab from "@/components/editor/VisualNavigatorTab";
import type { VisualNavigatorRuntimeState } from "@/hooks/useVisualNavigator";

const createVisualNavigatorState = (): VisualNavigatorRuntimeState => ({
  advancedCommandOpen: false,
  canStart: true,
  clearHistory: vi.fn(),
  confirmPendingAction: vi.fn(),
  history: [],
  intent: "",
  isRefreshingSuggestions: false,
  isRunning: false,
  lastConfidence: null,
  lastError: null,
  lastRationale: null,
  pendingConfirmation: null,
  presetGoals: [{
    intent: "Open Patch Review.",
    key: "open-patch-review",
    label: "Open Patch Review",
    rationale: "Preset",
    source: "preset",
  }],
  recentGoals: [{
    intent: "Open the Google Workspace connection dialog.",
    key: "recent-google",
    label: "Open Google Workspace",
    rationale: "Recent",
    source: "recent",
  }],
  refreshSuggestions: vi.fn().mockResolvedValue(undefined),
  rejectPendingAction: vi.fn(),
  runGoal: vi.fn().mockResolvedValue(undefined),
  selectedGoalIntent: null,
  setAdvancedCommandOpen: vi.fn(),
  setIntent: vi.fn(),
  startRun: vi.fn().mockResolvedValue(undefined),
  statusText: null,
  stopReason: null,
  stopRun: vi.fn(),
  suggestedGoals: [{
    confidence: 0.85,
    intent: "Switch the editor to HTML mode.",
    key: "suggested-html",
    label: "Switch to HTML",
    rationale: "Suggested from the current screen.",
    source: "suggested",
  }],
  suggestionsError: null,
});

describe("VisualNavigatorTab", () => {
  it("renders suggestions-first controls and keeps advanced command collapsed until opened", () => {
    const state = createVisualNavigatorState();
    const { container } = render(<VisualNavigatorTab visualNavigator={state} />);

    expect(screen.getByText("Suggested next goals")).toBeInTheDocument();
    expect(screen.getByText("Switch to HTML")).toBeInTheDocument();
    expect(screen.getByText("Quick actions")).toBeInTheDocument();
    expect(screen.getByText("Recent goals")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Switch the editor to HTML, then open Patch Review.")).not.toBeInTheDocument();

    const advancedToggle = container.querySelector("[data-visual-target='navigator-advanced-toggle']");
    expect(advancedToggle).not.toBeNull();
    fireEvent.click(advancedToggle as HTMLElement);

    expect(state.setAdvancedCommandOpen).toHaveBeenCalled();
  });

  it("starts runs from suggested and preset goals without typing", () => {
    const state = createVisualNavigatorState();
    render(<VisualNavigatorTab visualNavigator={state} />);

    fireEvent.click(screen.getByText("Switch to HTML"));
    fireEvent.click(screen.getByText("Open Patch Review"));

    expect(state.runGoal).toHaveBeenCalledTimes(2);
  });
});
