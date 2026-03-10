import type {
  GenerateTocRequest,
  GenerateTocResponse,
  GenerateSectionRequest,
  GenerateSectionResponse,
  SummarizeDocumentRequest,
  SummarizeDocumentResponse,
} from "@/types/aiAssistant";

const getAiApiBaseUrl = () => {
  const configured = import.meta.env.VITE_AI_API_BASE_URL?.trim();
  return configured ? configured.replace(/\/$/, "") : "http://localhost:8787";
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
  return `Unable to reach the AI server at ${baseUrl}. Start \`npm run ai:server\` and verify the current app origin can access it.${detail}`;
};

const postJson = async <TResponse, TRequest>(path: string, body: TRequest): Promise<TResponse> => {
  const baseUrl = getAiApiBaseUrl();
  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  } catch (error) {
    throw new Error(readNetworkErrorMessage(baseUrl, error));
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json() as Promise<TResponse>;
};

export const summarizeDocument = (request: SummarizeDocumentRequest) =>
  postJson<SummarizeDocumentResponse, SummarizeDocumentRequest>("/api/ai/summarize", request);

export const generateSection = (request: GenerateSectionRequest) =>
  postJson<GenerateSectionResponse, GenerateSectionRequest>("/api/ai/generate-section", request);

export const generateToc = (request: GenerateTocRequest) =>
  postJson<GenerateTocResponse, GenerateTocRequest>("/api/ai/generate-toc", request);
