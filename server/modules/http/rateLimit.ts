import type { IncomingMessage } from "node:http";

export interface RateLimitPolicy {
  bucket: string;
  limit: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitState = new Map<string, RateLimitEntry>();

const EXACT_POLICIES: Record<string, RateLimitPolicy> = {
  "GET /api/auth/session": { bucket: "auth-session", limit: 120, windowMs: 60_000 },
  "POST /api/auth/google/connect": { bucket: "auth-connect", limit: 8, windowMs: 600_000 },
  "POST /api/auth/google/disconnect": { bucket: "auth-disconnect", limit: 20, windowMs: 60_000 },
  "POST /api/ai/agent/turn": { bucket: "ai-agent-turn", limit: 10, windowMs: 60_000 },
  "POST /api/ai/autosave-diff-summary": { bucket: "ai-autosave-summary", limit: 20, windowMs: 60_000 },
  "POST /api/ai/generate-section": { bucket: "ai-generate-section", limit: 20, windowMs: 60_000 },
  "POST /api/ai/generate-toc": { bucket: "ai-generate-toc", limit: 20, windowMs: 60_000 },
  "POST /api/ai/propose-action": { bucket: "ai-propose-action", limit: 20, windowMs: 60_000 },
  "POST /api/ai/summarize": { bucket: "ai-summarize", limit: 20, windowMs: 60_000 },
  "POST /api/ai/tex/fix": { bucket: "ai-tex-fix", limit: 10, windowMs: 60_000 },
  "POST /api/security/csp-report": { bucket: "csp-report", limit: 60, windowMs: 60_000 },
  "GET /api/tex/health": { bucket: "tex-health", limit: 120, windowMs: 60_000 },
  "POST /api/tex/export-pdf": { bucket: "tex-export-pdf", limit: 10, windowMs: 60_000 },
  "POST /api/tex/preview": { bucket: "tex-preview", limit: 20, windowMs: 60_000 },
  "POST /api/tex/validate": { bucket: "tex-validate", limit: 20, windowMs: 60_000 },
};

const PREFIX_POLICIES: Array<{ policy: RateLimitPolicy; prefix: string; methods?: string[] }> = [
  { methods: ["GET"], policy: { bucket: "workspace-read", limit: 60, windowMs: 60_000 }, prefix: "/api/workspace/" },
  { methods: ["POST"], policy: { bucket: "workspace-write", limit: 20, windowMs: 60_000 }, prefix: "/api/workspace/" },
  { methods: ["POST"], policy: { bucket: "workspace-patches", limit: 20, windowMs: 60_000 }, prefix: "/api/patches/" },
];

export const getRequestClientId = (request: IncomingMessage) => {
  const forwardedFor = request.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.socket.remoteAddress || "unknown";
};

export const resolveRateLimitPolicy = ({
  method,
  pathname,
}: {
  method: string;
  pathname: string;
}) => {
  const normalizedMethod = method.toUpperCase();
  const exactPolicy = EXACT_POLICIES[`${normalizedMethod} ${pathname}`];

  if (exactPolicy) {
    return exactPolicy;
  }

  return PREFIX_POLICIES.find((candidate) =>
    pathname.startsWith(candidate.prefix)
    && (!candidate.methods || candidate.methods.includes(normalizedMethod))
  )?.policy || null;
};

export const consumeRateLimit = ({
  clientId,
  now = Date.now(),
  policy,
}: {
  clientId: string;
  now?: number;
  policy: RateLimitPolicy;
}) => {
  const key = `${policy.bucket}:${clientId}`;
  const existingEntry = rateLimitState.get(key);
  const currentEntry = !existingEntry || existingEntry.resetAt <= now
    ? {
        count: 0,
        resetAt: now + policy.windowMs,
      }
    : existingEntry;

  if (currentEntry.count >= policy.limit) {
    return {
      allowed: false,
      policy,
      retryAfterSeconds: Math.max(1, Math.ceil((currentEntry.resetAt - now) / 1000)),
    };
  }

  currentEntry.count += 1;
  rateLimitState.set(key, currentEntry);

  return {
    allowed: true,
    policy,
    remaining: Math.max(0, policy.limit - currentEntry.count),
    retryAfterSeconds: Math.max(1, Math.ceil((currentEntry.resetAt - now) / 1000)),
  };
};

export const resetRateLimitState = () => {
  rateLimitState.clear();
};
