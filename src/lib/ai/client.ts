import type {
  AutosaveDiffSummaryRequest,
  AutosaveDiffSummaryResponse,
  GenerateTocRequest,
  GenerateTocResponse,
  GenerateSectionRequest,
  GenerateSectionResponse,
  ProposeEditorActionRequest,
  ProposeEditorActionResponse,
  SummarizeDocumentRequest,
  SummarizeDocumentResponse,
} from "@/types/aiAssistant";
import type { AgentTurnRequest, AgentTurnResponse } from "@/types/liveAgent";
import type {
  TexExportPdfRequest,
  TexHealthResponse,
  TexPreviewRequest,
  TexPreviewResponse,
  TexValidateRequest,
  TexValidateResponse,
} from "@/types/tex";

interface RequestOptions {
  signal?: AbortSignal;
}

const isAbortError = (error: unknown) =>
  error instanceof Error && error.name === "AbortError";

const getAiApiBaseUrl = () => {
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

  return `AI request failed with status ${response.status}.`;
};

const readNetworkErrorMessage = (baseUrl: string, error: unknown) => {
  const detail = error instanceof Error && error.message ? ` (${error.message})` : "";
  return `Unable to reach the AI server at ${baseUrl}. Start \`npm run ai:server\` for local development, or set \`VITE_AI_API_BASE_URL\` to your Cloud Run service URL.${detail}`;
};

const normalizeAiPath = (baseUrl: string, path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (baseUrl.startsWith("/")) {
    const relativePath = normalizedPath.startsWith("/api")
      ? normalizedPath.slice(4) || "/"
      : normalizedPath;

    return `${baseUrl.replace(/\/$/, "")}${relativePath}`;
  }

  return `${baseUrl}${normalizedPath}`;
};

const postJson = async <TResponse, TRequest>(path: string, body: TRequest, options?: RequestOptions): Promise<TResponse> => {
  const baseUrl = getAiApiBaseUrl();
  const requestUrl = normalizeAiPath(baseUrl, path);
  let response: Response;

  try {
    response = await fetch(requestUrl, {
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: options?.signal,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    throw new Error(readNetworkErrorMessage(baseUrl, error));
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json() as Promise<TResponse>;
};

const getJson = async <TResponse>(path: string, options?: RequestOptions): Promise<TResponse> => {
  const baseUrl = getAiApiBaseUrl();
  const requestUrl = normalizeAiPath(baseUrl, path);
  let response: Response;

  try {
    response = await fetch(requestUrl, {
      method: "GET",
      signal: options?.signal,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    throw new Error(readNetworkErrorMessage(baseUrl, error));
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json() as Promise<TResponse>;
};

const postBinary = async <TRequest>(path: string, body: TRequest, options?: RequestOptions): Promise<Blob> => {
  const baseUrl = getAiApiBaseUrl();
  const requestUrl = normalizeAiPath(baseUrl, path);
  let response: Response;

  try {
    response = await fetch(requestUrl, {
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: options?.signal,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    throw new Error(readNetworkErrorMessage(baseUrl, error));
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.blob();
};

export const summarizeDocument = (request: SummarizeDocumentRequest) =>
  postJson<SummarizeDocumentResponse, SummarizeDocumentRequest>("/api/ai/summarize", request);

export const summarizeAutosaveDiff = (request: AutosaveDiffSummaryRequest) =>
  postJson<AutosaveDiffSummaryResponse, AutosaveDiffSummaryRequest>("/api/ai/autosave-diff-summary", request);

export const liveAgentTurn = (request: AgentTurnRequest) =>
  postJson<AgentTurnResponse, AgentTurnRequest>("/api/ai/agent/turn", request);

export const generateSection = (request: GenerateSectionRequest) =>
  postJson<GenerateSectionResponse, GenerateSectionRequest>("/api/ai/generate-section", request);

export const generateToc = (request: GenerateTocRequest) =>
  postJson<GenerateTocResponse, GenerateTocRequest>("/api/ai/generate-toc", request);

export const proposeEditorAction = (request: ProposeEditorActionRequest) =>
  postJson<ProposeEditorActionResponse, ProposeEditorActionRequest>("/api/ai/propose-action", request);

export const getTexHealth = (options?: RequestOptions) =>
  getJson<TexHealthResponse>("/api/tex/health", options);

export const validateTex = (request: TexValidateRequest, options?: RequestOptions) =>
  postJson<TexValidateResponse, TexValidateRequest>("/api/tex/validate", request, options);

export const previewTex = (request: TexPreviewRequest, options?: RequestOptions) =>
  postJson<TexPreviewResponse, TexPreviewRequest>("/api/tex/preview", request, options);

export const exportTexPdf = (request: TexExportPdfRequest, options?: RequestOptions) =>
  postBinary("/api/tex/export-pdf", request, options);
