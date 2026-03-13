import type { AgentTurnRequest, AgentTurnResponse } from "@/types/liveAgent";
import { postJson } from "@/lib/ai/httpClient";

export const liveAgentTurn = (request: AgentTurnRequest) =>
  postJson<AgentTurnResponse, AgentTurnRequest>("/api/ai/agent/turn", request);
