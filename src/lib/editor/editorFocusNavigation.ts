import { buildDerivedDocumentIndex } from "@/lib/ast/documentIndex";
import type { DocumentAst } from "@/types/documentAst";
import type { KnowledgeGraphNavigationTarget } from "@/lib/knowledge/workspaceInsights";

const normalizeText = (value: string | null | undefined) =>
  (value || "").replace(/\s+/g, " ").trim().toLowerCase();

const findSectionElement = (
  root: HTMLElement,
  target: KnowledgeGraphNavigationTarget,
  documentAst?: DocumentAst | null,
) => {
  if (documentAst) {
    const index = buildDerivedDocumentIndex(documentAst);
    const label = normalizeText(target.label);
    const headingEntry = index.headings.find((entry) => normalizeText(entry.text) === label)
      || index.headings.find((entry) => normalizeText(entry.text).includes(label));

    if (headingEntry) {
      const directMatch = root.querySelector<HTMLElement>(`[data-node-id="${headingEntry.nodeId}"]`);

      if (directMatch) {
        return directMatch;
      }
    }
  }

  const label = normalizeText(target.label);

  if (!label) {
    return null;
  }

  const headingCandidates = Array.from(root.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6"));
  const exactMatch = headingCandidates.find((element) => normalizeText(element.textContent) === label);

  if (exactMatch) {
    return exactMatch;
  }

  return headingCandidates.find((element) => normalizeText(element.textContent).includes(label)) || null;
};

const findImageElement = (
  root: HTMLElement,
  target: KnowledgeGraphNavigationTarget,
  documentAst?: DocumentAst | null,
) => {
  if (documentAst) {
    const index = buildDerivedDocumentIndex(documentAst);
    const label = normalizeText(target.label);
    const imageSrc = target.imageSrc || "";
    const imageEntry = index.images.find((entry) => entry.src === imageSrc || entry.src.endsWith(imageSrc))
      || index.images.find((entry) =>
        normalizeText(entry.alt) === label
        || normalizeText(entry.title) === label);

    if (imageEntry) {
      const directMatch = root.querySelector<HTMLElement>(`[data-node-id="${imageEntry.nodeId}"]`);

      if (directMatch) {
        return directMatch;
      }
    }
  }

  const label = normalizeText(target.label);
  const imageSrc = target.imageSrc || "";
  const imageCandidates = Array.from(root.querySelectorAll<HTMLImageElement>("img"));

  const sourceMatch = imageCandidates.find((element) => {
    const currentSrc = element.getAttribute("src") || element.src || "";
    return currentSrc === imageSrc || currentSrc.endsWith(imageSrc);
  });

  if (sourceMatch) {
    return sourceMatch.closest<HTMLElement>("[data-node-id]") || sourceMatch;
  }

  if (!label) {
    return null;
  }

  const labelMatch = imageCandidates.find((element) =>
    normalizeText(element.getAttribute("alt")) === label
    || normalizeText(element.getAttribute("title")) === label);

  return labelMatch?.closest<HTMLElement>("[data-node-id]") || labelMatch || null;
};

const flashFocusElement = (element: HTMLElement) => {
  const previousTransition = element.style.transition;
  const previousOutline = element.style.outline;
  const previousOutlineOffset = element.style.outlineOffset;
  const previousBackgroundColor = element.style.backgroundColor;

  element.style.transition = "outline-color 180ms ease, background-color 180ms ease";
  element.style.outline = "3px solid rgba(59, 130, 246, 0.45)";
  element.style.outlineOffset = "4px";
  element.style.backgroundColor = "rgba(59, 130, 246, 0.08)";

  window.setTimeout(() => {
    element.style.transition = previousTransition;
    element.style.outline = previousOutline;
    element.style.outlineOffset = previousOutlineOffset;
    element.style.backgroundColor = previousBackgroundColor;
  }, 1600);
};

export const scrollToEditorFocusTarget = (
  target: KnowledgeGraphNavigationTarget,
  documentAst?: DocumentAst | null,
) => {
  if (typeof document === "undefined") {
    return false;
  }

  const root = document.querySelector<HTMLElement>(".ProseMirror");

  if (!root) {
    return false;
  }

  if (target.kind !== "section" && target.kind !== "image") {
    return true;
  }

  const element = target.kind === "section"
    ? findSectionElement(root, target, documentAst)
    : findImageElement(root, target, documentAst);

  if (!element) {
    return false;
  }

  element.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "nearest",
  });
  flashFocusElement(element);
  return true;
};
