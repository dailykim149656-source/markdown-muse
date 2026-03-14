import { describe, expect, it } from "vitest";
import {
  GOOGLE_WORKSPACE_SCOPE_PROFILES,
  readPublicDeploymentConfig,
  validatePublicDeploymentConfig,
} from "../../server/modules/config/publicDeploymentConfig.js";

describe("publicDeploymentConfig", () => {
  it("uses the restricted scope profile by default", () => {
    const config = readPublicDeploymentConfig({
      AI_ALLOWED_ORIGIN: "http://localhost:8080",
      GOOGLE_CLIENT_ID: "client-id",
      GOOGLE_OAUTH_REDIRECT_URI: "http://localhost:8787/api/auth/google/callback",
      WORKSPACE_FRONTEND_ORIGIN: "http://localhost:8080",
    });

    expect(config.scopeProfile).toBe("restricted");
    expect(config.requestedScopes).toEqual(GOOGLE_WORKSPACE_SCOPE_PROFILES.restricted);
  });

  it("switches to the reduced scope profile when requested", () => {
    const config = readPublicDeploymentConfig({
      AI_ALLOWED_ORIGIN: "https://app.docsy.dev",
      GOOGLE_CLIENT_ID: "client-id",
      GOOGLE_OAUTH_PUBLISHING_STATUS: "production",
      GOOGLE_OAUTH_REDIRECT_URI: "https://api.docsy.dev/api/auth/google/callback",
      GOOGLE_WORKSPACE_SCOPE_PROFILE: "reduced",
      WORKSPACE_FRONTEND_ORIGIN: "https://app.docsy.dev",
    });
    const validation = validatePublicDeploymentConfig(config);

    expect(config.requestedScopes).toEqual(GOOGLE_WORKSPACE_SCOPE_PROFILES.reduced);
    expect(validation.scopeRisk).toBe("sensitive");
    expect(validation.notes.some((note) => note.includes("drive.file-centered workflows"))).toBe(true);
  });

  it("rejects managed Google domains for external production", () => {
    const config = readPublicDeploymentConfig({
      AI_ALLOWED_ORIGIN: "https://urban-dds.web.app",
      GOOGLE_CLIENT_ID: "client-id",
      GOOGLE_OAUTH_PUBLISHING_STATUS: "production",
      GOOGLE_OAUTH_REDIRECT_URI: "https://docsy-mc32v24cyq-du.a.run.app/api/auth/google/callback",
      WORKSPACE_FRONTEND_ORIGIN: "https://urban-dds.web.app",
    });
    const validation = validatePublicDeploymentConfig(config);

    expect(validation.errors.some((error) => error.includes("web.app"))).toBe(true);
    expect(validation.errors.some((error) => error.includes("run.app"))).toBe(true);
  });

  it("allows managed preview domains in testing mode with warnings", () => {
    const config = readPublicDeploymentConfig({
      AI_ALLOWED_ORIGIN: "https://urban-dds.web.app",
      GOOGLE_CLIENT_ID: "client-id",
      GOOGLE_OAUTH_PUBLISHING_STATUS: "testing",
      GOOGLE_OAUTH_REDIRECT_URI: "https://docsy-mc32v24cyq-du.a.run.app/api/auth/google/callback",
      WORKSPACE_FRONTEND_ORIGIN: "https://urban-dds.web.app",
    });
    const validation = validatePublicDeploymentConfig(config);

    expect(validation.errors).toEqual([]);
    expect(validation.warnings.some((warning) => warning.includes("web.app"))).toBe(true);
    expect(validation.warnings.some((warning) => warning.includes("run.app"))).toBe(true);
  });

  it("rejects wildcard CORS for non-local deployments even in testing mode", () => {
    const config = readPublicDeploymentConfig({
      AI_ALLOWED_ORIGIN: "*",
      GOOGLE_CLIENT_ID: "client-id",
      GOOGLE_OAUTH_PUBLISHING_STATUS: "testing",
      GOOGLE_OAUTH_REDIRECT_URI: "https://api.docsy.dev/api/auth/google/callback",
      WORKSPACE_FRONTEND_ORIGIN: "https://app.docsy.dev",
    });
    const validation = validatePublicDeploymentConfig(config);

    expect(validation.errors).toContain('AI_ALLOWED_ORIGIN must not contain "*" outside local development.');
  });
});
