import { afterEach, describe, expect, it } from "vitest";
import { buildGoogleAuthUrl } from "../../server/modules/auth/googleOAuth";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key];
    }
  }

  Object.assign(process.env, ORIGINAL_ENV);
});

describe("googleOAuth", () => {
  it("normalizes root redirect shorthands before building the auth URL", () => {
    process.env.GOOGLE_CLIENT_ID = "client-id";
    process.env.GOOGLE_CLIENT_SECRET = "client-secret";
    process.env.GOOGLE_OAUTH_REDIRECT_URI = "/";
    process.env.WORKSPACE_FRONTEND_ORIGIN = "https://app.docsy.dev";

    const authUrl = new URL(buildGoogleAuthUrl("state-token"));

    expect(authUrl.searchParams.get("redirect_uri")).toBe("https://app.docsy.dev/api/auth/google/callback");
  });
});
