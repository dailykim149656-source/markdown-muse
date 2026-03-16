import { createServer } from "node:http";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { binary, HttpError, json, parseRequestBody, writeHttpResponse } from "./modules/http/http";
import { logRequestCompletion, logRequestStart } from "./modules/http/requestObservability";
import { exportPdf, getTexToolingHealth, previewLatex, validateLatex } from "./modules/tex/compiler";
import { consumeLocalTexPreview, storeTexPreviewPdf } from "./modules/tex/previewStorage";
import { assertTexCompilationAllowed } from "./modules/tex/security";
import type { TexExportPdfRequest, TexPreviewRequest, TexValidateRequest } from "@/types/tex";

process.env.TEX_MAX_REQUEST_BYTES = process.env.TEX_MAX_REQUEST_BYTES || "400000";
const PORT = Number(process.env.PORT || process.env.TEX_SERVICE_PORT || 8081);
const MAX_REQUEST_BYTES = Number(process.env.TEX_MAX_REQUEST_BYTES || 400000);
const LOCAL_PREVIEW_ROUTE_PATTERN = /^\/preview-assets\/(?<previewId>[A-Za-z0-9-]+)$/;

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

const getLocalPreviewId = (url: string) => url.match(LOCAL_PREVIEW_ROUTE_PATTERN)?.groups?.previewId || null;

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

    const localPreviewId = getLocalPreviewId(request.url);
    const isLocalPreviewRoute = request.method === "GET" && Boolean(localPreviewId);

    if (!isLocalPreviewRoute) {
      assertAuthorized(typeof request.headers["x-docsy-tex-token"] === "string" ? request.headers["x-docsy-tex-token"] : undefined);
    }

    if (request.method === "GET" && (request.url === "/health" || request.url === "/api/tex/health")) {
      responseStatus = 200;
      writeHttpResponse(response, json(getTexToolingHealth(), 200, request.headers.origin));
      return;
    }

    if (request.method === "GET" && localPreviewId) {
      const preview = consumeLocalTexPreview(localPreviewId);
      responseStatus = 200;
      writeHttpResponse(response, binary(preview.buffer, "application/pdf", 200, request.headers.origin, {
        "Cache-Control": "private, max-age=60",
        "Content-Disposition": "inline; filename=\"preview.pdf\"",
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
      const result = await previewLatex(payload);
      const storedPreview = result.ok && result.pdfBuffer
        ? await storeTexPreviewPdf({
          pdfBuffer: result.pdfBuffer,
          request,
        })
        : {
          previewExpiresAt: undefined,
          previewStorageBackend: "unavailable" as const,
          previewUrl: undefined,
        };
      requestLogExtra = {
        compileMode: "preview",
        latexBytes: Buffer.byteLength(payload.latex, "utf8"),
        ok: result.ok,
        pdfBytes: result.pdfBytes,
        previewStorageBackend: storedPreview.previewStorageBackend,
      };
      responseStatus = 200;
      writeHttpResponse(response, json({
        compileMs: result.compileMs,
        diagnostics: result.diagnostics,
        engine: "xelatex",
        logSummary: result.logSummary,
        ok: result.ok,
        previewExpiresAt: storedPreview.previewExpiresAt,
        previewUrl: storedPreview.previewUrl,
      }, 200, request.headers.origin));
      return;
    }

    if (request.method === "POST" && request.url === "/export-pdf") {
      const payload = await parseRequestBody<TexExportPdfRequest>(request, { maxBytes: MAX_REQUEST_BYTES });
      assertTexCompilationAllowed({ latex: payload.latex, sourceType: payload.sourceType });
      const result = await exportPdf(payload);
      const safeFileName = (payload.documentName || "Untitled").replace(/[^a-zA-Z0-9._-]+/g, "-");
      requestLogExtra = {
        compileMode: "export",
        latexBytes: Buffer.byteLength(payload.latex, "utf8"),
        ok: result.ok,
        pdfBytes: result.pdfBytes,
      };
      responseStatus = 200;
      writeHttpResponse(response, binary(result.pdfBuffer!, "application/pdf", 200, request.headers.origin, {
        "Content-Disposition": `attachment; filename="${safeFileName || "Untitled"}.pdf"`,
      }));
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
