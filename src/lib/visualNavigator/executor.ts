import {
  resolveNavigatorActionTarget,
  resolveNavigatorCoordinatesTarget,
} from "@/lib/visualNavigator/domTargets";
import type { NavigatorAction, NavigatorActionTarget } from "@/types/visualNavigator";

export interface NavigatorActionExecutionResult {
  message: string;
  outcome: "ambiguous" | "error" | "executed" | "not_found";
  targetDescription?: string;
}

const hasSemanticHints = (target: NavigatorActionTarget | undefined) =>
  Boolean(target?.dataTarget || target?.name || target?.text || target?.placeholder || target?.role);

const resolveTarget = (target: NavigatorActionTarget | undefined) => {
  if (!target) {
    return { outcome: "not_found" as const };
  }

  if (hasSemanticHints(target)) {
    const semanticMatch = resolveNavigatorActionTarget(target);
    if (semanticMatch.outcome === "resolved" || !target.coordinates) {
      return semanticMatch;
    }
  }

  if (target.coordinates) {
    return resolveNavigatorCoordinatesTarget(target.coordinates);
  }

  return { outcome: "not_found" as const };
};

const dispatchKeyboardEvent = (target: EventTarget, type: "keydown" | "keyup", key: string) =>
  target.dispatchEvent(new KeyboardEvent(type, {
    bubbles: true,
    cancelable: true,
    key,
  }));

const setNativeValue = (element: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  const prototype = Object.getPrototypeOf(element);
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");

  descriptor?.set?.call(element, value);
};

const submitElement = (element: HTMLElement, key: string) => {
  if (key === "Enter") {
    if (element instanceof HTMLButtonElement || element instanceof HTMLAnchorElement) {
      element.click();
      return;
    }

    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.form?.requestSubmit();
    }
  }
};

const performPointerClick = (element: HTMLElement) => {
  const dispatchPointer = (type: string) => element.dispatchEvent(new PointerEvent(type, {
    bubbles: true,
    button: 0,
    cancelable: true,
    composed: true,
    pointerId: 1,
    pointerType: "mouse",
  }));
  const dispatchMouse = (type: "mousedown" | "mouseup" | "click") => element.dispatchEvent(new MouseEvent(type, {
    bubbles: true,
    button: 0,
    cancelable: true,
    composed: true,
  }));

  dispatchPointer("pointerdown");
  dispatchMouse("mousedown");
  dispatchPointer("pointerup");
  dispatchMouse("mouseup");
  dispatchMouse("click");
};

const executeTypeAction = (
  targetElement: HTMLElement,
  text: string,
  submit?: boolean,
): NavigatorActionExecutionResult => {
  targetElement.focus();

  if (targetElement instanceof HTMLInputElement || targetElement instanceof HTMLTextAreaElement) {
    setNativeValue(targetElement, text);
    targetElement.dispatchEvent(new Event("input", { bubbles: true }));
    targetElement.dispatchEvent(new Event("change", { bubbles: true }));
  } else if (targetElement.isContentEditable) {
    targetElement.textContent = text;
    targetElement.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      data: text,
      inputType: "insertText",
    }));
  } else {
    return {
      message: "The selected target is not editable.",
      outcome: "error",
    };
  }

  if (submit) {
    submitElement(targetElement, "Enter");
  }

  return {
    message: "Typed into the requested field.",
    outcome: "executed",
  };
};

const executePressKeyAction = (targetElement: HTMLElement | null, key: string): NavigatorActionExecutionResult => {
  const destination = targetElement || (document.activeElement instanceof HTMLElement ? document.activeElement : document.body);

  destination.focus?.();
  dispatchKeyboardEvent(destination, "keydown", key);
  submitElement(destination, key);
  dispatchKeyboardEvent(destination, "keyup", key);

  return {
    message: `Pressed ${key}.`,
    outcome: "executed",
  };
};

const executeScrollAction = (targetElement: HTMLElement | null, direction: "down" | "up", amount: "large" | "medium" | "small") => {
  const pixels = amount === "small" ? 160 : amount === "large" ? 480 : 280;
  const delta = direction === "up" ? -pixels : pixels;

  if (targetElement && typeof targetElement.scrollBy === "function") {
    targetElement.scrollBy({ behavior: "smooth", top: delta });
  } else {
    window.scrollBy({ behavior: "smooth", top: delta });
  }

  return {
    message: `Scrolled ${direction}.`,
    outcome: "executed" as const,
  };
};

export const executeNavigatorAction = async (
  action: Exclude<NavigatorAction, { type: "ask_followup" } | { type: "done" }>,
): Promise<NavigatorActionExecutionResult> => {
  if (action.type === "wait") {
    await new Promise((resolve) => window.setTimeout(resolve, action.durationMs));
    return {
      message: "Waited for the requested delay.",
      outcome: "executed",
    };
  }

  if (action.type === "scroll") {
    const target = action.target ? resolveTarget(action.target) : { outcome: "resolved" as const, element: null, description: undefined };

    if (action.target && target.outcome === "ambiguous") {
      return {
        message: "The scroll target is ambiguous.",
        outcome: "ambiguous",
      };
    }

    if (action.target && target.outcome === "not_found") {
      return {
        message: "The scroll target could not be found.",
        outcome: "not_found",
      };
    }

    const result = executeScrollAction(target.element || null, action.direction, action.amount);
    return {
      ...result,
      targetDescription: target.description,
    };
  }

  if (action.type === "press_key") {
    const target = action.target ? resolveTarget(action.target) : { outcome: "resolved" as const, element: null, description: undefined };

    if (action.target && target.outcome === "ambiguous") {
      return {
        message: "The keyboard target is ambiguous.",
        outcome: "ambiguous",
      };
    }

    if (action.target && target.outcome === "not_found") {
      return {
        message: "The keyboard target could not be found.",
        outcome: "not_found",
      };
    }

    return {
      ...executePressKeyAction(target.element || null, action.key),
      targetDescription: target.description,
    };
  }

  const target = resolveTarget(action.target);

  if (target.outcome === "ambiguous") {
    return {
      message: "The requested UI target is ambiguous.",
      outcome: "ambiguous",
    };
  }

  if (target.outcome === "not_found" || !target.element) {
    return {
      message: "The requested UI target could not be found.",
      outcome: "not_found",
    };
  }

  if (action.type === "click") {
    target.element.focus();
    performPointerClick(target.element);
    return {
      message: "Clicked the requested UI target.",
      outcome: "executed",
      targetDescription: target.description,
    };
  }

  const result = executeTypeAction(target.element, action.text, action.submit);

  return {
    ...result,
    targetDescription: target.description,
  };
};
