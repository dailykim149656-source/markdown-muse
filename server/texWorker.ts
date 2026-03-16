import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { empty, HttpError, json, parseRequestBody, writeHttpResponse } from "./modules/http/http";
import { logRequestCompletion, logRequestStart } from "./modules/http/requestObservability";
import { processTexJobById } from "./modules/tex/processTexJob";

const PORT = Number(process.env.PORT || process.env.TEX_WORKER_PORT || 8082);
const MAX_REQUEST_BYTES = 16_384;

const getExpectedAuthToken = () => process.env.TEX_SERVICE_AUTH_TOKEN?.trim() || "";

const assertAuthorized = (requestTokenHeader: string | undefined) => {
  const expectedToken = getExpectedAuthToken();

  if (!expectedToken) {
    return;
  }

  const receivedToken = requestTokenHeader?.trim() || "";

  if (receivedToken !== expectedToken) {
    throw new HttpError(401, "Unauthorized TeX worker request.");
  }
};

const server = createServer(async (request, response) => {
  const requestId = randomUUID();
  const startedAt = Date.now();
  const route = request.url || "/";
  let responseStatus = 500;

  logRequestStart({
    request,
    requestId,
    route,
    service: "tex",
  });

  try {
    if (!request.url) {
      throw new HttpError(404, "Unknown request.");
    }

    assertAuthorized(typeof request.headers["x-docsy-tex-token"] === "string" ? request.headers["x-docsy-tex-token"] : undefined);

    if (request.method === "GET" && (request.url === "/health" || request.url === "/api/tex/worker/health")) {
      responseStatus = 200;
      writeHttpResponse(response, json({ ok: true }, 200, request.headers.origin));
      return;
    }

    if (request.method === "POST" && request.url === "/tasks/tex-jobs") {
      const payload = await parseRequestBody<{ jobId?: string }>(request, { maxBytes: MAX_REQUEST_BYTES });
      const jobId = payload.jobId?.trim();

      if (!jobId) {
        throw new HttpError(400, "jobId is required.");
      }

      await processTexJobById({
        jobId,
        request,
      });

      responseStatus = 204;
      writeHttpResponse(response, empty(204, request.headers.origin));
      return;
    }

    throw new HttpError(404, "Route not found.");
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : "Unexpected TeX worker error.";
    responseStatus = statusCode;
    console.error(`[TeX Worker] [${requestId}] ${request.method} ${request.url} -> ${statusCode}: ${message}`, error);
    writeHttpResponse(response, json({ error: message }, statusCode, request.headers.origin));
  } finally {
    logRequestCompletion({
      request,
      requestId,
      route,
      service: "tex",
      startedAt,
      statusCode: responseStatus,
    });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[TeX Worker] Listening on http://0.0.0.0:${PORT}`);
});
