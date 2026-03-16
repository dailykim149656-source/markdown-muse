import { Buffer } from "node:buffer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { consumeLocalTexArtifact, storeTexArtifactPdf } from "../../server/modules/tex/artifactStorage";

const ORIGINAL_ENV = {
  TEX_PREVIEW_BUCKET: process.env.TEX_PREVIEW_BUCKET,
  TEX_PREVIEW_PUBLIC_BASE_URL: process.env.TEX_PREVIEW_PUBLIC_BASE_URL,
  TEX_PREVIEW_URL_TTL_SECONDS: process.env.TEX_PREVIEW_URL_TTL_SECONDS,
};

const createRequest = (host: string) => ({
  headers: {
    host,
    "x-forwarded-proto": "http",
  },
}) as never;

beforeEach(() => {
  vi.useFakeTimers();
  process.env.TEX_PREVIEW_BUCKET = "";
  process.env.TEX_PREVIEW_PUBLIC_BASE_URL = "";
  process.env.TEX_PREVIEW_URL_TTL_SECONDS = "900";
});

afterEach(() => {
  vi.useRealTimers();
  process.env.TEX_PREVIEW_BUCKET = ORIGINAL_ENV.TEX_PREVIEW_BUCKET;
  process.env.TEX_PREVIEW_PUBLIC_BASE_URL = ORIGINAL_ENV.TEX_PREVIEW_PUBLIC_BASE_URL;
  process.env.TEX_PREVIEW_URL_TTL_SECONDS = ORIGINAL_ENV.TEX_PREVIEW_URL_TTL_SECONDS;
});

describe("tex preview storage", () => {
  it("stores local previews on loopback hosts and returns a preview URL", async () => {
    const result = await storeTexArtifactPdf({
      mode: "preview",
      pdfBuffer: Buffer.from("%PDF-1.7"),
      request: createRequest("localhost:8081"),
    });

    expect(result.storageBackend).toBe("local");
    expect(result.url).toMatch(/^http:\/\/localhost:8081\/artifacts\//);

    const previewId = result.url?.split("/").pop();
    expect(previewId).toBeTruthy();

    const preview = consumeLocalTexArtifact(previewId!);
    expect(preview.buffer.toString("utf8")).toBe("%PDF-1.7");
    expect(preview.contentDisposition).toContain("inline");
  });

  it("does not expose service-local preview URLs for non-loopback hosts without GCS", async () => {
    const result = await storeTexArtifactPdf({
      mode: "preview",
      pdfBuffer: Buffer.from("%PDF-1.7"),
      request: createRequest("docsy-tex.internal"),
    });

    expect(result.storageBackend).toBe("unavailable");
    expect(result.url).toBeUndefined();
  });
});
