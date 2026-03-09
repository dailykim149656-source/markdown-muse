import { GoogleGenAI, Type } from "@google/genai";

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const getApiKey = () => process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";

const getClient = () => {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error("Gemini API key is not configured. Set GEMINI_API_KEY or GOOGLE_API_KEY.");
  }

  return new GoogleGenAI({ apiKey });
};

const readResponseText = async (response: { text?: string | (() => Promise<string> | string) }) => {
  if (typeof response.text === "function") {
    return await response.text();
  }

  return response.text || "";
};

export const schemaType = Type;

export const getGeminiModel = () => DEFAULT_MODEL;

export const generateStructuredJson = async <TResponse>({
  prompt,
  responseSchema,
}: {
  prompt: string;
  responseSchema: object;
}): Promise<TResponse> => {
  const client = getClient();
  const response = await client.models.generateContent({
    contents: prompt,
    model: DEFAULT_MODEL,
    config: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });
  const responseText = await readResponseText(response);

  if (!responseText) {
    throw new Error("Gemini returned an empty response.");
  }

  return JSON.parse(responseText) as TResponse;
};
