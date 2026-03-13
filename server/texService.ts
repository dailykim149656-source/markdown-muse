import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { binary, HttpError, json, parseRequestBody, writeHttpResponse } from "./modules/http/http";
import { exportPdf, getTexToolingHealth, previewLatex, validateLatex } from "./modules/tex/compiler";
import type { TexExportPdfRequest, TexPreviewRequest, TexValidateRequest } from "@/types/tex";

const PORT = Number(process.env.PORT || process.env.TEX_SERVICE_PORT || 8081);

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

const server = createServer(async (request, response) => {
  const requestId = randomUUID();

  try {
    if (!request.url) {
      throw new HttpError(404, "Unknown request.");
    }

    assertAuthorized(typeof request.headers["x-docsy-tex-token"] === "string" ? request.headers["x-docsy-tex-token"] : undefined);

    if (request.method === "GET" && (request.url === "/health" || request.url === "/api/tex/health")) {
      writeHttpResponse(response, json(getTexToolingHealth(), 200, request.headers.origin));
      return;
    }

    if (request.method === "POST" && request.url === "/validate") {
      const payload = await parseRequestBody<TexValidateRequest>(request);
      const result = await validateLatex(payload);
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
      const payload = await parseRequestBody<TexPreviewRequest>(request);
      const result = await previewLatex(payload);
      writeHttpResponse(response, json({
        compileMs: result.compileMs,
        diagnostics: result.diagnostics,
        engine: "xelatex",
        logSummary: result.logSummary,
        ok: result.ok,
        pdfBase64: result.pdfBase64,
      }, 200, request.headers.origin));
      return;
    }

    if (request.method === "POST" && request.url === "/export-pdf") {
      const payload = await parseRequestBody<TexExportPdfRequest>(request);
      const result = await exportPdf(payload);
      const safeFileName = (payload.documentName || "Untitled").replace(/[^a-zA-Z0-9._-]+/g, "-");
      writeHttpResponse(response, binary(result.pdfBuffer!, "application/pdf", 200, request.headers.origin, {
        "Content-Disposition": `attachment; filename="${safeFileName || "Untitled"}.pdf"`,
      }));
      return;
    }

    throw new HttpError(404, "Route not found.");
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : "Unexpected TeX server error.";
    console.error(`[TeX Service] [${requestId}] ${request.method} ${request.url} -> ${statusCode}: ${message}`, error);
    writeHttpResponse(response, json({ error: message }, statusCode, request.headers.origin));
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[TeX Service] Listening on http://0.0.0.0:${PORT}`);
});
