import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { generateContentMock } = vi.hoisted(() => ({
  generateContentMock: vi.fn(),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: class GoogleGenAI {
    models = {
      generateContent: generateContentMock,
    };
  },
  Type: {
    ARRAY: "ARRAY",
    INTEGER: "INTEGER",
    OBJECT: "OBJECT",
    STRING: "STRING",
  },
}));

const ORIGINAL_ENV = {
  GEMINI_FALLBACK_MODEL: process.env.GEMINI_FALLBACK_MODEL,
  GEMINI_MODEL: process.env.GEMINI_MODEL,
  GOOGLE_CLOUD_LOCATION: process.env.GOOGLE_CLOUD_LOCATION,
  GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
  GOOGLE_GENAI_USE_VERTEXAI: process.env.GOOGLE_GENAI_USE_VERTEXAI,
};

const setGeminiEnv = () => {
  process.env.GOOGLE_GENAI_USE_VERTEXAI = "true";
  process.env.GOOGLE_CLOUD_PROJECT = "urban-dds";
  process.env.GOOGLE_CLOUD_LOCATION = "asia-northeast3";
  process.env.GEMINI_MODEL = "gemini-2.5-flash";
  process.env.GEMINI_FALLBACK_MODEL = "gemini-2.5-flash-lite";
};

describe("gemini client fallback", () => {
  beforeEach(() => {
    vi.resetModules();
    generateContentMock.mockReset();
    setGeminiEnv();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env.GEMINI_FALLBACK_MODEL = ORIGINAL_ENV.GEMINI_FALLBACK_MODEL;
    process.env.GEMINI_MODEL = ORIGINAL_ENV.GEMINI_MODEL;
    process.env.GOOGLE_CLOUD_LOCATION = ORIGINAL_ENV.GOOGLE_CLOUD_LOCATION;
    process.env.GOOGLE_CLOUD_PROJECT = ORIGINAL_ENV.GOOGLE_CLOUD_PROJECT;
    process.env.GOOGLE_GENAI_USE_VERTEXAI = ORIGINAL_ENV.GOOGLE_GENAI_USE_VERTEXAI;
    vi.restoreAllMocks();
  });

  it("uses the primary model when it succeeds", async () => {
    generateContentMock.mockResolvedValueOnce({
      text: async () => JSON.stringify({ ok: true }),
    });

    const { generateStructuredJson, getGeminiFallbackModel, getGeminiModel } = await import("../../server/modules/gemini/client");
    const result = await generateStructuredJson<{ ok: boolean }>({
      prompt: "hello",
      responseSchema: {},
    });

    expect(result).toEqual({ ok: true });
    expect(getGeminiModel()).toBe("gemini-2.5-flash");
    expect(getGeminiFallbackModel()).toBe("gemini-2.5-flash-lite");
    expect(generateContentMock).toHaveBeenCalledTimes(1);
    expect(generateContentMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
      model: "gemini-2.5-flash",
    }));
  });

  it("reports no fallback model when the env is unset", async () => {
    delete process.env.GEMINI_FALLBACK_MODEL;

    const { getGeminiFallbackModel } = await import("../../server/modules/gemini/client");

    expect(getGeminiFallbackModel()).toBeNull();
  });

  it("retries with the fallback model when the primary model format is invalid", async () => {
    generateContentMock
      .mockRejectedValueOnce(Object.assign(new Error("unexpected model name format"), { status: 400 }))
      .mockResolvedValueOnce({
        text: async () => JSON.stringify({ ok: true }),
      });

    const { generateStructuredJson } = await import("../../server/modules/gemini/client");
    const result = await generateStructuredJson<{ ok: boolean }>({
      prompt: "hello",
      responseSchema: {},
    });

    expect(result).toEqual({ ok: true });
    expect(generateContentMock).toHaveBeenCalledTimes(2);
    expect(generateContentMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
      model: "gemini-2.5-flash",
    }));
    expect(generateContentMock).toHaveBeenNthCalledWith(2, expect.objectContaining({
      model: "gemini-2.5-flash-lite",
    }));
  });

  it("retries with the fallback model when the primary model is rate-limited", async () => {
    generateContentMock
      .mockRejectedValueOnce(Object.assign(new Error("RESOURCE_EXHAUSTED: quota exceeded"), { status: 429 }))
      .mockResolvedValueOnce({
        text: async () => JSON.stringify({ ok: true }),
      });

    const { generateStructuredJson } = await import("../../server/modules/gemini/client");
    const result = await generateStructuredJson<{ ok: boolean }>({
      prompt: "hello",
      responseSchema: {},
    });

    expect(result).toEqual({ ok: true });
    expect(generateContentMock).toHaveBeenCalledTimes(2);
    expect(generateContentMock).toHaveBeenNthCalledWith(2, expect.objectContaining({
      model: "gemini-2.5-flash-lite",
    }));
  });

  it("does not retry when authentication fails", async () => {
    const authError = Object.assign(new Error("PERMISSION_DENIED"), { status: 403 });
    generateContentMock.mockRejectedValueOnce(authError);

    const { generateStructuredJson } = await import("../../server/modules/gemini/client");

    await expect(generateStructuredJson({
      prompt: "hello",
      responseSchema: {},
    })).rejects.toBe(authError);

    expect(generateContentMock).toHaveBeenCalledTimes(1);
  });

  it("returns the fallback error when both models fail", async () => {
    const fallbackError = Object.assign(new Error("fallback model unavailable"), { status: 404 });
    generateContentMock
      .mockRejectedValueOnce(Object.assign(new Error("unexpected model name format"), { status: 400 }))
      .mockRejectedValueOnce(fallbackError);

    const { generateStructuredJson } = await import("../../server/modules/gemini/client");

    await expect(generateStructuredJson({
      prompt: "hello",
      responseSchema: {},
    })).rejects.toBe(fallbackError);

    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });

  it("classifies model-specific request failures without treating generic 400s as model misconfiguration", async () => {
    const {
      isGeminiModelConfigurationError,
      isGeminiRateLimitError,
    } = await import("../../server/modules/gemini/client");

    expect(isGeminiModelConfigurationError(Object.assign(new Error("unexpected model name format"), { status: 400 })))
      .toBe(true);
    expect(isGeminiModelConfigurationError(Object.assign(new Error("INVALID_ARGUMENT: bad schema"), { status: 400 })))
      .toBe(false);
    expect(isGeminiRateLimitError(Object.assign(new Error("RESOURCE_EXHAUSTED: quota exceeded"), { status: 429 })))
      .toBe(true);
  });
});
