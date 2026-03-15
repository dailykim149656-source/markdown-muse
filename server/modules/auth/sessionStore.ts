import type { IncomingMessage } from "node:http";
import { parseCookieHeader, serializeClearedCookie, serializeCookie } from "../http/cookies";
import { isSecureRequest } from "../http/http";
import { getWorkspaceRepository } from "../workspace/repository";

const LOCAL_WORKSPACE_SESSION_COOKIE = "docsy_workspace_session";
const SECURE_WORKSPACE_SESSION_COOKIE = "__Host-docsy-workspace-session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const SESSION_IDLE_TTL_MS = 1000 * 60 * 60 * 24;

const getWorkspaceSessionCookieName = (request: IncomingMessage) =>
  isSecureRequest(request) ? SECURE_WORKSPACE_SESSION_COOKIE : LOCAL_WORKSPACE_SESSION_COOKIE;

const getWorkspaceSessionCookieSameSite = (request: IncomingMessage) =>
  isSecureRequest(request) ? "None" : "Lax";

const getWorkspaceSessionCookieNames = () => [
  SECURE_WORKSPACE_SESSION_COOKIE,
  LOCAL_WORKSPACE_SESSION_COOKIE,
] as const;

export const getWorkspaceSessionId = (request: IncomingMessage) =>
  getWorkspaceSessionCookieNames()
    .map((cookieName) => parseCookieHeader(request.headers.cookie).get(cookieName))
    .find((value): value is string => Boolean(value))
  || null;

export const createWorkspaceSessionCookie = (sessionId: string, request: IncomingMessage) =>
  serializeCookie(getWorkspaceSessionCookieName(request), sessionId, {
    httpOnly: true,
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
    path: "/",
    sameSite: getWorkspaceSessionCookieSameSite(request),
    secure: isSecureRequest(request),
  });

export const clearWorkspaceSessionCookie = (request: IncomingMessage) =>
  [
    serializeClearedCookie(SECURE_WORKSPACE_SESSION_COOKIE, {
      path: "/",
      sameSite: getWorkspaceSessionCookieSameSite(request),
      secure: true,
    }),
    serializeClearedCookie(LOCAL_WORKSPACE_SESSION_COOKIE, {
      path: "/",
      sameSite: "Lax",
      secure: false,
    }),
  ];

export const createWorkspaceSession = async (connectionId: string) => {
  const repository = getWorkspaceRepository();
  return repository.createSession(connectionId, SESSION_TTL_MS, SESSION_IDLE_TTL_MS);
};

export const getWorkspaceSession = async (request: IncomingMessage) => {
  const sessionId = getWorkspaceSessionId(request);

  if (!sessionId) {
    return null;
  }

  const repository = getWorkspaceRepository();
  await repository.pruneExpired();
  const sessionState = await repository.getSession(sessionId);

  if (!sessionState) {
    return null;
  }

  return await repository.touchSession(sessionId, SESSION_TTL_MS, SESSION_IDLE_TTL_MS) || sessionState;
};

export const deleteWorkspaceSession = async (request: IncomingMessage) => {
  const sessionId = getWorkspaceSessionId(request);

  if (!sessionId) {
    return;
  }

  const repository = getWorkspaceRepository();
  await repository.deleteSession(sessionId);
};

export const deleteWorkspaceSessionById = async (sessionId: string) => {
  const repository = getWorkspaceRepository();
  await repository.deleteSession(sessionId);
};
