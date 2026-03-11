import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { normalizeIngestionRequest } from "../src/lib/ingestion/normalizeIngestionRequest";
import { keywordRetrieve } from "../src/lib/retrieval/keywordRetrieval";
import {
  buildSummaryRequestFromMatches,
  validateSummaryResponse,
  type SummaryRequest,
  type SummaryResponse,
} from "../src/lib/ai/summaryContracts";
import { buildActionPrompt } from "./modules/agent/buildActionPrompt";
import { actionResponseSchema, normalizeActionResponse } from "./modules/agent/actionResponse";
import {
  generateMultimodalStructuredJson,
  getGeminiModel,
  schemaType,
} from "./modules/gemini/client";
import { handleAuthRoute } from "./modules/auth/routes";
import {
  ALLOWED_ORIGINS,
  HttpError,
  json,
  parseRequestBody,
  writeHttpResponse,
} from "./modules/http/http";
import { handleWorkspaceRoute } from "./modules/workspace/routes";
import type {
  GenerateTocRequest,
  GenerateTocResponse,
  GenerateSectionRequest,
  GenerateSectionResponse,
  ProposeEditorActionRequest,
  ProposeEditorActionResponse,
  SummarizeDocumentRequest,
  SummarizeDocumentResponse,
} from "../src/types/aiAssistant";
import type { Locale } from "../src/i18n/types";

const PORT = Number(process.env.PORT || process.env.AI_SERVER_PORT || 8787);
const MAX_CHUNKS = 8;

const resolveAiLocale = (value: string | undefined): Locale => (value === "ko" ? "ko" : "en");

const localePromptSuffix = (locale: Locale) => (locale === "ko" ? "Respond in Korean." : "Respond in English.");

const assertMarkdownDocument = (
  request: SummarizeDocumentRequest | GenerateSectionRequest | GenerateTocRequest | ProposeEditorActionRequest,
) => {
  if (!request.document?.markdown?.trim()) {
    throw new HttpError(400, "Document markdown is required.");
  }
};

const getRequestImages = (
  request: SummarizeDocumentRequest | GenerateSectionRequest | GenerateTocRequest | ProposeEditorActionRequest,
) => {
  if (!request.screenshot?.dataBase64?.trim() || !request.screenshot.mimeType?.trim()) {
    return [];
  }

  return [{
    dataBase64: request.screenshot.dataBase64.trim(),
    mimeType: request.screenshot.mimeType.trim(),
  }];
};

const normalizeMarkdownDocument = (request: SummarizeDocumentRequest | GenerateSectionRequest | GenerateTocRequest) =>
  normalizeIngestionRequest({
    fileName: `${request.document.fileName}.md`,
    importedAt: Date.now(),
    ingestionId: request.document.documentId,
    rawContent: request.document.markdown,
    sourceFormat: "markdown",
  });

const buildFallbackSummaryRequest = (
  normalizedDocument: ReturnType<typeof normalizeMarkdownDocument>,
  objective: string,
): SummaryRequest => ({
  chunkInputs: normalizedDocument.chunks.slice(0, MAX_CHUNKS).map((chunk) => ({
    chunkId: chunk.chunkId,
    ingestionId: normalizedDocument.ingestionId,
    metadata: chunk.metadata,
    sectionId: chunk.sectionId,
    text: chunk.text,
    tokenEstimate: chunk.tokenEstimate,
  })),
  documents: [{
    fileName: normalizedDocument.fileName,
    ingestionId: normalizedDocument.ingestionId,
    metadata: normalizedDocument.metadata,
    sourceFormat: normalizedDocument.sourceFormat,
  }],
  maxWords: 180,
  objective: objective || "Summarize the document.",
  requestId: randomUUID(),
  style: "bullets",
});

const buildGroundedSummaryRequest = (request: SummarizeDocumentRequest) => {
  const normalizedDocument = normalizeMarkdownDocument(request);
  const retrieval = request.objective.trim()
    ? keywordRetrieve([normalizedDocument], { limit: MAX_CHUNKS, query: request.objective })
    : { matches: [], normalizedQuery: "", terms: [], totalMatches: 0 };

  if (retrieval.matches.length === 0) {
    return buildFallbackSummaryRequest(normalizedDocument, request.objective.trim());
  }

  return buildSummaryRequestFromMatches(
    request.objective.trim() || "Summarize the document.",
    retrieval.matches.slice(0, MAX_CHUNKS),
    [normalizedDocument],
    {
      maxWords: 180,
      requestId: randomUUID(),
      style: "bullets",
    },
  );
};

const summarizeResponseSchema = {
  properties: {
    attributions: {
      items: {
        properties: {
          chunkId: { type: schemaType.STRING },
          ingestionId: { type: schemaType.STRING },
          rationale: { type: schemaType.STRING },
          sectionId: { type: schemaType.STRING },
        },
        required: ["chunkId", "ingestionId", "rationale"],
        type: schemaType.OBJECT,
      },
      type: schemaType.ARRAY,
    },
    bulletPoints: {
      items: { type: schemaType.STRING },
      type: schemaType.ARRAY,
    },
    summary: { type: schemaType.STRING },
  },
  required: ["summary", "bulletPoints", "attributions"],
  type: schemaType.OBJECT,
};

const generateSectionResponseSchema = {
  properties: {
    attributions: {
      items: {
        properties: {
          chunkId: { type: schemaType.STRING },
          ingestionId: { type: schemaType.STRING },
          rationale: { type: schemaType.STRING },
          sectionId: { type: schemaType.STRING },
        },
        required: ["chunkId", "ingestionId", "rationale"],
        type: schemaType.OBJECT,
      },
      type: schemaType.ARRAY,
    },
    body: { type: schemaType.STRING },
    rationale: { type: schemaType.STRING },
    title: { type: schemaType.STRING },
  },
  required: ["title", "body", "rationale", "attributions"],
  type: schemaType.OBJECT,
};

const generateTocResponseSchema = {
  properties: {
    attributions: {
      items: {
        properties: {
          chunkId: { type: schemaType.STRING },
          ingestionId: { type: schemaType.STRING },
          rationale: { type: schemaType.STRING },
          sectionId: { type: schemaType.STRING },
        },
        required: ["chunkId", "ingestionId", "rationale"],
        type: schemaType.OBJECT,
      },
      type: schemaType.ARRAY,
    },
    entries: {
      items: {
        properties: {
          level: { type: schemaType.INTEGER },
          title: { type: schemaType.STRING },
        },
        required: ["level", "title"],
        type: schemaType.OBJECT,
      },
      type: schemaType.ARRAY,
    },
    maxDepth: { type: schemaType.INTEGER },
    rationale: { type: schemaType.STRING },
  },
  required: ["entries", "maxDepth", "rationale", "attributions"],
  type: schemaType.OBJECT,
};

const buildSummaryPrompt = (request: SummaryRequest, locale: Locale) => `
You are summarizing a technical document for an editor workflow.
Use only the supplied chunk inputs.
Return strict JSON that matches the provided schema.
${localePromptSuffix(locale)}

Rules:
- Keep the summary concise and factual.
- Use bulletPoints for actionable or high-signal takeaways.
- Every factual statement must be backed by at least one attribution.
- Every attribution must reference only the exact chunkId and ingestionId values from the provided inputs.
- Do not invent chunk ids, section ids, or file names.

Objective:
${request.objective}

Documents:
${JSON.stringify(request.documents, null, 2)}

Chunk Inputs:
${JSON.stringify(request.chunkInputs, null, 2)}
`.trim();

const validateAttributions = (
  allowedChunks: { chunkId: string; ingestionId: string }[],
  attributions: { chunkId: string; ingestionId: string }[],
) => {
  const allowed = new Set(allowedChunks.map((chunk) => `${chunk.ingestionId}:${chunk.chunkId}`));
  const invalid = attributions
    .map((attribution) => `${attribution.ingestionId}:${attribution.chunkId}`)
    .filter((key) => !allowed.has(key));

  if (invalid.length > 0) {
    throw new Error(`Gemini returned invalid chunk references: ${invalid.join(", ")}`);
  }
};

const handleSummarize = async (request: SummarizeDocumentRequest): Promise<SummarizeDocumentResponse> => {
  assertMarkdownDocument(request);
  const locale = resolveAiLocale(request.locale);
  const summaryRequest = buildGroundedSummaryRequest(request);
  const summaryResponse = await generateMultimodalStructuredJson<Omit<SummaryResponse, "requestId">>({
    images: getRequestImages(request),
    prompt: buildSummaryPrompt(summaryRequest, locale),
    responseSchema: summarizeResponseSchema,
  });
  const hydratedResponse: SummarizeDocumentResponse = {
    attributions: summaryResponse.attributions,
    bulletPoints: summaryResponse.bulletPoints || [],
    requestId: summaryRequest.requestId,
    summary: summaryResponse.summary,
  };
  const validation = validateSummaryResponse(summaryRequest, hydratedResponse as SummaryResponse);

  if (!validation.valid) {
    throw new Error(`Gemini summary response referenced invalid chunks: ${validation.missingChunkReferences.join(", ")}`);
  }

  return hydratedResponse;
};

const buildSectionPrompt = (
  request: GenerateSectionRequest,
  chunks: { chunkId: string; ingestionId: string; sectionId?: string; text: string }[],
  locale: Locale,
) => `
You are drafting a new section for an in-product documentation editor.
Use only the supplied chunk excerpts as factual grounding.
Return strict JSON matching the requested schema.
${localePromptSuffix(locale)}

Rules:
- Write a section that fits naturally into the existing document.
- Avoid duplicating existing headings.
- Keep the section practical and documentation-oriented.
- Provide a short rationale describing why this section should exist.
- Every attribution must reference only the supplied chunk ids.
- Do not invent facts beyond the provided chunks.

Existing headings:
${JSON.stringify(request.existingHeadings, null, 2)}

Prompt:
${request.prompt}

Grounding chunks:
${JSON.stringify(chunks, null, 2)}
`.trim();

const buildSectionGrounding = (request: GenerateSectionRequest) => {
  const normalizedDocument = normalizeMarkdownDocument(request);
  const retrieval = keywordRetrieve([normalizedDocument], {
    limit: MAX_CHUNKS,
    query: request.prompt,
  });

  if (retrieval.matches.length > 0) {
    return retrieval.matches.slice(0, MAX_CHUNKS).map((match) => ({
      chunkId: match.chunk.chunkId,
      ingestionId: match.documentId,
      sectionId: match.chunk.sectionId,
      text: match.chunk.text,
    }));
  }

  return normalizedDocument.chunks.slice(0, MAX_CHUNKS).map((chunk) => ({
    chunkId: chunk.chunkId,
    ingestionId: normalizedDocument.ingestionId,
    sectionId: chunk.sectionId,
    text: chunk.text,
  }));
};

const handleGenerateSection = async (request: GenerateSectionRequest): Promise<GenerateSectionResponse> => {
  assertMarkdownDocument(request);

  if (!request.prompt.trim()) {
    throw new HttpError(400, "Section prompt is required.");
  }

  const groundingChunks = buildSectionGrounding(request);
  const result = await generateMultimodalStructuredJson<GenerateSectionResponse>({
    images: getRequestImages(request),
    prompt: buildSectionPrompt(request, groundingChunks, resolveAiLocale(request.locale)),
    responseSchema: generateSectionResponseSchema,
  });

  validateAttributions(groundingChunks, result.attributions);
  return result;
};

const buildTocGrounding = (request: GenerateTocRequest) => {
  const normalizedDocument = normalizeMarkdownDocument(request);
  const chunks = normalizedDocument.chunks.slice(0, MAX_CHUNKS).map((chunk) => ({
    chunkId: chunk.chunkId,
    ingestionId: normalizedDocument.ingestionId,
    sectionId: chunk.sectionId,
    text: chunk.text,
  }));

  return {
    chunks,
    normalizedDocument,
  };
};

const buildTocPrompt = (
  request: GenerateTocRequest,
  chunks: { chunkId: string; ingestionId: string; sectionId?: string; text: string }[],
  locale: Locale,
) => `
You are proposing a table of contents suggestion for a technical document editor.
Use only the supplied grounding chunks and existing headings.
Return strict JSON matching the provided schema.
${localePromptSuffix(locale)}

Rules:
- Suggest a concise table of contents that reflects the current document structure.
- Prefer headings that already exist in the document.
- Keep levels within 1 to 3.
- Choose maxDepth between 1 and 3.
- Every attribution must reference only the supplied chunk ids.
- Do not invent facts or sections that are unsupported by the supplied chunks.

Existing headings:
${JSON.stringify(request.existingHeadings, null, 2)}

Grounding chunks:
${JSON.stringify(chunks, null, 2)}
`.trim();

const handleGenerateToc = async (request: GenerateTocRequest): Promise<GenerateTocResponse> => {
  assertMarkdownDocument(request);
  const { chunks } = buildTocGrounding(request);
  const result = await generateMultimodalStructuredJson<GenerateTocResponse>({
    images: getRequestImages(request),
    prompt: buildTocPrompt(request, chunks, resolveAiLocale(request.locale)),
    responseSchema: generateTocResponseSchema,
  });

  validateAttributions(chunks, result.attributions);

  return {
    ...result,
    entries: result.entries
      .map((entry) => ({
        level: (entry.level <= 1 ? 1 : entry.level >= 3 ? 3 : 2) as 1 | 2 | 3,
        title: entry.title.trim(),
      }))
      .filter((entry) => entry.title.length > 0),
    maxDepth: (result.maxDepth <= 1 ? 1 : result.maxDepth >= 3 ? 3 : 2) as 1 | 2 | 3,
  };
};

const handleProposeAction = async (request: ProposeEditorActionRequest): Promise<ProposeEditorActionResponse> => {
  assertMarkdownDocument(request);
  const locale = resolveAiLocale(request.locale);
  const response = await generateMultimodalStructuredJson<ProposeEditorActionResponse>({
    images: getRequestImages(request),
    prompt: buildActionPrompt(request, locale),
    responseSchema: actionResponseSchema,
  });

  return normalizeActionResponse(response, request);
};

const server = createServer(async (request, response) => {
  try {
    if (!request.url) {
      throw new HttpError(404, "Unknown request.");
    }

    if (request.method === "OPTIONS") {
      writeHttpResponse(response, json({ ok: true }, 200, request.headers.origin));
      return;
    }

    const authRouteResult = await handleAuthRoute(request);

    if (authRouteResult) {
      writeHttpResponse(response, authRouteResult);
      return;
    }

    const workspaceRouteResult = await handleWorkspaceRoute(request);

    if (workspaceRouteResult) {
      writeHttpResponse(response, workspaceRouteResult);
      return;
    }

    if (request.method === "GET" && request.url === "/api/ai/health") {
      writeHttpResponse(response, json({
        allowedOrigins: ALLOWED_ORIGINS,
        configured: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
        model: getGeminiModel(),
        ok: true,
      }, 200, request.headers.origin));
      return;
    }

    if (request.method === "POST" && request.url === "/api/ai/summarize") {
      const payload = await parseRequestBody<SummarizeDocumentRequest>(request);
      const result = await handleSummarize(payload);
      writeHttpResponse(response, json(result, 200, request.headers.origin));
      return;
    }

    if (request.method === "POST" && request.url === "/api/ai/generate-section") {
      const payload = await parseRequestBody<GenerateSectionRequest>(request);
      const result = await handleGenerateSection(payload);
      writeHttpResponse(response, json(result, 200, request.headers.origin));
      return;
    }

    if (request.method === "POST" && request.url === "/api/ai/generate-toc") {
      const payload = await parseRequestBody<GenerateTocRequest>(request);
      const result = await handleGenerateToc(payload);
      writeHttpResponse(response, json(result, 200, request.headers.origin));
      return;
    }

    if (request.method === "POST" && request.url === "/api/ai/propose-action") {
      const payload = await parseRequestBody<ProposeEditorActionRequest>(request);
      const result = await handleProposeAction(payload);
      writeHttpResponse(response, json(result, 200, request.headers.origin));
      return;
    }

    throw new HttpError(404, "Route not found.");
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    writeHttpResponse(response, json({ error: message }, statusCode, request.headers.origin));
  }
});

server.listen(PORT, () => {
  console.log(`Gemini AI server listening on http://localhost:${PORT}`);
});
