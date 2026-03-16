import { Readable } from "node:stream";
import { afterEach, describe, expect, it } from "vitest";
import { HttpError, parseOptionalRequestBody, parseRequestBody } from "../../server/modules/http/http";

const ORIGINAL_ENV = {
  AI_MAX_REQUEST_BYTES: process.env.AI_MAX_REQUEST_BYTES,
  TEX_MAX_REQUEST_BYTES: process.env.TEX_MAX_REQUEST_BYTES,
};

const createRequest = (payload: string, contentLength?: string) => {
  const request = Readable.from([payload]) as never;
  request.headers = contentLength ? { "content-length": contentLength } : {};
  return request;
};

afterEach(() => {
  process.env.AI_MAX_REQUEST_BYTES = ORIGINAL_ENV.AI_MAX_REQUEST_BYTES;
  process.env.TEX_MAX_REQUEST_BYTES = ORIGINAL_ENV.TEX_MAX_REQUEST_BYTES;
});

describe("request body parsing limits", () => {
  it("rejects oversized AI request bodies with 413", async () => {
    process.env.AI_MAX_REQUEST_BYTES = "10";
    process.env.TEX_MAX_REQUEST_BYTES = "";

    await expect(parseRequestBody(createRequest(JSON.stringify({
      objective: "too large",
    })))).rejects.toMatchObject({
      statusCode: 413,
    } satisfies Partial<HttpError>);
  });

  it("rejects oversized TeX request bodies with 413", async () => {
    process.env.AI_MAX_REQUEST_BYTES = "";
    process.env.TEX_MAX_REQUEST_BYTES = "12";

    await expect(parseOptionalRequestBody(createRequest(JSON.stringify({
      latex: "\\frac{a}{b}",
    })))).rejects.toMatchObject({
      statusCode: 413,
    } satisfies Partial<HttpError>);
  });

  it("rejects oversized requests from the content-length header before buffering", async () => {
    process.env.AI_MAX_REQUEST_BYTES = "10";
    process.env.TEX_MAX_REQUEST_BYTES = "";

    await expect(parseRequestBody(createRequest(JSON.stringify({
      objective: "tiny",
    }), "999"))).rejects.toMatchObject({
      statusCode: 413,
    } satisfies Partial<HttpError>);
  });
});
