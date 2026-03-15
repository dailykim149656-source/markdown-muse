import type { IncomingMessage, ServerResponse } from "node:http";
import type { OutgoingHttpHeaders } from "node:http";
import { parseConfiguredAllowedOrigins } from "../config/publicDeploymentConfig.js";

export interface HttpResponse {
  body?: Buffer | string | Uint8Array;
  headers?: OutgoingHttpHeaders;
  statusCode: number;
}

export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
}

interface RequestBodyOptions {
  maxBytes?: number;
}

const getAllowedOrigins = () => {
  const configured = process.env.AI_ALLOWED_ORIGIN || "http://localhost:8080";
  return parseConfiguredAllowedOrigins(configured);
};

export const ALLOWED_ORIGINS = getAllowedOrigins();

export const resolveCorsOrigin = (requestOrigin: string | undefined) => {
  if (ALLOWED_ORIGINS.includes("*")) {
    return requestOrigin || "*";
  }

  if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) {
    return requestOrigin;
  }

  return ALLOWED_ORIGINS[0] || "http://localhost:8080";
};

const buildCorsHeaders = (requestOrigin?: string) => {
  const origin = resolveCorsOrigin(requestOrigin);
  const headers: OutgoingHttpHeaders = {
    "Access-Control-Allow-Headers": "Content-Type, X-Docsy-Diagnostics-Token",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
  };

  if (origin !== "*") {
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  return headers;
};

const buildSecurityHeaders = (): OutgoingHttpHeaders => ({
  "Permissions-Policy": "accelerometer=(), autoplay=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
});

export const json = (
  responseBody: unknown,
  statusCode = 200,
  requestOrigin?: string,
  headers?: OutgoingHttpHeaders,
): HttpResponse => ({
  body: JSON.stringify(responseBody),
  headers: {
    ...buildCorsHeaders(requestOrigin),
    ...buildSecurityHeaders(),
    "Content-Type": "application/json; charset=utf-8",
    ...(headers || {}),
  },
  statusCode,
});

export const redirect = (
  location: string,
  statusCode = 302,
  requestOrigin?: string,
  headers?: OutgoingHttpHeaders,
): HttpResponse => ({
  body: "",
  headers: {
    ...buildCorsHeaders(requestOrigin),
    ...buildSecurityHeaders(),
    Location: location,
    ...(headers || {}),
  },
  statusCode,
});

export const binary = (
  responseBody: Buffer | Uint8Array,
  contentType: string,
  statusCode = 200,
  requestOrigin?: string,
  headers?: OutgoingHttpHeaders,
): HttpResponse => ({
  body: responseBody,
  headers: {
    ...buildCorsHeaders(requestOrigin),
    ...buildSecurityHeaders(),
    "Content-Type": contentType,
    ...(headers || {}),
  },
  statusCode,
});

export const empty = (
  statusCode = 204,
  requestOrigin?: string,
  headers?: OutgoingHttpHeaders,
): HttpResponse => ({
  body: "",
  headers: {
    ...buildCorsHeaders(requestOrigin),
    ...buildSecurityHeaders(),
    ...(headers || {}),
  },
  statusCode,
});

export const writeHttpResponse = (response: ServerResponse, result: HttpResponse) => {
  response.writeHead(result.statusCode, result.headers || {});
  response.end(result.body || "");
};

const resolveMaxRequestBytes = (options?: RequestBodyOptions) => {
  if (typeof options?.maxBytes === "number" && options.maxBytes > 0) {
    return Math.floor(options.maxBytes);
  }

  const configuredMaxBytes = Number(
    process.env.TEX_MAX_REQUEST_BYTES
    || process.env.AI_MAX_REQUEST_BYTES
    || 0,
  );

  return Number.isFinite(configuredMaxBytes) && configuredMaxBytes > 0
    ? Math.floor(configuredMaxBytes)
    : null;
};

const readRequestBody = async (request: IncomingMessage, options?: RequestBodyOptions) => {
  const chunks: Buffer[] = [];
  const maxBytes = resolveMaxRequestBytes(options);
  let totalBytes = 0;

  for await (const chunk of request) {
    const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += bufferChunk.byteLength;

    if (maxBytes !== null && totalBytes > maxBytes) {
      throw new HttpError(413, `Request body exceeds ${maxBytes} bytes.`);
    }

    chunks.push(bufferChunk);
  }

  return Buffer.concat(chunks).toString("utf8");
};

export const parseRequestBody = async <TRequest>(
  request: IncomingMessage,
  options?: RequestBodyOptions,
): Promise<TRequest> => {
  const rawBody = await readRequestBody(request, options);

  if (!rawBody) {
    throw new HttpError(400, "Request body is required.");
  }

  return JSON.parse(rawBody) as TRequest;
};

export const parseOptionalRequestBody = async <TRequest>(
  request: IncomingMessage,
  options?: RequestBodyOptions,
): Promise<TRequest | null> => {
  const rawBody = (await readRequestBody(request, options)).trim();

  if (!rawBody) {
    return null;
  }

  return JSON.parse(rawBody) as TRequest;
};

export const getRequestUrl = (request: IncomingMessage) => {
  const host = request.headers.host || "localhost";
  const protocol = (request.headers["x-forwarded-proto"] as string | undefined) || "http";
  return new URL(request.url || "/", `${protocol}://${host}`);
};

export const isSecureRequest = (request: IncomingMessage) => {
  const forwardedProto = request.headers["x-forwarded-proto"];

  if (typeof forwardedProto === "string") {
    return forwardedProto.split(",")[0]?.trim() === "https";
  }

  return false;
};
