import { describe, expect, it } from "vitest";
import {
  clearWorkspaceSessionCookie,
  createWorkspaceSessionCookie,
  getWorkspaceSessionId,
} from "../../server/modules/auth/sessionStore";

describe("sessionStore", () => {
  it("uses a __session cookie with SameSite=None on secure requests", () => {
    const cookie = createWorkspaceSessionCookie("session-1", {
      headers: {
        "x-forwarded-proto": "https",
      },
    } as never);

    expect(cookie).toContain("__session=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=None");
  });

  it("uses a local cookie with SameSite=Lax on non-secure requests", () => {
    const cookie = createWorkspaceSessionCookie("session-1", {
      headers: {
        "x-forwarded-proto": "http",
      },
    } as never);

    expect(cookie).toContain("docsy_workspace_session=");
    expect(cookie).toContain("SameSite=Lax");
  });

  it("reads both forwarded and legacy secure cookie names during migration", () => {
    expect(getWorkspaceSessionId({
      headers: {
        cookie: "__session=forwarded-session",
      },
    } as never)).toBe("forwarded-session");

    expect(getWorkspaceSessionId({
      headers: {
        cookie: "__Host-docsy-workspace-session=legacy-session",
      },
    } as never)).toBe("legacy-session");
  });

  it("clears forwarded, legacy secure, and local cookie variants", () => {
    const clearedCookies = clearWorkspaceSessionCookie({
      headers: {
        "x-forwarded-proto": "https",
      },
    } as never);

    expect(clearedCookies).toHaveLength(3);
    expect(clearedCookies[0]).toContain("__session=");
    expect(clearedCookies[0]).toContain("SameSite=None");
    expect(clearedCookies[1]).toContain("__Host-docsy-workspace-session=");
    expect(clearedCookies[1]).toContain("SameSite=None");
    expect(clearedCookies[2]).toContain("docsy_workspace_session=");
    expect(clearedCookies[2]).toContain("SameSite=Lax");
  });
});
