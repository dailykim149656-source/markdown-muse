import { GoogleGenAI, Type } from "@google/genai";

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

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

const getApiKey = () => process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";

let cachedClient: GoogleGenAI | null = null;

const getClient = () => {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error("Gemini API key is not configured. Set GEMINI_API_KEY or GOOGLE_API_KEY.");
  }

  if (!cachedClient) {
    cachedClient = new GoogleGenAI({ apiKey });
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
