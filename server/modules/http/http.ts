import type { IncomingMessage, ServerResponse } from "node:http";
import type { OutgoingHttpHeaders } from "node:http";

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

const getAllowedOrigins = () => {
  const configured = process.env.AI_ALLOWED_ORIGIN || "*";
  return configured
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
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
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
  };

  if (origin !== "*") {
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  return headers;
};

export const json = (
  responseBody: unknown,
  statusCode = 200,
  requestOrigin?: string,
  headers?: OutgoingHttpHeaders,
): HttpResponse => ({
  body: JSON.stringify(responseBody),
  headers: {
    ...buildCorsHeaders(requestOrigin),
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
    "Content-Type": contentType,
    ...(headers || {}),
  },
  statusCode,
});

export const writeHttpResponse = (response: ServerResponse, result: HttpResponse) => {
  response.writeHead(result.statusCode, result.headers || {});
  response.end(result.body || "");
};

export const parseRequestBody = async <TRequest>(request: IncomingMessage): Promise<TRequest> => {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");

  if (!rawBody) {
    throw new HttpError(400, "Request body is required.");
  }

  return JSON.parse(rawBody) as TRequest;
};

export const parseOptionalRequestBody = async <TRequest>(request: IncomingMessage): Promise<TRequest | null> => {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString("utf8").trim();

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
