import { postJson } from "@/lib/ai/httpClient";
import type {
  NavigatorGoalSuggestionRequest,
  NavigatorGoalSuggestionResponse,
  NavigatorTurnRequest,
  NavigatorTurnResponse,
} from "@/types/visualNavigator";

export const suggestVisualNavigatorGoals = (
  request: NavigatorGoalSuggestionRequest,
  options?: { signal?: AbortSignal },
) =>
  postJson<NavigatorGoalSuggestionResponse, NavigatorGoalSuggestionRequest>("/api/ai/navigator/suggest-goals", request, options);

export const navigateVisualUi = (
  request: NavigatorTurnRequest,
  options?: { signal?: AbortSignal },
) =>
  postJson<NavigatorTurnResponse, NavigatorTurnRequest>("/api/ai/navigator/turn", request, options);
