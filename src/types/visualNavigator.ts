import type { Locale } from "@/i18n/types";
import type { AiAssistantScreenshotPayload } from "@/types/aiAssistant";

export type NavigatorSemanticRole =
  | "button"
  | "checkbox"
  | "combobox"
  | "dialog"
  | "link"
  | "menuitem"
  | "option"
  | "tab"
  | "textbox";

export interface NavigatorActionTarget {
  coordinates?: {
    x: number;
    y: number;
  };
  dataTarget?: string;
  name?: string;
  placeholder?: string;
  role?: NavigatorSemanticRole;
  text?: string;
}

export interface NavigatorClickAction {
  target: NavigatorActionTarget;
  type: "click";
}

export interface NavigatorTypeAction {
  submit?: boolean;
  target: NavigatorActionTarget;
  text: string;
  type: "type";
}

export interface NavigatorPressKeyAction {
  key: string;
  target?: NavigatorActionTarget;
  type: "press_key";
}

export interface NavigatorScrollAction {
  amount: "large" | "medium" | "small";
  direction: "down" | "up";
  target?: NavigatorActionTarget;
  type: "scroll";
}

export interface NavigatorWaitAction {
  durationMs: number;
  type: "wait";
}

export interface NavigatorAskFollowupAction {
  question: string;
  type: "ask_followup";
}

export interface NavigatorDoneAction {
  summary: string;
  type: "done";
}

export type NavigatorAction =
  | NavigatorAskFollowupAction
  | NavigatorClickAction
  | NavigatorDoneAction
  | NavigatorPressKeyAction
  | NavigatorScrollAction
  | NavigatorTypeAction
  | NavigatorWaitAction;

export interface NavigatorVisibleTarget {
  dataTarget?: string;
  label: string;
  role?: string;
}

export interface NavigatorUiHints {
  focusedElement?: string;
  modals: {
    aiAssistantOpen: boolean;
    patchReviewOpen: boolean;
    workspaceConnectionOpen: boolean;
  };
  route: string;
  viewport: {
    height: number;
    width: number;
  };
  visibleLabels?: string[];
  visibleTargets: NavigatorVisibleTarget[];
}

export type NavigatorExecutionOutcome =
  | "ambiguous"
  | "blocked"
  | "done"
  | "error"
  | "executed"
  | "followup"
  | "not_found";

export interface NavigatorHistoryEntry {
  action: NavigatorAction;
  confidence: number;
  executedAt: number;
  outcome: NavigatorExecutionOutcome;
  rationale: string;
  statusText: string;
  targetDescription?: string;
}

export interface NavigatorGoalSuggestion {
  confidence?: number;
  intent: string;
  label: string;
  rationale: string;
}

export interface NavigatorGoalSuggestionRequest {
  locale?: Locale;
  recentHistory: NavigatorHistoryEntry[];
  screenshot: AiAssistantScreenshotPayload;
  ui: NavigatorUiHints;
}

export interface NavigatorGoalSuggestionResponse {
  suggestions: NavigatorGoalSuggestion[];
}

export interface NavigatorTurnRequest {
  intent: string;
  locale?: Locale;
  recentHistory: NavigatorHistoryEntry[];
  screenshot: AiAssistantScreenshotPayload;
  ui: NavigatorUiHints;
}

export interface NavigatorTurnResponse {
  action: NavigatorAction;
  confidence: number;
  rationale: string;
  statusText: string;
}
