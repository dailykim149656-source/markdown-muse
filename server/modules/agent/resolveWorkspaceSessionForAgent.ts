import type { IncomingMessage } from "node:http";
import {
  getPresentWorkspaceSessionCookieNames,
  getWorkspaceSession,
} from "../auth/sessionStore";
import { sanitizeLogMessage } from "../http/aiDiagnostics";
import { resolveWorkspaceRepositoryBackend } from "../workspace/repository";

export interface AgentWorkspaceSessionResolution {
  presentCookieNames: readonly string[];
  sessionLookupFailed: boolean;
  workspaceConnected: boolean;
}

export const resolveWorkspaceSessionForAgent = async (
  request: IncomingMessage,
  requestId: string,
): Promise<AgentWorkspaceSessionResolution> => {
  const presentCookieNames = getPresentWorkspaceSessionCookieNames(request);

  try {
    const sessionState = await getWorkspaceSession(request);

    return {
      presentCookieNames,
      sessionLookupFailed: false,
      workspaceConnected: Boolean(sessionState?.session && sessionState.connection),
    };
  } catch (error) {
    const message = error instanceof Error ? sanitizeLogMessage(error.message) : "unknown_error";
    console.warn(
      `[LiveAgent] session lookup degraded requestId=${requestId} cookieNames=${presentCookieNames.join(",") || "none"} backend=${resolveWorkspaceRepositoryBackend()} revision=${process.env.K_REVISION?.trim() || "(unset)"} message=${message}`,
    );

    return {
      presentCookieNames,
      sessionLookupFailed: true,
      workspaceConnected: false,
    };
  }
};
