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

const resolveModel = (model?: string) => model || DEFAULT_MODEL;

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

export const generateStructuredJson = async <TResponse>({
  model,
  prompt,
  responseSchema,
}: StructuredJsonRequest): Promise<TResponse> => {
  const response = await getClient().models.generateContent({
    contents: prompt,
    model: resolveModel(model),
    config: createJsonConfig(responseSchema),
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

  const response = await getClient().models.generateContent({
    contents: buildMultimodalContents(prompt, images),
    model: resolveModel(model),
    config: createJsonConfig(responseSchema),
  });

  return parseStructuredJson<TResponse>(await readResponseText(response));
};
