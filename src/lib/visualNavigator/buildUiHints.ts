import {
  collectVisibleNavigatorLabels,
  collectVisibleNavigatorTargets,
  describeFocusedNavigatorElement,
} from "@/lib/visualNavigator/domTargets";
import type { NavigatorUiHints } from "@/types/visualNavigator";

export const buildVisualNavigatorUiHints = (): NavigatorUiHints => ({
  focusedElement: describeFocusedNavigatorElement(),
  modals: {
    aiAssistantOpen: document.querySelector("[data-visual-target='ai-assistant-dialog']") !== null,
    patchReviewOpen: document.querySelector("[data-testid='patch-review-dialog']") !== null,
    workspaceConnectionOpen: document.querySelector("[data-visual-target='workspace-connection-dialog']") !== null,
  },
  route: window.location.pathname,
  viewport: {
    height: window.innerHeight,
    width: window.innerWidth,
  },
  visibleLabels: collectVisibleNavigatorLabels(),
  visibleTargets: collectVisibleNavigatorTargets(),
});
