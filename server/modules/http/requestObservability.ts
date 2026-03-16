import type { IncomingMessage } from "node:http";
import { getObservedRequestBytes, getRequestContentLength } from "./http";

type JsonValue = boolean | number | string | null | undefined;

interface RequestLogOptions {
  extra?: Record<string, JsonValue>;
  request: IncomingMessage;
  requestId: string;
  route: string;
  service: "ai" | "tex";
  statusCode?: number;
  startedAt?: number;
}

const sanitizeExtra = (extra: Record<string, JsonValue> | undefined) =>
  Object.fromEntries(
    Object.entries(extra || {}).filter(([, value]) => value !== undefined),
  );

const getMemorySnapshot = () => {
  const usage = process.memoryUsage();

  return {
    arrayBuffers: usage.arrayBuffers,
    external: usage.external,
    heapUsed: usage.heapUsed,
    rss: usage.rss,
  };
};

const buildRequestPayload = ({
  extra,
  request,
  requestId,
  route,
  service,
  statusCode,
  startedAt,
}: RequestLogOptions) => ({
  event: startedAt ? "request_complete" : "request_start",
  method: request.method || "GET",
  requestBytes: getObservedRequestBytes(request) ?? getRequestContentLength(request),
  requestId,
  route,
  service,
  statusCode,
  durationMs: startedAt ? Date.now() - startedAt : 0,
  ...getMemorySnapshot(),
  ...sanitizeExtra(extra),
});

export const logRequestStart = (options: RequestLogOptions) => {
  console.info(JSON.stringify(buildRequestPayload(options)));
};

export const logRequestCompletion = (options: RequestLogOptions) => {
  console.info(JSON.stringify(buildRequestPayload(options)));
};

export const getApproximateBase64ByteLength = (value: string | undefined | null) => {
  if (!value?.trim()) {
    return 0;
  }

  const normalized = value.trim();
  const padding = normalized.endsWith("==")
    ? 2
    : normalized.endsWith("=")
      ? 1
      : 0;

  return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding);
};
