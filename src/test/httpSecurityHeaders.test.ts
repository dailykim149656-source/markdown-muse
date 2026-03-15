import { describe, expect, it } from "vitest";
import { json } from "../../server/modules/http/http";

describe("http security headers", () => {
  it("attaches baseline browser security headers to JSON responses", () => {
    const response = json({ ok: true }, 200, "https://app.docsy.dev");

    expect(response.headers?.["X-Content-Type-Options"]).toBe("nosniff");
    expect(response.headers?.["Referrer-Policy"]).toBe("no-referrer");
    expect(response.headers?.["X-Frame-Options"]).toBe("DENY");
    expect(response.headers?.["Permissions-Policy"]).toContain("camera=()");
  });
});
