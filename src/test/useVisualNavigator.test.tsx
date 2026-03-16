import { act, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useVisualNavigator, type VisualNavigatorRuntimeState } from "@/hooks/useVisualNavigator";
import { I18nContext } from "@/i18n/I18nProvider";

const navigateVisualUiMock = vi.fn();
const captureViewportScreenshotMock = vi.fn();
const buildVisualNavigatorUiHintsMock = vi.fn();
const executeNavigatorActionMock = vi.fn();

vi.mock("@/lib/ai/visualNavigatorClient", () => ({
  navigateVisualUi: (...args: Parameters<typeof navigateVisualUiMock>) => navigateVisualUiMock(...args),
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

  afterEach(() => {
    latestState = null;
    closeAssistant.mockReset();
    navigateVisualUiMock.mockReset();
    captureViewportScreenshotMock.mockReset();
    buildVisualNavigatorUiHintsMock.mockReset();
    executeNavigatorActionMock.mockReset();
  });

  it("records follow-up responses without executing a browser action", async () => {
    captureViewportScreenshotMock.mockResolvedValue({
      capturedAt: Date.now(),
      dataBase64: "abc",
      height: 720,
      mimeType: "image/png",
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
      visibleLabels: ["Google Workspace"],
      visibleTargets: [],
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
      latestState?.setIntent("Open Google");
    });

    await act(async () => {
      await latestState?.startRun();
    });

    await waitFor(() => {
      expect(latestState?.isRunning).toBe(false);
      expect(latestState?.stopReason).toBe("Which Google action should I open first?");
    });

    expect(closeAssistant).toHaveBeenCalled();
    expect(executeNavigatorActionMock).not.toHaveBeenCalled();
    expect(latestState?.history[0]).toEqual(expect.objectContaining({
      outcome: "followup",
    }));
  });
});
