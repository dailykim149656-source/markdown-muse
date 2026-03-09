import type {
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

const postJson = async <TResponse, TRequest>(path: string, body: TRequest): Promise<TResponse> => {
  const response = await fetch(`${getAiApiBaseUrl()}${path}`, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json() as Promise<TResponse>;
};

export const summarizeDocument = (request: SummarizeDocumentRequest) =>
  postJson<SummarizeDocumentResponse, SummarizeDocumentRequest>("/api/ai/summarize", request);

export const generateSection = (request: GenerateSectionRequest) =>
  postJson<GenerateSectionResponse, GenerateSectionRequest>("/api/ai/generate-section", request);
