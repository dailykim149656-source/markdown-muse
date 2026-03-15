import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";
import {
  buildGoogleAuthUrl,
  createGoogleAuthState,
  exchangeGoogleCodeForTokens,
  fetchGoogleUserProfile,
  revokeGoogleToken,
} from "./googleOAuth";
import {
  clearWorkspaceSessionCookie,
  createWorkspaceSession,
  createWorkspaceSessionCookie,
  deleteWorkspaceSession,
  deleteWorkspaceSessionById,
  getWorkspaceSession,
  getWorkspaceSessionId,
} from "./sessionStore";
import {
  HttpError,
  getRequestUrl,
  json,
  ALLOWED_ORIGINS,
  parseOptionalRequestBody,
  redirect,
  type HttpResponse,
} from "../http/http";
import { getWorkspaceRepository } from "../workspace/repository";

interface ConnectRequestBody {
  returnTo?: string;
}

const AUTH_STATE_TTL_MS = 1000 * 60 * 10;
const WORKSPACE_FRONTEND_DEFAULT_ORIGIN = "http://localhost:8080";

const normalizeReturnTo = (value?: string | null) => {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/editor";
  }

  return value;
};

const isLocalAbsoluteOrigin = (value: string) => {
  try {
    const url = new URL(value);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
};

const requiresExplicitFrontendOrigin = () =>
  Boolean(
    process.env.K_SERVICE
    || process.env.NODE_ENV === "production"
    || ALLOWED_ORIGINS.some((origin) => origin !== "*" && !isLocalAbsoluteOrigin(origin)),
  );

export const resolveFrontendOrigin = (requestOrigin?: string) => {
  const configured = process.env.WORKSPACE_FRONTEND_ORIGIN?.trim();

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (requiresExplicitFrontendOrigin()) {
    throw new HttpError(500, "WORKSPACE_FRONTEND_ORIGIN must be configured for this deployment.");
  }

  if (requestOrigin && requestOrigin !== "*" && isLocalAbsoluteOrigin(requestOrigin)) {
    return requestOrigin.replace(/\/$/, "");
  }

  const configuredOrigin = ALLOWED_ORIGINS.find((origin) => origin !== "*" && origin.startsWith("http"));

  if (configuredOrigin) {
    return configuredOrigin.replace(/\/$/, "");
  }

  return WORKSPACE_FRONTEND_DEFAULT_ORIGIN;
};

const buildRedirectLocation = (
  returnTo: string,
  params: Record<string, string>,
  requestOrigin?: string,
) => {
  const frontendOrigin = resolveFrontendOrigin(requestOrigin);
  const url = new URL(returnTo, frontendOrigin);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
};

export const assertTrustedPostOrigin = (request: IncomingMessage) => {
  if (request.method !== "POST") {
    return;
  }

  const expectedOrigin = resolveFrontendOrigin();
  const requestOrigin = typeof request.headers.origin === "string"
    ? request.headers.origin.trim().replace(/\/$/, "")
    : "";

  if (!requestOrigin) {
    if (requiresExplicitFrontendOrigin()) {
      throw new HttpError(403, "Origin header is required.");
    }

    return;
  }

  if (requestOrigin !== expectedOrigin) {
    throw new HttpError(403, "Origin is not allowed.");
  }
};

const normalizeAuthErrorCode = (error: unknown) => {
  if (error instanceof HttpError) {
    if (error.statusCode === 401) {
      return "workspace_auth_expired";
    }

    if (error.statusCode === 403) {
      return "workspace_auth_forbidden";
    }

    if (error.statusCode >= 500) {
      return "workspace_provider_error";
    }
  }

  return "oauth_callback_failed";
};

const createConnectionId = (userSub?: string) => userSub ? `google:${userSub}` : randomUUID();

export const handleAuthRoute = async (request: IncomingMessage): Promise<HttpResponse | null> => {
  const requestUrl = getRequestUrl(request);
  const requestOrigin = request.headers.origin;
  const repository = getWorkspaceRepository();

  await repository.pruneExpired();

  if (request.method === "POST" && requestUrl.pathname === "/api/auth/google/connect") {
    assertTrustedPostOrigin(request);
    const body = await parseOptionalRequestBody<ConnectRequestBody>(request);
    const state = createGoogleAuthState();
    const returnTo = normalizeReturnTo(body?.returnTo);

    await repository.saveAuthState({
      createdAt: Date.now(),
      expiresAt: Date.now() + AUTH_STATE_TTL_MS,
      returnTo,
      state,
    });

    return json({
      authUrl: buildGoogleAuthUrl(state),
      provider: "google_drive",
    }, 200, requestOrigin);
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/auth/google/callback") {
    const code = requestUrl.searchParams.get("code");
    const stateId = requestUrl.searchParams.get("state");
    const authError = requestUrl.searchParams.get("error");
    const defaultReturnTo = normalizeReturnTo(requestUrl.searchParams.get("returnTo"));

    if (authError) {
      return redirect(
        buildRedirectLocation(defaultReturnTo, { workspaceAuthError: authError }, resolveFrontendOrigin(requestOrigin)),
        302,
        requestOrigin,
      );
    }

    if (!code || !stateId) {
      return redirect(
        buildRedirectLocation(defaultReturnTo, { workspaceAuthError: "missing_oauth_callback_parameters" }, resolveFrontendOrigin(requestOrigin)),
        302,
        requestOrigin,
      );
    }

    const authState = await repository.consumeAuthState(stateId);

    if (!authState || authState.expiresAt <= Date.now()) {
      return redirect(
        buildRedirectLocation(defaultReturnTo, { workspaceAuthError: "oauth_state_expired" }, resolveFrontendOrigin(requestOrigin)),
        302,
        requestOrigin,
      );
    }

    try {
      const tokens = await exchangeGoogleCodeForTokens(code);
      const user = await fetchGoogleUserProfile(tokens.accessToken);
      const connectionId = createConnectionId(user.sub);
      const existingSessionId = getWorkspaceSessionId(request);

      await repository.upsertConnection({
        connectedAt: Date.now(),
        connectionId,
        provider: "google_drive",
        tokens,
        updatedAt: Date.now(),
        user,
      });

      if (existingSessionId) {
        await deleteWorkspaceSessionById(existingSessionId);
      }

      const session = await createWorkspaceSession(connectionId);

      return redirect(
        buildRedirectLocation(authState.returnTo, { workspaceAuth: "connected" }, resolveFrontendOrigin(requestOrigin)),
        302,
        requestOrigin,
        {
          "Set-Cookie": createWorkspaceSessionCookie(session.sessionId, request),
        },
      );
    } catch (error) {
      return redirect(
        buildRedirectLocation(
          authState.returnTo,
          { workspaceAuthError: normalizeAuthErrorCode(error) },
          resolveFrontendOrigin(requestOrigin),
        ),
        302,
        requestOrigin,
      );
    }
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/auth/session") {
    const sessionState = await getWorkspaceSession(request);

    if (!sessionState?.session || !sessionState.connection) {
      return json({
        connected: false,
        provider: null,
        user: null,
      }, 200, requestOrigin);
    }

    return json({
      connected: true,
      provider: sessionState.connection.provider,
      user: sessionState.connection.user,
    }, 200, requestOrigin);
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/auth/google/disconnect") {
    assertTrustedPostOrigin(request);
    const sessionState = await getWorkspaceSession(request);

    if (sessionState?.connection?.tokens.refreshToken) {
      await revokeGoogleToken(sessionState.connection.tokens.refreshToken);
    } else if (sessionState?.connection?.tokens.accessToken) {
      await revokeGoogleToken(sessionState.connection.tokens.accessToken);
    }

    await deleteWorkspaceSession(request);

    return json({
      ok: true,
    }, 200, requestOrigin, {
      "Set-Cookie": clearWorkspaceSessionCookie(request),
    });
  }

  return null;
};

export const assertWorkspaceSession = async (request: IncomingMessage) => {
  const sessionState = await getWorkspaceSession(request);

  if (!sessionState?.session || !sessionState.connection) {
    throw new HttpError(401, "Google Workspace session is not connected.");
  }

  return {
    connection: sessionState.connection,
    session: sessionState.session,
    sessionId: getWorkspaceSessionId(request),
  };
};
