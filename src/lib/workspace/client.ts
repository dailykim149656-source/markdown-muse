import type {
  GoogleConnectRequest,
  GoogleConnectResponse,
  WorkspaceApplyRequest,
  WorkspaceApplyResponse,
  WorkspaceAuthSession,
  WorkspaceChangesResponse,
  WorkspaceExportRequest,
  WorkspaceExportResponse,
  WorkspaceFileListResponse,
  WorkspaceImportRequest,
  WorkspaceImportResponse,
} from "@/types/workspace";

export class WorkspaceApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "WorkspaceApiError";
    this.statusCode = statusCode;
  }
}

export interface WorkspaceApiHealthStatus {
  configured: boolean;
  model?: string;
  ok: boolean;
}

const isLikelyHtml = (text: string) => {
  const normalized = text.trimStart().toLowerCase();
  return normalized.startsWith("<!doctype") || normalized.startsWith("<html");
};

export const getWorkspaceApiBaseUrl = () => {
  const configured = import.meta.env.VITE_AI_API_BASE_URL?.trim();

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

    if (isLocalhost) {
      if (!configured) {
        return "/api";
      }

      try {
        const configuredUrl = new URL(configured);
        const isLoopbackTarget = configuredUrl.hostname === "localhost" || configuredUrl.hostname === "127.0.0.1";

        if (isLoopbackTarget) {
          return "/api";
        }
      } catch {
        // Keep the configured base URL when it is not a valid absolute URL.
      }
    }
  }

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

    if (isLocalhost) {
      return "/api";
    }
  }

  return "/api";
};

const normalizeWorkspacePath = (baseUrl: string, path: string) => {
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
      `Workspace API call to ${requestUrl} returned HTML instead of JSON.`,
      "This usually means the request hit the frontend route.",
      "Set VITE_AI_API_BASE_URL to the running AI server (typically http://localhost:8787).",
    ].join(" ");
  }

  const fallback = rawText.trim();
  return fallback.length > 0 ? fallback : `Workspace request failed with status ${response.status}.`;
};

const requestJson = async <TResponse>(
  path: string,
  init?: RequestInit,
): Promise<TResponse> => {
  const baseUrl = getWorkspaceApiBaseUrl();
  const requestUrl = normalizeWorkspacePath(baseUrl, path);
  let response: Response;

  try {
    response = await fetch(requestUrl, {
      credentials: "include",
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });
  } catch (error) {
    const detail = error instanceof Error && error.message ? ` (${error.message})` : "";
    throw new WorkspaceApiError(`Unable to reach the workspace server at ${requestUrl}.${detail}`, 0);
  }

  const contentType = response.headers.get("content-type") || "";

  if (!response.ok) {
    throw new WorkspaceApiError(await readErrorMessage(response, requestUrl), response.status);
  }

  if (!contentType.includes("application/json")) {
    const text = await response.text();
    if (isLikelyHtml(text)) {
      throw new WorkspaceApiError([
        `Unexpected HTML response from ${requestUrl}.`,
        "Expected JSON from workspace endpoint.",
        "Check VITE_AI_API_BASE_URL or local API proxy settings.",
      ].join(" "), response.status);
    }

    throw new WorkspaceApiError(
      `Workspace API call to ${requestUrl} returned content type "${contentType || "unknown"}".`,
      response.status,
    );
  }

  const text = await response.text();

  try {
    return JSON.parse(text) as TResponse;
  } catch {
    if (isLikelyHtml(text)) {
      throw new WorkspaceApiError([
        `Unexpected HTML body from ${requestUrl} while expecting JSON.`,
        "This usually means the request reached the frontend route.",
      ].join(" "), response.status);
    }

    throw new WorkspaceApiError(
      `Failed to parse JSON response from ${requestUrl}.`,
      response.status,
    );
  }
};

export const checkWorkspaceApiHealth = async () => {
  return requestJson<WorkspaceApiHealthStatus>("/api/ai/health", {
    method: "GET",
  });
};

export const getWorkspaceSession = () =>
  requestJson<WorkspaceAuthSession>("/api/auth/session", {
    method: "GET",
  });

export const connectGoogleWorkspace = (body: GoogleConnectRequest) =>
  requestJson<GoogleConnectResponse>("/api/auth/google/connect", {
    body: JSON.stringify(body),
    method: "POST",
  });

export const disconnectGoogleWorkspace = () =>
  requestJson<{ ok: true }>("/api/auth/google/disconnect", {
    body: JSON.stringify({}),
    method: "POST",
  });

export const listWorkspaceFiles = (params?: {
  cursor?: string | null;
  pageSize?: number;
  q?: string;
}) => {
  const searchParams = new URLSearchParams();

  if (params?.cursor) {
    searchParams.set("cursor", params.cursor);
  }

  if (params?.pageSize) {
    searchParams.set("pageSize", String(params.pageSize));
  }

  if (params?.q?.trim()) {
    searchParams.set("q", params.q.trim());
  }

  const suffix = searchParams.toString();

  return requestJson<WorkspaceFileListResponse>(`/api/workspace/files${suffix ? `?${suffix}` : ""}`, {
    method: "GET",
  });
};

export const importWorkspaceFile = (body: WorkspaceImportRequest) =>
  requestJson<WorkspaceImportResponse>("/api/workspace/import", {
    body: JSON.stringify(body),
    method: "POST",
  });

export const exportWorkspaceDocument = (body: WorkspaceExportRequest) =>
  requestJson<WorkspaceExportResponse>("/api/workspace/export", {
    body: JSON.stringify(body),
    method: "POST",
  });

export const applyWorkspaceDocument = (body: WorkspaceApplyRequest) =>
  requestJson<WorkspaceApplyResponse>("/api/patches/apply", {
    body: JSON.stringify(body),
    method: "POST",
  });

export const getWorkspaceChanges = () =>
  requestJson<WorkspaceChangesResponse>("/api/workspace/changes", {
    method: "GET",
  });

export const rescanWorkspaceChanges = () =>
  requestJson<WorkspaceChangesResponse>("/api/workspace/rescan", {
    body: JSON.stringify({}),
    method: "POST",
  });
