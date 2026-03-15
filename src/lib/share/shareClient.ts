import { retryLocalDevelopmentRequest } from "@/lib/network/localDevelopmentRetry";
import { getWorkspaceApiBaseUrl } from "@/lib/workspace/client";
import type {
  DocumentShareCreateRequest,
  DocumentShareCreateResponse,
  DocumentShareResolveResponse,
  ShareLinkErrorCode,
} from "@/types/share";

export class ShareApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "ShareApiError";
    this.statusCode = statusCode;
  }
}

const isLikelyHtml = (text: string) => {
  const normalized = text.trimStart().toLowerCase();
  return normalized.startsWith("<!doctype") || normalized.startsWith("<html");
};

const normalizeSharePath = (baseUrl: string, path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (baseUrl.startsWith("/")) {
    const relativePath = normalizedPath.startsWith("/api")
      ? normalizedPath.slice(4) || "/"
      : normalizedPath;

    return `${baseUrl.replace(/\/$/, "")}${relativePath}`;
  }

  return `${baseUrl.replace(/\/$/, "")}${normalizedPath}`;
};

const readErrorMessage = async (response: Response, requestUrl: string) => {
  const rawText = await response.text();

  try {
    const payload = JSON.parse(rawText);

    if (payload && typeof payload.error === "string" && payload.error.length > 0) {
      return payload.error;
    }
  } catch {
    // noop
  }

  if (isLikelyHtml(rawText)) {
    return [
      `Share API call to ${requestUrl} returned HTML instead of JSON.`,
      "This usually means the request hit the frontend route.",
      "Set VITE_AI_API_BASE_URL to the running API server.",
    ].join(" ");
  }

  const fallback = rawText.trim();
  return fallback.length > 0 ? fallback : `Share request failed with status ${response.status}.`;
};

const requestShareJson = async <TResponse>(
  path: string,
  init?: RequestInit,
): Promise<TResponse> => {
  const baseUrl = getWorkspaceApiBaseUrl();
  const requestUrl = normalizeSharePath(baseUrl, path);
  let response: Response;

  try {
    response = await retryLocalDevelopmentRequest(baseUrl, () => fetch(requestUrl, {
      credentials: "include",
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    }), init?.signal);
  } catch (error) {
    const detail = error instanceof Error && error.message ? ` (${error.message})` : "";
    throw new ShareApiError(`Unable to reach the share server at ${requestUrl}.${detail}`, 0);
  }

  const contentType = response.headers.get("content-type") || "";

  if (!response.ok) {
    throw new ShareApiError(await readErrorMessage(response, requestUrl), response.status);
  }

  if (!contentType.includes("application/json")) {
    const text = await response.text();

    if (isLikelyHtml(text)) {
      throw new ShareApiError([
        `Unexpected HTML response from ${requestUrl}.`,
        "Expected JSON from share endpoint.",
        "Check VITE_AI_API_BASE_URL or local API proxy settings.",
      ].join(" "), response.status);
    }

    throw new ShareApiError(
      `Share API call to ${requestUrl} returned content type "${contentType || "unknown"}".`,
      response.status,
    );
  }

  const text = await response.text();

  try {
    return JSON.parse(text) as TResponse;
  } catch {
    if (isLikelyHtml(text)) {
      throw new ShareApiError([
        `Unexpected HTML body from ${requestUrl} while expecting JSON.`,
        "This usually means the request reached the frontend route.",
      ].join(" "), response.status);
    }

    throw new ShareApiError(
      `Failed to parse JSON response from ${requestUrl}.`,
      response.status,
    );
  }
};

export const getShareCreateErrorCode = (error: unknown): ShareLinkErrorCode => {
  if (error instanceof ShareApiError) {
    if (error.statusCode === 0) {
      return "server_unavailable";
    }

    if (error.statusCode === 413) {
      return "payload_too_large";
    }
  }

  return "create_failed";
};

export const getShareResolveErrorCode = (error: unknown): ShareLinkErrorCode => {
  if (error instanceof ShareApiError) {
    if (error.statusCode === 0) {
      return "server_unavailable";
    }

    if (error.statusCode === 404) {
      return "not_found";
    }

    if (error.statusCode === 410) {
      return "expired";
    }
  }

  return "create_failed";
};

export const createDocumentShare = (body: DocumentShareCreateRequest) =>
  requestShareJson<DocumentShareCreateResponse>("/api/share", {
    body: JSON.stringify(body),
    method: "POST",
  });

export const resolveDocumentShare = (shareId: string) =>
  requestShareJson<DocumentShareResolveResponse>(`/api/share/${encodeURIComponent(shareId)}`, {
    method: "GET",
  });
