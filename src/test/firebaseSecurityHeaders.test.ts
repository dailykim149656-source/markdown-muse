import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("firebase security headers", () => {
  it("configures report-only CSP and baseline browser security headers", () => {
    const firebaseConfig = JSON.parse(
      readFileSync(path.resolve(process.cwd(), "firebase.json"), "utf8"),
    ) as {
      hosting?: {
        headers?: Array<{
          headers?: Array<{ key: string; value: string }>;
        }>;
      };
    };
    const headerMap = new Map(
      (firebaseConfig.hosting?.headers?.[0]?.headers || []).map((header) => [header.key, header.value]),
    );

    expect(headerMap.get("Content-Security-Policy-Report-Only")).toContain("report-uri /api/security/csp-report");
    expect(headerMap.get("Strict-Transport-Security")).toContain("max-age=31536000");
    expect(headerMap.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headerMap.get("Referrer-Policy")).toBe("no-referrer");
    expect(headerMap.get("X-Frame-Options")).toBe("DENY");
  });
});
