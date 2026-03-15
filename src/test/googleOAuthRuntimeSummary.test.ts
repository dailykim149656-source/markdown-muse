import { afterEach, describe, expect, it } from "vitest";
import { getGoogleOAuthRuntimeSummary } from "../../server/modules/auth/googleOAuth";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key];
    }
  }

  Object.assign(process.env, ORIGINAL_ENV);
});

describe("getGoogleOAuthRuntimeSummary", () => {
  it("includes frontend and redirect origins for internal diagnostics", () => {
    process.env.GOOGLE_OAUTH_REDIRECT_URI = "/";
    process.env.GOOGLE_OAUTH_PUBLISHING_STATUS = "testing";
    process.env.GOOGLE_WORKSPACE_SCOPE_PROFILE = "restricted";
    process.env.WORKSPACE_FRONTEND_ORIGIN = "https://app.docsy.dev";

    expect(getGoogleOAuthRuntimeSummary()).toEqual({
      frontendOrigin: "https://app.docsy.dev",
      publishingStatus: "testing",
      redirectOrigin: "https://app.docsy.dev",
      redirectUri: "https://app.docsy.dev/api/auth/google/callback",
      scopeProfile: "restricted",
      scopeRisk: "restricted",
    });
  });
});
