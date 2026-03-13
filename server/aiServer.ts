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
import {
  buildNewDraftFallbackPrompt,
  buildTurnPrompt,
  hasExplicitNewDraftRequestInConversation,
  isExplicitNewDraftRequest,
} from "./modules/agent/buildTurnPrompt";
import { actionResponseSchema, normalizeActionResponse } from "./modules/agent/actionResponse";
import { agentTurnResponseSchema, normalizeAgentTurnResponse } from "./modules/agent/turnResponse";
import {
  generateStructuredJson,
  generateMultimodalStructuredJson,
  getGeminiModel,
  isGeminiConfigured,
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
import {
  loadDriveReferenceDocuments,
  searchDriveDocuments,
  shouldSearchDriveDocuments,
} from "./modules/workspace/searchDriveDocuments";
import type {
  AutosaveDiffSummaryRequest,
  AutosaveDiffSummaryResponse,
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
import type { AgentStatus, AgentTurnRequest, AgentTurnResponse } from "../src/types/liveAgent";

console.log("[AI Server] Initializing modules...");
const PORT = Number(process.env.PORT || process.env.AI_SERVER_PORT || 8080);
const MAX_CHUNKS = 8;
console.log(`[AI Server] Configuration: PORT=${PORT}, MAX_CHUNKS=${MAX_CHUNKS}`);

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
  request:
    | AgentTurnRequest
    | SummarizeDocumentRequest
    | GenerateSectionRequest
    | GenerateTocRequest
    | ProposeEditorActionRequest,
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
  chunkInputs: normalizedDocument.chunks.slice(0, MAX_CHUNKS).map((chunk: any) => ({
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

const autosaveDiffSummaryResponseSchema = {
  properties: {
    summary: { type: schemaType.STRING },
  },
  required: ["summary"],
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

const buildAutosaveDiffSummaryPrompt = (request: AutosaveDiffSummaryRequest, locale: Locale) => `
You are writing a concise autosave history summary for a documentation editor.
Use only the supplied diff payload.
Return strict JSON matching the provided schema.
${localePromptSuffix(locale)}

Rules:
- Write exactly one sentence.
- Be concrete about what changed.
- Prioritize the highest-signal differences from the supplied deltas.
- Do not mention scores, chunk ids, or internal IDs unless they are already present in the diff text.
- Do not speculate beyond the provided payload.

Document:
${JSON.stringify(request.document, null, 2)}

Comparison:
${JSON.stringify(request.comparison, null, 2)}
`.trim();

const handleAutosaveDiffSummary = async (
  request: AutosaveDiffSummaryRequest,
): Promise<AutosaveDiffSummaryResponse> => {
  if (!request.comparison?.deltas?.length) {
    throw new HttpError(400, "Autosave diff summary requires at least one diff delta.");
  }

  const requestId = randomUUID();
  const response = await generateStructuredJson<{ summary: string }>({
    prompt: buildAutosaveDiffSummaryPrompt(request, resolveAiLocale(request.locale)),
    responseSchema: autosaveDiffSummaryResponseSchema,
  });

  return {
    requestId,
    summary: response.summary.trim(),
  };
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

  return normalizedDocument.chunks.slice(0, MAX_CHUNKS).map((chunk: any) => ({
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
  const chunks = normalizedDocument.chunks.slice(0, MAX_CHUNKS).map((chunk: any) => ({
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

const newDraftFallbackResponseSchema = {
  properties: {
    markdown: { type: schemaType.STRING },
    rationale: { type: schemaType.STRING },
    title: { type: schemaType.STRING },
  },
  required: ["title", "markdown", "rationale"],
  type: schemaType.OBJECT,
};

const findLatestUserMessage = (request: AgentTurnRequest) => {
  const latestUserMessage = [...request.messages]
    .reverse()
    .find((message) => message.role === "user" && message.text.trim().length > 0)
    ?.text
    .trim();

  if (!latestUserMessage) {
    throw new HttpError(400, "Live agent turn requires at least one user message.");
  }

  return latestUserMessage;
};

const createStaticAgentResponse = (
  assistantText: string,
  effect: AgentTurnResponse["effect"],
): AgentTurnResponse => ({
  assistantMessage: {
    createdAt: Date.now(),
    id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: "assistant",
    text: assistantText,
  },
  effect,
});

const buildAgentStatusMessage = ({
  kind,
  locale,
}: {
  kind: AgentStatus["kind"];
  locale?: Locale;
}) => {
  if (kind === "gemini_rate_limited") {
    return locale === "ko"
      ? "Gemini ?ъ슜 ?쒕룄???꾨떖?덉뒿?덈떎."
      : "Gemini usage is currently rate-limited.";
  }

  if (kind === "gemini_misconfigured") {
    return locale === "ko"
      ? "Gemini 紐⑤뜽 ?ㅼ젙???щ컮瑜댁? ?딆뒿?덈떎."
      : "The Gemini model configuration is invalid.";
  }

  return locale === "ko"
    ? "Gemini媛 ?곌껐?섏뼱 ?덉? ?딆뒿?덈떎."
    : "Gemini is not connected.";
};

const classifyGeminiStatus = ({
  error,
  locale,
}: {
  error: unknown;
  locale?: Locale;
}): AgentStatus => {
  const statusCode = typeof error === "object" && error !== null && "status" in error
    ? Number((error as { status?: unknown }).status)
    : undefined;
  const message = error instanceof Error ? error.message : String(error);
  const normalizedMessage = message.toLowerCase();

  if (
    statusCode === 429
    || normalizedMessage.includes("resource_exhausted")
    || normalizedMessage.includes("quota")
    || normalizedMessage.includes("rate limit")
  ) {
    return {
      kind: "gemini_rate_limited",
      message: buildAgentStatusMessage({ kind: "gemini_rate_limited", locale }),
    };
  }

  if (
    statusCode === 400
    || normalizedMessage.includes("unexpected model name format")
    || (normalizedMessage.includes("invalid_argument") && normalizedMessage.includes("model"))
  ) {
    return {
      kind: "gemini_misconfigured",
      message: buildAgentStatusMessage({ kind: "gemini_misconfigured", locale }),
    };
  }

  return {
    kind: "gemini_unavailable",
    message: buildAgentStatusMessage({ kind: "gemini_unavailable", locale }),
  };
};

const buildAgentStatusResponse = ({
  locale,
  status,
}: {
  locale?: Locale;
  status: AgentStatus;
}) => ({
  agentStatus: status,
  assistantText: status.message,
  effect: {
    type: "reply_only" as const,
  },
});

const buildDraftNewDocumentResponse = ({
  generatedDraft,
  locale,
}: {
  generatedDraft: {
    markdown: string;
    rationale: string;
    title: string;
  };
  locale?: Locale;
}) => ({
  assistantText: locale === "ko"
    ? "\uC0C8 \uCD08\uC548\uC774 \uC900\uBE44\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uC544\uB798 \uBBF8\uB9AC\uBCF4\uAE30\uB97C \uD655\uC778\uD55C \uB4A4 \uC0C8 \uBB38\uC11C\uB85C \uCD94\uAC00\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."
    : "A new draft is ready. Review the preview below and create it as a new document when ready.",
  effect: {
    summary: generatedDraft.rationale,
    title: generatedDraft.title,
    type: "draft_new_document" as const,
  },
  newDocumentDraft: {
    kind: "new_document" as const,
    markdown: generatedDraft.markdown,
    rationale: generatedDraft.rationale,
    title: generatedDraft.title,
  },
});

const generateDedicatedNewDraft = async ({
  latestUserMessage,
  request,
}: {
  latestUserMessage: string;
  request: AgentTurnRequest;
}) => {
  const generatedDraft = await generateMultimodalStructuredJson<{
    markdown: string;
    rationale: string;
    title: string;
  }>({
    images: getRequestImages(request),
    prompt: buildNewDraftFallbackPrompt({
      latestUserMessage,
      recentUserMessages: request.messages
        .filter((message) => message.role === "user")
        .map((message) => message.text)
        .slice(-6),
      request,
    }),
    responseSchema: newDraftFallbackResponseSchema,
  });

  return buildDraftNewDocumentResponse({
    generatedDraft,
    locale: request.locale,
  });
};

const handleAgentTurn = async (
  httpRequest: import("node:http").IncomingMessage,
  request: AgentTurnRequest,
): Promise<AgentTurnResponse> => {
  const latestUserMessage = findLatestUserMessage(request);
  const explicitNewDraftRequest = isExplicitNewDraftRequest(latestUserMessage)
    || hasExplicitNewDraftRequestInConversation(request.messages);
  const wantsDriveSearch = shouldSearchDriveDocuments({
    driveReferenceFileIds: request.driveReferenceFileIds,
    latestUserMessage,
  });
  let driveCandidates: AgentTurnResponse["driveCandidates"] = [];
  let driveReferences: Array<{ fileId: string; fileName: string; excerpt: string }> = [];

  if (wantsDriveSearch || request.driveReferenceFileIds.length > 0) {
    try {
      const loadedReferences = await loadDriveReferenceDocuments(httpRequest, request.driveReferenceFileIds);

      driveReferences = loadedReferences.map((reference) => ({
        excerpt: reference.excerpt,
        fileId: reference.fileId,
        fileName: reference.fileName,
      }));

      if (wantsDriveSearch) {
        driveCandidates = await searchDriveDocuments({
          latestUserMessage,
          request: httpRequest,
        });
      }
    } catch (error) {
      if (error instanceof HttpError && error.statusCode === 401) {
        return createStaticAgentResponse(
          "Google Workspace access is required before I can search or import Google Docs. Open the connection dialog first.",
          { type: "open_google_connect" },
        );
      }

      throw error;
    }
  }

  if (wantsDriveSearch && (!driveCandidates || driveCandidates.length === 0)) {
    return createStaticAgentResponse(
      "I could not find a strong Google Docs match for that request. Try a more specific title, topic, or workflow phrase.",
      { type: "reply_only" },
    );
  }

  if (explicitNewDraftRequest && !wantsDriveSearch) {
    try {
      return normalizeAgentTurnResponse({
        availableImportTargets: [],
        driveCandidates: [],
        response: await generateDedicatedNewDraft({
          latestUserMessage,
          request,
        }),
      });
    } catch (error) {
      return normalizeAgentTurnResponse({
        availableImportTargets: [],
        driveCandidates: [],
        response: buildAgentStatusResponse({
          locale: request.locale,
          status: classifyGeminiStatus({
            error,
            locale: request.locale,
          }),
        }),
      });
    }
  }

  let response;

  try {
    response = await generateMultimodalStructuredJson({
      images: getRequestImages(request),
      prompt: buildTurnPrompt({
        driveCandidates: driveCandidates || [],
        driveReferences,
        latestUserMessage,
        request,
      }),
      responseSchema: agentTurnResponseSchema,
    });
  } catch (error) {
    response = buildAgentStatusResponse({
      locale: request.locale,
      status: classifyGeminiStatus({
        error,
        locale: request.locale,
      }),
    });
  }

  const availableImportTargets = Array.from(new Map<string, { fileId: string; fileName: string }>([
    ...(driveCandidates || []).map((candidate): [string, { fileId: string; fileName: string }] => [candidate.fileId, {
      fileId: candidate.fileId,
      fileName: candidate.fileName,
    }]),
    ...driveReferences.map((reference): [string, { fileId: string; fileName: string }] => [reference.fileId, {
      fileId: reference.fileId,
      fileName: reference.fileName,
    }]),
  ]).values());

  return normalizeAgentTurnResponse({
    availableImportTargets,
    driveCandidates: driveCandidates || [],
    response,
  });
};

const server = createServer(async (request, response) => {
  const requestId = randomUUID();
  console.log(`[AI Server] [${requestId}] ${request.method} ${request.url}`);

  try {
    if (!request.url) {
      throw new HttpError(404, "Unknown request.");
    }

    if (request.method === "OPTIONS") {
      writeHttpResponse(response, json({ ok: true }, 200, request.headers.origin));
      return;
    }

    // Health check - ABSOLUTELY FIRST
    if (request.method === "GET" && (request.url === "/api/ai/health" || request.url === "/health")) {
      console.log(`[AI Server] [${requestId}] Health check passed`);
      writeHttpResponse(response, json({
        allowedOrigins: ALLOWED_ORIGINS,
        configured: isGeminiConfigured(),
        model: getGeminiModel(),
        ok: true,
      }, 200, request.headers.origin));
      return;
    }

    console.log(`[AI Server] [${requestId}] Handling auth route...`);
    const authRouteResult = await handleAuthRoute(request);
    if (authRouteResult) {
      console.log(`[AI Server] [${requestId}] Auth route matched`);
      writeHttpResponse(response, authRouteResult);
      return;
    }

    console.log(`[AI Server] [${requestId}] Handling workspace route...`);
    const workspaceRouteResult = await handleWorkspaceRoute(request);
    if (workspaceRouteResult) {
      console.log(`[AI Server] [${requestId}] Workspace route matched`);
      writeHttpResponse(response, workspaceRouteResult);
      return;
    }

    if (request.method === "POST" && request.url === "/api/ai/summarize") {
      const payload = await parseRequestBody<SummarizeDocumentRequest>(request);
      const result = await handleSummarize(payload);
      writeHttpResponse(response, json(result, 200, request.headers.origin));
      return;
    }

    if (request.method === "POST" && request.url === "/api/ai/autosave-diff-summary") {
      const payload = await parseRequestBody<AutosaveDiffSummaryRequest>(request);
      const result = await handleAutosaveDiffSummary(payload);
      writeHttpResponse(response, json(result, 200, request.headers.origin));
      return;
    }

    if (request.method === "POST" && request.url === "/api/ai/agent/turn") {
      const payload = await parseRequestBody<AgentTurnRequest>(request);
      const result = await handleAgentTurn(request, payload);
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

    console.log(`[AI Server] [${requestId}] Route not found: ${request.url}`);
    throw new HttpError(404, "Route not found.");
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    console.error(`[AI Server] [${requestId}] Error [${statusCode}]: ${message}`, error);
    writeHttpResponse(response, json({ error: message }, statusCode, request.headers.origin));
  }
});

console.log("[AI Server] Starting listener...");
server.listen(PORT, "0.0.0.0", () => {
  console.log(`[AI Server] Listening on http://0.0.0.0:${PORT}`);
});


