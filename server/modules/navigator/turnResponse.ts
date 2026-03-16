import { schemaType } from "../gemini/client";
import type {
  NavigatorAction,
  NavigatorActionTarget,
  NavigatorTurnResponse,
} from "../../../src/types/visualNavigator";

interface RawNavigatorActionTarget {
  coordinates?: {
    x?: number;
    y?: number;
  };
  dataTarget?: string;
  name?: string;
  placeholder?: string;
  role?: string;
  text?: string;
}

interface RawNavigatorAction {
  amount?: string;
  direction?: string;
  durationMs?: number;
  key?: string;
  question?: string;
  submit?: boolean;
  summary?: string;
  target?: RawNavigatorActionTarget;
  text?: string;
  type?: string;
}

export interface RawNavigatorTurnResponse {
  action?: RawNavigatorAction;
  confidence?: number;
  rationale?: string;
  statusText?: string;
}

const normalizeText = (value: string | undefined) => value?.trim() || undefined;

const normalizeTarget = (target: RawNavigatorActionTarget | undefined): NavigatorActionTarget | null => {
  if (!target) {
    return null;
  }

  const normalized: NavigatorActionTarget = {};

  const role = normalizeText(target.role);
  if (
    role === "button"
    || role === "checkbox"
    || role === "combobox"
    || role === "dialog"
    || role === "link"
    || role === "menuitem"
    || role === "option"
    || role === "tab"
    || role === "textbox"
  ) {
    normalized.role = role;
  }

  const dataTarget = normalizeText(target.dataTarget);
  if (dataTarget) {
    normalized.dataTarget = dataTarget;
  }

  const name = normalizeText(target.name);
  if (name) {
    normalized.name = name;
  }

  const text = normalizeText(target.text);
  if (text) {
    normalized.text = text;
  }

  const placeholder = normalizeText(target.placeholder);
  if (placeholder) {
    normalized.placeholder = placeholder;
  }

  const x = Number(target.coordinates?.x);
  const y = Number(target.coordinates?.y);
  if (Number.isFinite(x) && Number.isFinite(y)) {
    normalized.coordinates = {
      x: Math.max(0, Math.round(x)),
      y: Math.max(0, Math.round(y)),
    };
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
};

const createAskFollowupAction = (question: string): NavigatorAction => ({
  question,
  type: "ask_followup",
});

const normalizeAction = (action: RawNavigatorAction | undefined): NavigatorAction => {
  const actionType = normalizeText(action?.type)?.toLowerCase();
  const target = normalizeTarget(action?.target);

  switch (actionType) {
    case "click":
      return target
        ? {
          target,
          type: "click",
        }
        : createAskFollowupAction("I could not identify which UI element to click.");
    case "type": {
      const text = normalizeText(action?.text);

      return target && text
        ? {
          submit: Boolean(action?.submit),
          target,
          text,
          type: "type",
        }
        : createAskFollowupAction("I need a clearer input target before typing.");
    }
    case "press_key":
      return {
        key: normalizeText(action?.key) || "Enter",
        target: target || undefined,
        type: "press_key",
      };
    case "scroll":
      return {
        amount: action?.amount === "small" || action?.amount === "large" ? action.amount : "medium",
        direction: action?.direction === "up" ? "up" : "down",
        target: target || undefined,
        type: "scroll",
      };
    case "wait":
      return {
        durationMs: Math.max(150, Math.min(1500, Number(action?.durationMs) || 400)),
        type: "wait",
      };
    case "done":
      return {
        summary: normalizeText(action?.summary) || "The visual navigation goal is complete.",
        type: "done",
      };
    case "ask_followup":
    default:
      return createAskFollowupAction(
        normalizeText(action?.question) || "I need a bit more direction before I continue.",
      );
  }
};

export const normalizeNavigatorTurnResponse = (
  response: RawNavigatorTurnResponse,
): NavigatorTurnResponse => ({
  action: normalizeAction(response.action),
  confidence: Math.max(0, Math.min(1, Number(response.confidence) || 0)),
  rationale: normalizeText(response.rationale) || "Choose the next safest visible UI action.",
  statusText: normalizeText(response.statusText) || "Review the next visual navigation step.",
});

export const navigatorTurnResponseSchema = {
  properties: {
    action: {
      properties: {
        amount: { type: schemaType.STRING },
        direction: { type: schemaType.STRING },
        durationMs: { type: schemaType.NUMBER },
        key: { type: schemaType.STRING },
        question: { type: schemaType.STRING },
        submit: { type: schemaType.BOOLEAN },
        summary: { type: schemaType.STRING },
        target: {
          properties: {
            coordinates: {
              properties: {
                x: { type: schemaType.NUMBER },
                y: { type: schemaType.NUMBER },
              },
              type: schemaType.OBJECT,
            },
            dataTarget: { type: schemaType.STRING },
            name: { type: schemaType.STRING },
            placeholder: { type: schemaType.STRING },
            role: { type: schemaType.STRING },
            text: { type: schemaType.STRING },
          },
          type: schemaType.OBJECT,
        },
        text: { type: schemaType.STRING },
        type: { type: schemaType.STRING },
      },
      required: ["type"],
      type: schemaType.OBJECT,
    },
    confidence: { type: schemaType.NUMBER },
    rationale: { type: schemaType.STRING },
    statusText: { type: schemaType.STRING },
  },
  required: ["action", "confidence", "rationale", "statusText"],
  type: schemaType.OBJECT,
};
