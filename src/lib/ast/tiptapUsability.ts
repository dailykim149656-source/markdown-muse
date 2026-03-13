import type { JSONContent } from "@tiptap/core";

const hasMeaningfulContent = (node: JSONContent | null | undefined): boolean => {
  if (!node) {
    return false;
  }

  if (typeof node.text === "string" && node.text.trim().length > 0) {
    return true;
  }

  if (node.type === "hardBreak") {
    return true;
  }

  if (Array.isArray(node.content)) {
    return node.content.some((child) => hasMeaningfulContent(child));
  }

  return false;
};

export const isUsableTiptapDocument = (document: JSONContent | null | undefined) => {
  if (!document || typeof document !== "object") {
    return false;
  }

  if (document.type !== "doc") {
    return true;
  }

  return hasMeaningfulContent(document);
};
