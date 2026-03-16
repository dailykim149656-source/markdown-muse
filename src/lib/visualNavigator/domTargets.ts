import type { NavigatorActionTarget, NavigatorVisibleTarget } from "@/types/visualNavigator";

const INTERACTIVE_SELECTOR = [
  "button",
  "a[href]",
  "input:not([type='hidden'])",
  "textarea",
  "select",
  "[role='button']",
  "[role='combobox']",
  "[role='link']",
  "[role='menuitem']",
  "[role='option']",
  "[role='tab']",
  "[role='textbox']",
  "[contenteditable='true']",
  "[data-visual-target]",
  "[data-testid]",
].join(",");

export interface NavigatorResolvedTarget {
  description: string;
  element: HTMLElement;
  resolution: "coordinates" | "semantic";
}

export interface NavigatorResolveResult {
  description?: string;
  element?: HTMLElement;
  outcome: "ambiguous" | "not_found" | "resolved";
}

const normalizeText = (value: string | null | undefined) =>
  value?.replace(/\s+/g, " ").trim().toLowerCase() || "";

const shouldIgnoreNavigatorElement = (element: HTMLElement) =>
  element.dataset.visualIgnore === "true" || element.closest("[data-visual-ignore='true']") !== null;

const extractLabelledByText = (element: HTMLElement) =>
  (element.getAttribute("aria-labelledby") || "")
    .split(/\s+/)
    .map((id) => document.getElementById(id)?.textContent?.trim() || "")
    .filter(Boolean)
    .join(" ");

const extractAssociatedLabelText = (element: HTMLElement) => {
  if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) {
    return "";
  }

  if (element.labels && element.labels.length > 0) {
    return Array.from(element.labels)
      .map((label) => label.textContent?.trim() || "")
      .filter(Boolean)
      .join(" ");
  }

  if (element.id) {
    return Array.from(document.querySelectorAll(`label[for="${CSS.escape(element.id)}"]`))
      .map((label) => label.textContent?.trim() || "")
      .filter(Boolean)
      .join(" ");
  }

  return element.closest("label")?.textContent?.trim() || "";
};

const inferRole = (element: HTMLElement): string | undefined => {
  const explicitRole = element.getAttribute("role")?.trim();
  if (explicitRole) {
    return explicitRole;
  }

  if (element instanceof HTMLButtonElement) {
    return "button";
  }

  if (element instanceof HTMLAnchorElement) {
    return "link";
  }

  if (element instanceof HTMLTextAreaElement) {
    return "textbox";
  }

  if (element instanceof HTMLInputElement) {
    if (
      element.type === "text"
      || element.type === "search"
      || element.type === "email"
      || element.type === "url"
      || element.type === "number"
      || element.type === "password"
    ) {
      return "textbox";
    }

    if (element.type === "checkbox") {
      return "checkbox";
    }
  }

  if (element instanceof HTMLSelectElement) {
    return "combobox";
  }

  if (element.isContentEditable) {
    return "textbox";
  }

  return undefined;
};

const getVisibleText = (element: HTMLElement) => {
  const directText = element.innerText || element.textContent || "";

  if (element instanceof HTMLInputElement && ["button", "submit"].includes(element.type)) {
    return element.value;
  }

  return directText.trim();
};

const getElementDataTarget = (element: HTMLElement) =>
  element.dataset.visualTarget?.trim() || element.dataset.testid?.trim() || undefined;

export const isVisibleElement = (element: HTMLElement) => {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();

  return style.visibility !== "hidden"
    && style.display !== "none"
    && rect.width > 0
    && rect.height > 0
    && rect.bottom > 0
    && rect.right > 0
    && rect.top < window.innerHeight
    && rect.left < window.innerWidth;
};

export const isEffectivelyDisabled = (element: HTMLElement) =>
  ("disabled" in element && Boolean((element as HTMLButtonElement | HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).disabled))
  || element.getAttribute("aria-disabled") === "true";

export const describeNavigatorElement = (element: HTMLElement) => {
  const role = inferRole(element);
  const dataTarget = getElementDataTarget(element);
  const label = [
    element.getAttribute("aria-label"),
    extractLabelledByText(element),
    extractAssociatedLabelText(element),
    element.getAttribute("placeholder"),
    element.getAttribute("title"),
    getVisibleText(element),
  ]
    .map((value) => value?.trim() || "")
    .filter(Boolean)[0] || element.tagName.toLowerCase();

  return {
    dataTarget,
    label,
    placeholder: element.getAttribute("placeholder")?.trim() || undefined,
    role,
    text: getVisibleText(element) || undefined,
  };
};

export const collectVisibleNavigatorTargets = (): NavigatorVisibleTarget[] => {
  const seen = new Set<string>();

  return Array.from(document.querySelectorAll<HTMLElement>(INTERACTIVE_SELECTOR))
    .filter((element) => !shouldIgnoreNavigatorElement(element) && isVisibleElement(element) && !isEffectivelyDisabled(element))
    .map((element) => describeNavigatorElement(element))
    .filter((descriptor) => descriptor.label.length > 0)
    .filter((descriptor) => {
      const key = `${descriptor.dataTarget || "none"}|${descriptor.role || "none"}|${descriptor.label}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, 32)
    .map((descriptor) => ({
      dataTarget: descriptor.dataTarget,
      label: descriptor.label,
      role: descriptor.role,
    }));
};

const getInteractiveCandidates = () =>
  Array.from(document.querySelectorAll<HTMLElement>(INTERACTIVE_SELECTOR))
    .filter((element) => !shouldIgnoreNavigatorElement(element) && isVisibleElement(element) && !isEffectivelyDisabled(element));

const scoreDescriptor = (
  descriptor: ReturnType<typeof describeNavigatorElement>,
  target: NavigatorActionTarget,
) => {
  let score = 0;
  const normalizedLabel = normalizeText(descriptor.label);
  const normalizedText = normalizeText(descriptor.text);
  const normalizedPlaceholder = normalizeText(descriptor.placeholder);
  const normalizedDataTarget = normalizeText(descriptor.dataTarget);

  if (target.dataTarget) {
    const expected = normalizeText(target.dataTarget);
    if (normalizedDataTarget === expected) {
      score += 120;
    }
  }

  if (target.role) {
    if (descriptor.role === target.role) {
      score += 20;
    } else {
      score -= 10;
    }
  }

  if (target.name) {
    const expected = normalizeText(target.name);
    if (normalizedLabel === expected) {
      score += 80;
    } else if (normalizedLabel.includes(expected) || expected.includes(normalizedLabel)) {
      score += 42;
    } else if (normalizedText === expected) {
      score += 36;
    }
  }

  if (target.text) {
    const expected = normalizeText(target.text);
    if (normalizedText === expected) {
      score += 66;
    } else if (normalizedText.includes(expected) || normalizedLabel.includes(expected)) {
      score += 30;
    }
  }

  if (target.placeholder) {
    const expected = normalizeText(target.placeholder);
    if (normalizedPlaceholder === expected) {
      score += 45;
    } else if (normalizedPlaceholder.includes(expected)) {
      score += 20;
    }
  }

  return score;
};

const findInteractiveAncestor = (element: Element | null): HTMLElement | null => {
  let current = element;

  while (current instanceof HTMLElement) {
    if (
      current.matches(INTERACTIVE_SELECTOR)
      && !shouldIgnoreNavigatorElement(current)
      && isVisibleElement(current)
      && !isEffectivelyDisabled(current)
    ) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
};

export const resolveNavigatorActionTarget = (target: NavigatorActionTarget): NavigatorResolveResult => {
  const candidates = getInteractiveCandidates()
    .map((element) => {
      const descriptor = describeNavigatorElement(element);
      return {
        descriptor,
        element,
        score: scoreDescriptor(descriptor, target),
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score);

  if (candidates.length === 0) {
    return { outcome: "not_found" };
  }

  const [best, second] = candidates;
  if (second && best.score - second.score <= 5) {
    return {
      description: `${best.descriptor.role || "element"} "${best.descriptor.label}"`,
      outcome: "ambiguous",
    };
  }

  return {
    description: `${best.descriptor.role || "element"} "${best.descriptor.label}"`,
    element: best.element,
    outcome: "resolved",
  };
};

export const resolveNavigatorCoordinatesTarget = (
  coordinates: { x: number; y: number },
): NavigatorResolveResult => {
  const candidate = findInteractiveAncestor(document.elementFromPoint(coordinates.x, coordinates.y));

  if (!candidate) {
    return { outcome: "not_found" };
  }

  const descriptor = describeNavigatorElement(candidate);

  return {
    description: `${descriptor.role || "element"} "${descriptor.label}"`,
    element: candidate,
    outcome: "resolved",
  };
};

export const describeFocusedNavigatorElement = () => {
  const activeElement = document.activeElement;

  if (!(activeElement instanceof HTMLElement) || activeElement === document.body) {
    return undefined;
  }

  const descriptor = describeNavigatorElement(activeElement);
  return `${descriptor.role || activeElement.tagName.toLowerCase()} "${descriptor.label}"`;
};

export const collectVisibleNavigatorLabels = () => {
  const labels = collectVisibleNavigatorTargets().map((target) => target.label);
  return Array.from(new Set(labels)).slice(0, 24);
};
