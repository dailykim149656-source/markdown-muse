import type {
  AutosaveDiffSummaryRequest,
  AutosaveDiffSummaryResponse,
} from "@/types/aiAssistant";
import { postJson } from "@/lib/ai/httpClient";

export const summarizeAutosaveDiff = (request: AutosaveDiffSummaryRequest) =>
  postJson<AutosaveDiffSummaryResponse, AutosaveDiffSummaryRequest>("/api/ai/autosave-diff-summary", request);
