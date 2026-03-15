import { describe, expect, it } from "vitest";
import {
  clearWorkspaceSessionCookie,
  createWorkspaceSessionCookie,
} from "../../server/modules/auth/sessionStore";

describe("sessionStore", () => {
  it("uses a __Host- cookie on secure requests", () => {
    const cookie = createWorkspaceSessionCookie("session-1", {
      headers: {
        "x-forwarded-proto": "https",
      },
    } as never);

    expect(cookie).toContain("__Host-docsy-workspace-session=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Lax");
  });

  it("clears both secure and local cookie variants", () => {
    const clearedCookies = clearWorkspaceSessionCookie({
      headers: {
        "x-forwarded-proto": "https",
      },
    } as never);

    expect(clearedCookies).toHaveLength(2);
    expect(clearedCookies[0]).toContain("__Host-docsy-workspace-session=");
    expect(clearedCookies[1]).toContain("docsy_workspace_session=");
  });
});
