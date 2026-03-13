import type { DocumentPatchSet } from "@/types/documentPatch";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isPatchTarget = (value: unknown) => {
  if (!isRecord(value) || typeof value.targetType !== "string") {
    return false;
  }

  switch (value.targetType) {
    case "node":
      return typeof value.nodeId === "string";
    case "text_range":
      return typeof value.nodeId === "string"
        && typeof value.startOffset === "number"
        && typeof value.endOffset === "number";
    case "document_text":
      return typeof value.startOffset === "number"
        && typeof value.endOffset === "number";
    case "attribute":
      return typeof value.nodeId === "string" && typeof value.attributePath === "string";
    case "structured_path":
      return typeof value.path === "string";
    default:
      return false;
  }
};

const isDocumentPatch = (value: unknown) =>
  isRecord(value)
  && typeof value.patchId === "string"
  && typeof value.title === "string"
  && typeof value.operation === "string"
  && typeof value.author === "string"
  && typeof value.status === "string"
  && isPatchTarget(value.target);

export const isDocumentPatchSet = (value: unknown): value is DocumentPatchSet =>
  isRecord(value)
  && typeof value.patchSetId === "string"
  && typeof value.documentId === "string"
  && typeof value.title === "string"
  && typeof value.author === "string"
  && typeof value.status === "string"
  && typeof value.createdAt === "number"
  && Array.isArray(value.patches)
  && value.patches.every(isDocumentPatch);
