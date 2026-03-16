import { GoogleGenAI, Type } from "@google/genai";

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const VERTEX_AI_FLAG = "true";

export interface GeminiInlineImage {
  dataBase64: string;
  mimeType: string;
}

interface StructuredJsonRequest {
  model?: string;
  prompt: string;
  responseSchema: object;
}

interface MultimodalStructuredJsonRequest extends StructuredJsonRequest {
  images?: GeminiInlineImage[];
}

const isVertexAiEnabled = () =>
  process.env.GOOGLE_GENAI_USE_VERTEXAI?.trim().toLowerCase() === VERTEX_AI_FLAG;

const getVertexProject = () => process.env.GOOGLE_CLOUD_PROJECT?.trim() || "";
const getVertexLocation = () =>
  process.env.GOOGLE_CLOUD_LOCATION?.trim()
  || process.env.VERTEX_AI_LOCATION?.trim()
  || "";

export const isGeminiConfigured = () =>
  isVertexAiEnabled() && getVertexProject().length > 0 && getVertexLocation().length > 0;

let cachedClient: GoogleGenAI | null = null;

const getClient = () => {
  if (!isGeminiConfigured()) {
    throw new Error(
      "Vertex AI is not configured. Set GOOGLE_GENAI_USE_VERTEXAI=true, GOOGLE_CLOUD_PROJECT, and GOOGLE_CLOUD_LOCATION.",
    );
  }

  if (!cachedClient) {
    cachedClient = new GoogleGenAI({
      location: getVertexLocation(),
      project: getVertexProject(),
      vertexai: true,
    });
  }

  return cachedClient;
};

const readResponseText = async (response: { text?: string | (() => Promise<string> | string) }) => {
  if (typeof response.text === "function") {
    return await response.text();
  }

  return response.text || "";
};

const parseStructuredJson = <TResponse>(responseText: string): TResponse => {
  if (!responseText) {
    throw new Error("Gemini returned an empty response.");
  }

  try {
    return JSON.parse(responseText) as TResponse;
  } catch (error) {
    throw new Error(
      `Gemini returned invalid JSON: ${error instanceof Error ? error.message : "Unknown parse error."}`,
    );
  }
};

const createJsonConfig = (responseSchema: object) => ({
  responseMimeType: "application/json",
  responseSchema,
});

const resolveModel = (model?: string) => model?.trim() || DEFAULT_MODEL;
const resolveFallbackModel = (primaryModel: string) => {
  const configuredFallback = process.env.GEMINI_FALLBACK_MODEL?.trim();

  if (!configuredFallback || configuredFallback === primaryModel) {
    return null;
  }

  return configuredFallback;
};

export const getGeminiErrorStatusCode = (error: unknown) => {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  if ("status" in error) {
    return Number((error as { status?: unknown }).status);
  }

  if ("code" in error) {
    const code = Number((error as { code?: unknown }).code);
    return Number.isNaN(code) ? undefined : code;
  }

  return undefined;
};

const getGeminiErrorMessage = (error: unknown) =>
  (error instanceof Error ? error.message : String(error)).toLowerCase();

export const isGeminiRateLimitError = (error: unknown) => {
  const statusCode = getGeminiErrorStatusCode(error);
  const normalizedMessage = getGeminiErrorMessage(error);

  return statusCode === 429
    || normalizedMessage.includes("resource_exhausted")
    || normalizedMessage.includes("quota")
    || normalizedMessage.includes("rate limit");
};

export const isGeminiModelConfigurationError = (error: unknown) => {
  const statusCode = getGeminiErrorStatusCode(error);
  const normalizedMessage = getGeminiErrorMessage(error);

  return statusCode === 404
    || normalizedMessage.includes("unexpected model name format")
    || normalizedMessage.includes("unsupported model")
    || normalizedMessage.includes("publisher model")
    || normalizedMessage.includes("model not found")
    || (normalizedMessage.includes("not found") && normalizedMessage.includes("model"))
    || (normalizedMessage.includes("invalid_argument") && normalizedMessage.includes("model"))
    || (statusCode === 400 && normalizedMessage.includes("model"));
};

const classifyFallbackReason = (error: unknown) => {
  if (isGeminiRateLimitError(error)) {
    return "quota_or_rate_limit";
  }

  if (isGeminiModelConfigurationError(error)) {
    return "model_unavailable";
  }

  return null;
};

const requestContentWithFallback = async ({
  config,
  contents,
  model,
}: {
  config: ReturnType<typeof createJsonConfig>;
  contents: string | ReturnType<typeof buildMultimodalContents>;
  model?: string;
}) => {
  const client = getClient();
  const primaryModel = resolveModel(model);
  const fallbackModel = resolveFallbackModel(primaryModel);

  console.info(`[Gemini] generateContent primary=${primaryModel}`);

  try {
    return await client.models.generateContent({
      config,
      contents,
      model: primaryModel,
    });
  } catch (error) {
    const fallbackReason = classifyFallbackReason(error);

    if (!fallbackModel || !fallbackReason) {
      throw error;
    }

    console.warn(`[Gemini] primary model failed (${fallbackReason}); retrying with fallback=${fallbackModel}`);

    try {
      const response = await client.models.generateContent({
        config,
        contents,
        model: fallbackModel,
      });
      console.info(`[Gemini] fallback model succeeded fallback=${fallbackModel}`);
      return response;
    } catch (fallbackError) {
      console.error(`[Gemini] fallback model failed fallback=${fallbackModel}`);
      throw fallbackError;
    }
  }
};

const buildMultimodalContents = (prompt: string, images: GeminiInlineImage[]) => [{
  parts: [
    { text: prompt },
    ...images.map((image) => ({
      inlineData: {
        data: image.dataBase64,
        mimeType: image.mimeType,
      },
    })),
  ],
  role: "user",
}];

export const schemaType = Type;

export const getGeminiModel = (model?: string) => resolveModel(model);
export const getGeminiFallbackModel = (model?: string) => resolveFallbackModel(resolveModel(model));

export const generateStructuredJson = async <TResponse>({
  model,
  prompt,
  responseSchema,
}: StructuredJsonRequest): Promise<TResponse> => {
  const response = await requestContentWithFallback({
    config: createJsonConfig(responseSchema),
    contents: prompt,
    model,
  });

  return parseStructuredJson<TResponse>(await readResponseText(response));
};

export const generateMultimodalStructuredJson = async <TResponse>({
  images = [],
  model,
  prompt,
  responseSchema,
}: MultimodalStructuredJsonRequest): Promise<TResponse> => {
  if (images.length === 0) {
    return generateStructuredJson<TResponse>({ model, prompt, responseSchema });
  }

  const response = await requestContentWithFallback({
    config: createJsonConfig(responseSchema),
    contents: buildMultimodalContents(prompt, images),
    model,
  });

  return parseStructuredJson<TResponse>(await readResponseText(response));
};
