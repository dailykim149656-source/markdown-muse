export const DOCSY_DARK_MODE_COLOR_OVERRIDE_ATTR = "data-docsy-dark-color-override";

const BLACK_EQUIVALENT_DISPLAY_COLORS = new Set([
  "black",
  "#000",
  "#000000",
  "rgb(0,0,0)",
  "rgba(0,0,0,1)",
]);

export const normalizeDisplayColorValue = (value: string | null | undefined) =>
  (value || "")
    .trim()
    .toLowerCase()
    .replace(/\s*,\s*/g, ",")
    .replace(/\s+/g, " ");

export const isBlackEquivalentDisplayColor = (value: string | null | undefined) =>
  BLACK_EQUIVALENT_DISPLAY_COLORS.has(normalizeDisplayColorValue(value));

const getExplicitElementTextColors = (element: HTMLElement) => {
  const colors: string[] = [];

  if (element.style.color) {
    colors.push(element.style.color);
  }

  const colorAttribute = element.getAttribute("color");

  if (colorAttribute) {
    colors.push(colorAttribute);
  }

  return colors;
};

export const shouldApplyDarkModeDisplayColorOverride = (element: HTMLElement) => {
  const explicitColors = getExplicitElementTextColors(element);

  if (explicitColors.length === 0) {
    return false;
  }

  if (explicitColors.some(isBlackEquivalentDisplayColor)) {
    return true;
  }

  return isBlackEquivalentDisplayColor(window.getComputedStyle(element).color);
};

export const clearDarkModeDisplayColorOverrides = (root: HTMLElement) => {
  if (root.hasAttribute(DOCSY_DARK_MODE_COLOR_OVERRIDE_ATTR)) {
    root.removeAttribute(DOCSY_DARK_MODE_COLOR_OVERRIDE_ATTR);
  }

  root.querySelectorAll(`[${DOCSY_DARK_MODE_COLOR_OVERRIDE_ATTR}]`).forEach((node) => {
    node.removeAttribute(DOCSY_DARK_MODE_COLOR_OVERRIDE_ATTR);
  });
};

export const applyDarkModeDisplayColorOverrides = (root: HTMLElement) => {
  clearDarkModeDisplayColorOverrides(root);

  const elements = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];

  for (const element of elements) {
    if (!shouldApplyDarkModeDisplayColorOverride(element)) {
      continue;
    }

    element.setAttribute(DOCSY_DARK_MODE_COLOR_OVERRIDE_ATTR, "true");
  }
};
