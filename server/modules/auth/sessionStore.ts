import type { IncomingMessage } from "node:http";
import { parseCookieHeader, serializeClearedCookie, serializeCookie } from "../http/cookies";
import { isSecureRequest } from "../http/http";
import { getWorkspaceRepository } from "../workspace/repository";

export const WORKSPACE_SESSION_COOKIE = "docsy_workspace_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export const getWorkspaceSessionId = (request: IncomingMessage) =>
  parseCookieHeader(request.headers.cookie).get(WORKSPACE_SESSION_COOKIE) || null;

export const createWorkspaceSessionCookie = (sessionId: string, request: IncomingMessage) =>
  serializeCookie(WORKSPACE_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
    path: "/",
    sameSite: "Lax",
    secure: isSecureRequest(request),
  });

export const clearWorkspaceSessionCookie = (request: IncomingMessage) =>
  serializeClearedCookie(WORKSPACE_SESSION_COOKIE, {
    path: "/",
    sameSite: "Lax",
    secure: isSecureRequest(request),
  });

export const createWorkspaceSession = async (connectionId: string) => {
  const repository = getWorkspaceRepository();
  return repository.createSession(connectionId, SESSION_TTL_MS);
};

export const getWorkspaceSession = async (request: IncomingMessage) => {
  const sessionId = getWorkspaceSessionId(request);

  if (!sessionId) {
    return null;
  }

  const repository = getWorkspaceRepository();
  await repository.pruneExpired();
  return repository.getSession(sessionId);
};

export const deleteWorkspaceSession = async (request: IncomingMessage) => {
  const sessionId = getWorkspaceSessionId(request);

  if (!sessionId) {
    return;
  }

  const repository = getWorkspaceRepository();
  await repository.deleteSession(sessionId);
};
