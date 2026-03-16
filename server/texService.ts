import { createServer } from "node:http";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { binary, HttpError, json, parseRequestBody, writeHttpResponse } from "./modules/http/http";
import { logRequestCompletion, logRequestStart } from "./modules/http/requestObservability";
import { getTexToolingHealth, validateLatex } from "./modules/tex/compiler";
import { consumeLocalTexArtifact } from "./modules/tex/artifactStorage";
import { buildTexJobEnqueueResponse, buildTexJobStatusResponse } from "./modules/tex/jobResponse";
import { enqueueTexJob } from "./modules/tex/jobQueue";
import { getTexJobStore } from "./modules/tex/jobStore";
import { processTexJobById } from "./modules/tex/processTexJob";
import { assertTexCompilationAllowed } from "./modules/tex/security";
import type { TexExportPdfRequest, TexPreviewRequest, TexValidateRequest } from "@/types/tex";

process.env.TEX_MAX_REQUEST_BYTES = process.env.TEX_MAX_REQUEST_BYTES || "400000";
const PORT = Number(process.env.PORT || process.env.TEX_SERVICE_PORT || 8081);
const MAX_REQUEST_BYTES = Number(process.env.TEX_MAX_REQUEST_BYTES || 400000);
const LOCAL_ARTIFACT_ROUTE_PATTERN = /^\/artifacts\/(?<artifactId>[A-Za-z0-9-]+)$/;

const getExpectedAuthToken = () => process.env.TEX_SERVICE_AUTH_TOKEN?.trim() || "";

const assertAuthorized = (requestTokenHeader: string | undefined) => {
  const expectedToken = getExpectedAuthToken();

  if (!expectedToken) {
    return;
  }

  const receivedToken = requestTokenHeader?.trim() || "";

  if (receivedToken !== expectedToken) {
    throw new HttpError(401, "Unauthorized TeX service request.");
  }
};

const getLocalArtifactId = (url: string) => url.match(LOCAL_ARTIFACT_ROUTE_PATTERN)?.groups?.artifactId || null;

const server = createServer(async (request, response) => {
  const requestId = randomUUID();
  const startedAt = Date.now();
  let route = request.url || "/";
  let responseStatus = 500;
  let requestLogExtra: Record<string, boolean | number | string | null | undefined> | undefined;

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

    route = request.url;

    const localArtifactId = getLocalArtifactId(request.url);
    const isLocalArtifactRoute = request.method === "GET" && Boolean(localArtifactId);

    if (!isLocalArtifactRoute) {
      assertAuthorized(typeof request.headers["x-docsy-tex-token"] === "string" ? request.headers["x-docsy-tex-token"] : undefined);
    }

    if (request.method === "GET" && (request.url === "/health" || request.url === "/api/tex/health")) {
      responseStatus = 200;
      writeHttpResponse(response, json(getTexToolingHealth(), 200, request.headers.origin));
      return;
    }

    if (request.method === "GET" && localArtifactId) {
      const artifact = consumeLocalTexArtifact(localArtifactId);
      responseStatus = 200;
      writeHttpResponse(response, binary(artifact.buffer, "application/pdf", 200, request.headers.origin, {
        "Cache-Control": "private, max-age=60",
        "Content-Disposition": artifact.contentDisposition,
      }));
      return;
    }

    if (request.method === "POST" && request.url === "/validate") {
      const payload = await parseRequestBody<TexValidateRequest>(request, { maxBytes: MAX_REQUEST_BYTES });
      assertTexCompilationAllowed({ latex: payload.latex, sourceType: payload.sourceType });
      const result = await validateLatex(payload);
      requestLogExtra = {
        compileMode: "validate",
        latexBytes: Buffer.byteLength(payload.latex, "utf8"),
        ok: result.ok,
        pdfBytes: result.pdfBytes,
      };
      responseStatus = 200;
      writeHttpResponse(response, json({
        compileMs: result.compileMs,
        diagnostics: result.diagnostics,
        engine: "xelatex",
        logSummary: result.logSummary,
        ok: result.ok,
      }, 200, request.headers.origin));
      return;
    }

    if (request.method === "POST" && request.url === "/preview") {
      const payload = await parseRequestBody<TexPreviewRequest>(request, { maxBytes: MAX_REQUEST_BYTES });
      assertTexCompilationAllowed({ latex: payload.latex, sourceType: payload.sourceType });
      const jobRecord = await getTexJobStore().createJob({
        contentHash: payload.contentHash,
        documentName: payload.documentName,
        latex: payload.latex,
        mode: "preview",
        sourceType: payload.sourceType,
      });
      await enqueueTexJob({
        jobId: jobRecord.jobId,
        processLocally: () => processTexJobById({
          jobId: jobRecord.jobId,
          request,
        }).then(() => undefined),
      });
      requestLogExtra = {
        jobId: jobRecord.jobId,
        latexBytes: Buffer.byteLength(payload.latex, "utf8"),
        mode: "preview",
      };
      responseStatus = 202;
      writeHttpResponse(response, json(buildTexJobEnqueueResponse(jobRecord), 202, request.headers.origin));
      return;
    }

    if (request.method === "POST" && request.url === "/export-pdf") {
      const payload = await parseRequestBody<TexExportPdfRequest>(request, { maxBytes: MAX_REQUEST_BYTES });
      assertTexCompilationAllowed({ latex: payload.latex, sourceType: payload.sourceType });
      const jobRecord = await getTexJobStore().createJob({
        documentName: payload.documentName,
        latex: payload.latex,
        mode: "export",
        sourceType: payload.sourceType,
      });
      await enqueueTexJob({
        jobId: jobRecord.jobId,
        processLocally: () => processTexJobById({
          jobId: jobRecord.jobId,
          request,
        }).then(() => undefined),
      });
      requestLogExtra = {
        jobId: jobRecord.jobId,
        latexBytes: Buffer.byteLength(payload.latex, "utf8"),
        mode: "export",
      };
      responseStatus = 202;
      writeHttpResponse(response, json(buildTexJobEnqueueResponse(jobRecord), 202, request.headers.origin));
      return;
    }

    if (request.method === "GET" && request.url.startsWith("/jobs/")) {
      const jobId = request.url.replace(/^\/jobs\//, "").trim();

      if (!jobId) {
        throw new HttpError(400, "jobId is required.");
      }

      const jobRecord = await getTexJobStore().getJob(decodeURIComponent(jobId));

      if (!jobRecord) {
        throw new HttpError(404, "TeX job was not found.");
      }

      requestLogExtra = {
        jobId: jobRecord.jobId,
        mode: jobRecord.mode,
        status: jobRecord.status,
      };
      responseStatus = 200;
      writeHttpResponse(response, json(buildTexJobStatusResponse(jobRecord), 200, request.headers.origin));
      return;
    }

    throw new HttpError(404, "Route not found.");
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : "Unexpected TeX server error.";
    responseStatus = statusCode;
    console.error(`[TeX Service] [${requestId}] ${request.method} ${request.url} -> ${statusCode}: ${message}`, error);
    writeHttpResponse(response, json({ error: message }, statusCode, request.headers.origin));
  } finally {
    logRequestCompletion({
      extra: requestLogExtra,
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
  console.log(`[TeX Service] Listening on http://0.0.0.0:${PORT}`);
});
