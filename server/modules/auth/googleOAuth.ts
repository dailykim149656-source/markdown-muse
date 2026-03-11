import { randomUUID } from "node:crypto";
import { HttpError } from "../http/http";
import type { GoogleWorkspaceTokens, WorkspaceUserProfile } from "../workspace/repository";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

const DEFAULT_GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  "https://www.googleapis.com/auth/documents",
];

interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

const readGoogleOAuthConfig = (): GoogleOAuthConfig => {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || "";
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim() || "";
  const scopes = (process.env.GOOGLE_WORKSPACE_SCOPES || DEFAULT_GOOGLE_SCOPES.join(" "))
    .split(/\s+/)
    .map((scope) => scope.trim())
    .filter((scope) => scope.length > 0);

  if (!clientId || !clientSecret || !redirectUri) {
    throw new HttpError(500, "Google OAuth is not configured on the server.");
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    scopes,
  };
};

const readGoogleError = async (response: Response) => {
  try {
    const payload = await response.json() as { error?: string; error_description?: string };
    if (payload.error_description) {
      return payload.error_description;
    }

    if (payload.error) {
      return payload.error;
    }
  } catch {
    // ignore parse failure
  }

  return `Google request failed with status ${response.status}.`;
};

export const createGoogleAuthState = () => randomUUID();

export const buildGoogleAuthUrl = (state: string) => {
  const config = readGoogleOAuthConfig();
  const url = new URL(GOOGLE_AUTH_URL);

  url.searchParams.set("access_type", "offline");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.scopes.join(" "));
  url.searchParams.set("state", state);

  return url.toString();
};

export const exchangeGoogleCodeForTokens = async (code: string): Promise<GoogleWorkspaceTokens> => {
  const config = readGoogleOAuthConfig();
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: config.redirectUri,
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new HttpError(502, await readGoogleError(response));
  }

  const payload = await response.json() as {
    access_token?: string;
    expires_in?: number;
    id_token?: string;
    refresh_token?: string;
    scope?: string;
    token_type?: string;
  };

  if (!payload.access_token) {
    throw new HttpError(502, "Google token exchange did not return an access token.");
  }

  return {
    accessToken: payload.access_token,
    expiryDate: payload.expires_in ? Date.now() + (payload.expires_in * 1000) : undefined,
    idToken: payload.id_token,
    refreshToken: payload.refresh_token,
    scope: payload.scope,
    tokenType: payload.token_type,
  };
};

export const refreshGoogleAccessToken = async (refreshToken: string): Promise<GoogleWorkspaceTokens> => {
  const config = readGoogleOAuthConfig();
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new HttpError(502, await readGoogleError(response));
  }

  const payload = await response.json() as {
    access_token?: string;
    expires_in?: number;
    id_token?: string;
    scope?: string;
    token_type?: string;
  };

  if (!payload.access_token) {
    throw new HttpError(502, "Google token refresh did not return an access token.");
  }

  return {
    accessToken: payload.access_token,
    expiryDate: payload.expires_in ? Date.now() + (payload.expires_in * 1000) : undefined,
    idToken: payload.id_token,
    refreshToken,
    scope: payload.scope,
    tokenType: payload.token_type,
  };
};

export const ensureGoogleAccessToken = async (tokens: GoogleWorkspaceTokens) => {
  const now = Date.now();
  const refreshLeewayMs = 60_000;

  if (tokens.accessToken && (!tokens.expiryDate || tokens.expiryDate > now + refreshLeewayMs)) {
    return {
      didRefresh: false,
      tokens,
    };
  }

  if (!tokens.refreshToken) {
    throw new HttpError(401, "Google Workspace access expired. Reconnect your account.");
  }

  const refreshedTokens = await refreshGoogleAccessToken(tokens.refreshToken);

  return {
    didRefresh: true,
    tokens: {
      ...tokens,
      ...refreshedTokens,
      refreshToken: tokens.refreshToken,
    },
  };
};

export const fetchGoogleUserProfile = async (accessToken: string): Promise<WorkspaceUserProfile> => {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    method: "GET",
  });

  if (!response.ok) {
    throw new HttpError(502, await readGoogleError(response));
  }

  const payload = await response.json() as {
    email?: string;
    name?: string;
    picture?: string;
    sub?: string;
  };

  return {
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
    sub: payload.sub,
  };
};

export const revokeGoogleToken = async (token: string) => {
  const body = new URLSearchParams({ token });

  await fetch(GOOGLE_REVOKE_URL, {
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  }).catch(() => undefined);
};
