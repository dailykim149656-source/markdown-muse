import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useVisualNavigator, type VisualNavigatorRuntimeState } from "@/hooks/useVisualNavigator";
import { I18nContext } from "@/i18n/I18nProvider";

const navigateVisualUiMock = vi.fn();
const suggestVisualNavigatorGoalsMock = vi.fn();
const captureViewportScreenshotMock = vi.fn();
const buildVisualNavigatorUiHintsMock = vi.fn();
const executeNavigatorActionMock = vi.fn();

vi.mock("@/lib/ai/visualNavigatorClient", () => ({
  navigateVisualUi: (...args: Parameters<typeof navigateVisualUiMock>) => navigateVisualUiMock(...args),
  suggestVisualNavigatorGoals: (...args: Parameters<typeof suggestVisualNavigatorGoalsMock>) =>
    suggestVisualNavigatorGoalsMock(...args),
}));

vi.mock("@/lib/visualNavigator/captureViewportScreenshot", () => ({
  captureViewportScreenshot: (...args: Parameters<typeof captureViewportScreenshotMock>) =>
    captureViewportScreenshotMock(...args),
}));

vi.mock("@/lib/visualNavigator/buildUiHints", () => ({
  buildVisualNavigatorUiHints: (...args: Parameters<typeof buildVisualNavigatorUiHintsMock>) =>
    buildVisualNavigatorUiHintsMock(...args),
}));

vi.mock("@/lib/visualNavigator/executor", () => ({
  executeNavigatorAction: (...args: Parameters<typeof executeNavigatorActionMock>) =>
    executeNavigatorActionMock(...args),
}));

describe("useVisualNavigator", () => {
  let latestState: VisualNavigatorRuntimeState | null = null;

  const closeAssistant = vi.fn();

  const Harness = () => {
    latestState = useVisualNavigator({
      onCloseAssistant: closeAssistant,
    });

    return null;
  };

  beforeEach(() => {
    captureViewportScreenshotMock.mockResolvedValue({
      capturedAt: Date.now(),
      dataBase64: "abc",
      height: 720,
      mimeType: "image/jpeg",
      width: 1280,
    });
    buildVisualNavigatorUiHintsMock.mockReturnValue({
      focusedElement: undefined,
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
      visibleLabels: ["Google Workspace", "Patch Review"],
      visibleTargets: [{
        dataTarget: "header-google-menu",
        label: "Google Workspace",
        role: "button",
      }],
    });
  });

  afterEach(() => {
    latestState = null;
    closeAssistant.mockReset();
    navigateVisualUiMock.mockReset();
    suggestVisualNavigatorGoalsMock.mockReset();
    captureViewportScreenshotMock.mockClear();
    buildVisualNavigatorUiHintsMock.mockClear();
    executeNavigatorActionMock.mockReset();
    window.localStorage.clear();
  });

  it("loads goal suggestions from the current screen", async () => {
    suggestVisualNavigatorGoalsMock.mockResolvedValue({
      suggestions: [{
        confidence: 0.8,
        intent: "Open the Google Workspace connection dialog.",
        label: "Open Google Workspace",
        rationale: "Google controls are visible.",
      }],
    });

    render(
      <I18nContext.Provider value={{ locale: "en", setLocale: vi.fn(), t: (key) => key }}>
        <Harness />
      </I18nContext.Provider>,
    );

    await act(async () => {
      await latestState?.refreshSuggestions();
    });

    await waitFor(() => {
      expect(latestState?.suggestedGoals[0]).toEqual(expect.objectContaining({
        intent: "Open the Google Workspace connection dialog.",
        label: "Open Google Workspace",
      }));
    });
  });

  it("records follow-up responses without executing a browser action", async () => {
    suggestVisualNavigatorGoalsMock.mockResolvedValue({
      suggestions: [],
    });
    navigateVisualUiMock.mockResolvedValue({
      action: {
        question: "Which Google action should I open first?",
        type: "ask_followup",
      },
      confidence: 0.6,
      rationale: "More direction is needed.",
      statusText: "I need one more detail.",
    });

    render(
      <I18nContext.Provider value={{ locale: "en", setLocale: vi.fn(), t: (key) => key }}>
        <Harness />
      </I18nContext.Provider>,
    );

    await act(async () => {
      await latestState?.runGoal({
        intent: "Open Google Workspace.",
        label: "Open Google Workspace",
        rationale: "Use a quick action.",
      });
    });

    await waitFor(() => {
      expect(latestState?.isRunning).toBe(false);
      expect(latestState?.stopReason).toBe("Which Google action should I open first?");
    });

    expect(closeAssistant).toHaveBeenCalled();
    expect(executeNavigatorActionMock).not.toHaveBeenCalled();
    expect(latestState?.recentGoals[0]).toEqual(expect.objectContaining({
      intent: "Open Google Workspace.",
    }));
  });
});
