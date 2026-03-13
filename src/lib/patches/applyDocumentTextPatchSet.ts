import type { DocumentPatch, DocumentPatchSet, ReplaceTextPatchPayload } from "@/types/documentPatch";

export interface DocumentTextPatchApplicationFailure {
  patchId: string;
  message: string;
}

export interface DocumentTextPatchApplicationResult {
  appliedPatchIds: string[];
  failures: DocumentTextPatchApplicationFailure[];
  value: string;
  warnings: string[];
}

export class DocumentTextPatchApplicationError extends Error {
  patchId: string;

  constructor(patchId: string, message: string) {
    super(message);
    this.name = "DocumentTextPatchApplicationError";
    this.patchId = patchId;
  }
}

const assertReplaceTextPayload = (patch: DocumentPatch): ReplaceTextPatchPayload => {
  if (!patch.payload || patch.payload.kind !== "replace_text") {
    throw new DocumentTextPatchApplicationError(
      patch.patchId,
      `Patch "${patch.patchId}" requires a "replace_text" payload.`,
    );
  }

  return patch.payload;
};

const applyDocumentTextPatch = (value: string, patch: DocumentPatch) => {
  if (patch.target.targetType !== "document_text") {
    throw new DocumentTextPatchApplicationError(
      patch.patchId,
      `Patch "${patch.patchId}" must target "document_text".`,
    );
  }

  if (patch.operation !== "replace_text_range") {
    throw new DocumentTextPatchApplicationError(
      patch.patchId,
      `Patch "${patch.patchId}" uses unsupported operation "${patch.operation}" for document text.`,
    );
  }

  const { startOffset, endOffset } = patch.target;

  if (startOffset < 0 || endOffset < startOffset || endOffset > value.length) {
    throw new DocumentTextPatchApplicationError(
      patch.patchId,
      `Patch "${patch.patchId}" uses an invalid document text range.`,
    );
  }

  if (
    patch.precondition?.expectedText !== undefined
    && value.slice(startOffset, endOffset) !== patch.precondition.expectedText
  ) {
    throw new DocumentTextPatchApplicationError(
      patch.patchId,
      `Patch "${patch.patchId}" failed expectedText precondition.`,
    );
  }

  if (patch.precondition?.expectedNodeHash !== undefined) {
    throw new DocumentTextPatchApplicationError(
      patch.patchId,
      `Patch "${patch.patchId}" cannot validate expectedNodeHash for document text.`,
    );
  }

  const payload = assertReplaceTextPayload(patch);
  return `${value.slice(0, startOffset)}${payload.text}${value.slice(endOffset)}`;
};

export const applyDocumentTextPatchSet = (
  value: string,
  patchSet: DocumentPatchSet,
): DocumentTextPatchApplicationResult => {
  const applicablePatches = patchSet.patches.filter((patch) => patch.status === "accepted" || patch.status === "edited");
  const failures: DocumentTextPatchApplicationFailure[] = [];
  const warnings: string[] = [];
  const appliedPatchIds: string[] = [];
  let currentValue = value;

  for (const patch of applicablePatches) {
    try {
      currentValue = applyDocumentTextPatch(currentValue, patch);
      appliedPatchIds.push(patch.patchId);
    } catch (error) {
      failures.push({
        message: error instanceof Error ? error.message : "Unknown document text patch error.",
        patchId: patch.patchId,
      });
    }
  }

  return {
    appliedPatchIds,
    failures,
    value: currentValue,
    warnings,
  };
};
