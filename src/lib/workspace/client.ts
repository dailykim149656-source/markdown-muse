import type {
  GoogleConnectRequest,
  GoogleConnectResponse,
  WorkspaceApplyRequest,
  WorkspaceApplyResponse,
  WorkspaceAuthSession,
  WorkspaceChangesResponse,
  WorkspaceFileListResponse,
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

const getWorkspaceApiBaseUrl = () => {
  const configured = import.meta.env.VITE_AI_API_BASE_URL?.trim();

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

    if (!isLocalhost) {
      return window.location.origin.replace(/\/$/, "");
    }
  }

  return "http://localhost:8787";
};

const readErrorMessage = async (response: Response) => {
  try {
    const payload = await response.json();

    if (payload && typeof payload.error === "string" && payload.error.length > 0) {
      return payload.error;
    }
  } catch {
    // noop
  }

  return `Workspace request failed with status ${response.status}.`;
};

const requestJson = async <TResponse>(
  path: string,
  init?: RequestInit,
): Promise<TResponse> => {
  const baseUrl = getWorkspaceApiBaseUrl();
  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      credentials: "include",
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });
  } catch (error) {
    const detail = error instanceof Error && error.message ? ` (${error.message})` : "";
    throw new Error(`Unable to reach the workspace server at ${baseUrl}.${detail}`);
  }

  if (!response.ok) {
    throw new WorkspaceApiError(await readErrorMessage(response), response.status);
  }

  return response.json() as Promise<TResponse>;
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

export const importWorkspaceFile = (fileId: string) =>
  requestJson<WorkspaceImportResponse>("/api/workspace/import", {
    body: JSON.stringify({ fileId }),
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
