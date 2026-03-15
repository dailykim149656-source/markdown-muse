import { beforeEach, describe, expect, it } from "vitest";
import {
  consumeRateLimit,
  resetRateLimitState,
  resolveRateLimitPolicy,
} from "../../server/modules/http/rateLimit";

describe("rateLimit", () => {
  beforeEach(() => {
    resetRateLimitState();
  });

  it("resolves independent policies for expensive and auth routes", () => {
    expect(resolveRateLimitPolicy({ method: "POST", pathname: "/api/ai/agent/turn" })?.bucket).toBe("ai-agent-turn");
    expect(resolveRateLimitPolicy({ method: "GET", pathname: "/api/auth/session" })?.bucket).toBe("auth-session");
    expect(resolveRateLimitPolicy({ method: "POST", pathname: "/api/workspace/export" })?.bucket).toBe("workspace-write");
  });

  it("limits requests per bucket and keeps buckets independent", () => {
    const agentPolicy = resolveRateLimitPolicy({ method: "POST", pathname: "/api/ai/agent/turn" });
    const authPolicy = resolveRateLimitPolicy({ method: "GET", pathname: "/api/auth/session" });

    if (!agentPolicy || !authPolicy) {
      throw new Error("Expected rate limit policies.");
    }

    for (let index = 0; index < agentPolicy.limit; index += 1) {
      expect(consumeRateLimit({
        clientId: "1.1.1.1",
        now: 1_000,
        policy: agentPolicy,
      }).allowed).toBe(true);
    }

    expect(consumeRateLimit({
      clientId: "1.1.1.1",
      now: 1_000,
      policy: agentPolicy,
    }).allowed).toBe(false);

    expect(consumeRateLimit({
      clientId: "1.1.1.1",
      now: 1_000,
      policy: authPolicy,
    }).allowed).toBe(true);
    expect(consumeRateLimit({
      clientId: "2.2.2.2",
      now: 1_000,
      policy: agentPolicy,
    }).allowed).toBe(true);
  });
});
