import { afterEach, describe, expect, it } from "vitest";
import {
  assertTrustedPostOrigin,
  resolveFrontendOrigin,
} from "../../server/modules/auth/routes";

const ORIGINAL_ENV = {
  AI_ALLOWED_ORIGIN: process.env.AI_ALLOWED_ORIGIN,
  K_SERVICE: process.env.K_SERVICE,
  NODE_ENV: process.env.NODE_ENV,
  WORKSPACE_FRONTEND_ORIGIN: process.env.WORKSPACE_FRONTEND_ORIGIN,
};

afterEach(() => {
  process.env.AI_ALLOWED_ORIGIN = ORIGINAL_ENV.AI_ALLOWED_ORIGIN;
  process.env.K_SERVICE = ORIGINAL_ENV.K_SERVICE;
  process.env.NODE_ENV = ORIGINAL_ENV.NODE_ENV;
  process.env.WORKSPACE_FRONTEND_ORIGIN = ORIGINAL_ENV.WORKSPACE_FRONTEND_ORIGIN;
});

describe("auth route security", () => {
  it("requires an explicit frontend origin in production-style environments", () => {
    process.env.AI_ALLOWED_ORIGIN = "https://app.docsy.dev";
    process.env.K_SERVICE = "docsy";
    delete process.env.WORKSPACE_FRONTEND_ORIGIN;

    expect(() => resolveFrontendOrigin()).toThrow(/WORKSPACE_FRONTEND_ORIGIN/);
  });

  it("allows localhost fallback in local development", () => {
    process.env.AI_ALLOWED_ORIGIN = "http://localhost:8080";
    delete process.env.K_SERVICE;
    delete process.env.WORKSPACE_FRONTEND_ORIGIN;

    expect(resolveFrontendOrigin("http://localhost:8080")).toBe("http://localhost:8080");
  });

  it("rejects mismatched POST origins", () => {
    process.env.WORKSPACE_FRONTEND_ORIGIN = "https://app.docsy.dev";

    expect(() => assertTrustedPostOrigin({
      headers: {
        origin: "https://evil.example",
      },
      method: "POST",
    } as never)).toThrow(/Origin is not allowed/);
  });
});
