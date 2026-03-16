import { postJson } from "@/lib/ai/httpClient";
import type { NavigatorTurnRequest, NavigatorTurnResponse } from "@/types/visualNavigator";

export const navigateVisualUi = (request: NavigatorTurnRequest) =>
  postJson<NavigatorTurnResponse, NavigatorTurnRequest>("/api/ai/navigator/turn", request);
