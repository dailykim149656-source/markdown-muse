import type {
  ProposeEditorActionRequest,
  ProposeEditorActionResponse,
} from "../../../src/types/aiAssistant";
import { schemaType } from "../gemini/client";

interface RawActionResponse {
  action?: string;
  confidence?: number;
  payload?: {
    targetDocumentId?: string;
    title?: string;
  };
  reason?: string;
}

export const actionResponseSchema = {
  properties: {
    action: { type: schemaType.STRING },
    confidence: { type: schemaType.NUMBER },
    payload: {
      properties: {
        targetDocumentId: { type: schemaType.STRING },
        title: { type: schemaType.STRING },
      },
      required: ["title"],
      type: schemaType.OBJECT,
    },
    reason: { type: schemaType.STRING },
  },
  required: ["action", "confidence", "reason", "payload"],
  type: schemaType.OBJECT,
};

const normalizeAction = (value: string | undefined): ProposeEditorActionResponse["action"] =>
  value === "open_patch_review" ? "open_patch_review" : "none";

const normalizeConfidence = (value: number | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  if (value <= 0) {
    return 0;
  }

  if (value >= 1) {
    return 1;
  }

  return value;
};

export const normalizeActionResponse = (
  response: RawActionResponse,
  request: ProposeEditorActionRequest,
): ProposeEditorActionResponse => {
  const action = normalizeAction(response.action);
  const payloadTitle = response.payload?.title?.trim() || (action === "open_patch_review"
    ? "Review suggested patch"
    : "No action recommended");
  const reason = response.reason?.trim() || (action === "open_patch_review"
    ? "A reviewable patch is ready."
    : "No immediate review action is needed.");

  return {
    action,
    confidence: normalizeConfidence(response.confidence),
    payload: {
      targetDocumentId: action === "open_patch_review"
        ? request.targetDocumentId || response.payload?.targetDocumentId?.trim() || undefined
        : undefined,
      title: payloadTitle,
    },
    reason,
  };
};
