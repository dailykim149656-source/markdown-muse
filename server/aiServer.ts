import { createServer } from "node:http";
import { Buffer } from "node:buffer";
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
import { buildActiveDocumentRetrievalContext } from "./modules/agent/buildActiveDocumentRetrievalContext";
import { normalizeGenerateTocResponse } from "./modules/ai/normalizeGenerateTocResponse";
import {
  buildPlannerPrompt,
  plannerNeedsFollowup,
} from "./modules/agent/buildPlannerPrompt";
import { executePlannedAction } from "./modules/agent/executePlannedAction";
import { buildAgentPreRouteHints } from "./modules/agent/preRouteAgentTurn";
import {
  findLatestSummaryRequestInConversation,
  hasExplicitCurrentDocumentUpdateRequestInConversation,
  hasHandoverDocumentRequestInConversation,
  hasSummaryRequestInConversation,
} from "./modules/agent/buildTurnPrompt";
import { actionResponseSchema, normalizeActionResponse } from "./modules/agent/actionResponse";
import {
  agentPlannerResponseSchema,
  normalizePlannerResponse,
} from "./modules/agent/plannerResponse";
import { resolveWorkspaceSessionForAgent } from "./modules/agent/resolveWorkspaceSessionForAgent";
import { normalizeAgentTurnResponse } from "./modules/agent/turnResponse";
import {
  getGeminiFallbackModel,
  getGeminiErrorStatusCode,
  generateStructuredJson,
  generateMultimodalStructuredJson,
  getGeminiModel,
  isGeminiModelConfigurationError,
  isGeminiConfigured,
  isGeminiRateLimitError,
  schemaType,
} from "./modules/gemini/client";
import {
  readPublicDeploymentConfig,
  shouldBlockServerStartupForPublicDeployment,
  validatePublicDeploymentConfig,
} from "./modules/config/publicDeploymentConfig.js";
import { getGoogleOAuthRuntimeSummary } from "./modules/auth/googleOAuth";
import { handleAuthRoute } from "./modules/auth/routes";
import {
  FORWARDED_WORKSPACE_SESSION_COOKIE,
  getWorkspaceSessionCookieNames,
  getWorkspaceSessionCookieSameSite,
  WORKSPACE_AUTH_SUCCESS_CRITERION,
} from "./modules/auth/sessionStore";
import {
  ALLOWED_ORIGINS,
  binary,
  empty,
  getRequestUrl,
  HttpError,
  json,
  parseOptionalRequestBody,
  parseRequestBody,
  writeHttpResponse,
} from "./modules/http/http";
import {
  buildInternalAiHealthPayload,
  buildPublicAiHealthPayload,
  isAuthorizedDiagnosticsRequest,
  sanitizeLogMessage,
} from "./modules/http/aiDiagnostics";
import { handleListenError } from "./modules/http/handleListenError";
import {
  getApproximateBase64ByteLength,
  logRequestCompletion,
  logRequestStart,
} from "./modules/http/requestObservability";
import { buildGoalSuggestionPrompt } from "./modules/navigator/buildGoalSuggestionPrompt";
import { buildNavigatorPrompt } from "./modules/navigator/buildNavigatorPrompt";
import {
  navigatorGoalSuggestionResponseSchema,
  normalizeNavigatorGoalSuggestionResponse,
} from "./modules/navigator/goalSuggestionResponse";
import {
  navigatorTurnResponseSchema,
  normalizeNavigatorTurnResponse,
} from "./modules/navigator/turnResponse";
import {
  consumeRateLimit,
  getRequestClientId,
  resolveRateLimitPolicy,
} from "./modules/http/rateLimit";
import { handleShareRoute } from "./modules/share/routes";
import { handleTexAutoFix } from "./modules/tex/autoFix";
import {
  exportTexPdf,
  getTexJob as getTexJobWithService,
  getTexHealth as getTexServiceHealth,
  previewTex as previewTexWithService,
  validateTex as validateTexWithService,
} from "./modules/tex/client";
import { assertTexCompilationAllowed } from "./modules/tex/security";
import { handleWorkspaceRoute } from "./modules/workspace/routes";
import {
  loadDriveReferenceDocuments,
} from "./modules/workspace/searchDriveDocuments";
import { resolveWorkspaceRepositoryBackend } from "./modules/workspace/repository";
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
import type {
  TexAutoFixRequest,
  TexAutoFixResponse,
  TexExportPdfRequest,
  TexPreviewRequest,
  TexValidateRequest,
} from "../src/types/tex";
import type { NavigatorTurnRequest, NavigatorTurnResponse } from "../src/types/visualNavigator";
import type {
  NavigatorGoalSuggestionRequest,
  NavigatorGoalSuggestionResponse,
} from "../src/types/visualNavigator";

console.log("[AI Server] Initializing modules...");
process.env.AI_MAX_REQUEST_BYTES = process.env.AI_MAX_REQUEST_BYTES || "2097152";
const PORT = Number(process.env.PORT || process.env.AI_SERVER_PORT || 8080);
const MAX_CHUNKS = 8;
const MAX_REQUEST_BYTES = Number(process.env.AI_MAX_REQUEST_BYTES || 2097152);
console.log(`[AI Server] Configuration: PORT=${PORT}, MAX_CHUNKS=${MAX_CHUNKS}, MAX_REQUEST_BYTES=${MAX_REQUEST_BYTES}`);

const publicDeploymentConfig = readPublicDeploymentConfig(process.env);
const publicDeploymentValidation = validatePublicDeploymentConfig(publicDeploymentConfig);
const googleOAuthRuntimeSummary = getGoogleOAuthRuntimeSummary();

for (const note of publicDeploymentValidation.notes) {
  console.info(`[AI Server] Public deploy note: ${note}`);
}

for (const warning of publicDeploymentValidation.warnings) {
  console.warn(`[AI Server] Public deploy warning: ${warning}`);
}

if (publicDeploymentValidation.errors.length > 0) {
  for (const error of publicDeploymentValidation.errors) {
    console.error(`[AI Server] Public deploy error: ${error}`);
  }
}

if (shouldBlockServerStartupForPublicDeployment(publicDeploymentConfig, publicDeploymentValidation)) {
  throw new Error(
    `Public deployment configuration is invalid: ${publicDeploymentValidation.errors.join(" | ")}`,
  );
}

console.log(
  `[AI Server] Google OAuth deployment status=${googleOAuthRuntimeSummary.publishingStatus} scopeProfile=${googleOAuthRuntimeSummary.scopeProfile} scopeRisk=${googleOAuthRuntimeSummary.scopeRisk} frontendOrigin=${googleOAuthRuntimeSummary.frontendOrigin || "(unset)"} redirectOrigin=${googleOAuthRuntimeSummary.redirectOrigin || "(unset)"} allowedOrigins=${publicDeploymentConfig.allowedOrigins.join(",") || "(none)"}`,
);
console.log(
  `[AI Server] Workspace repository backend=${resolveWorkspaceRepositoryBackend()} revision=${process.env.K_REVISION || "(unset)"} service=${process.env.K_SERVICE || "(unset)"} secureCookie=${FORWARDED_WORKSPACE_SESSION_COOKIE} secureSameSite=${getWorkspaceSessionCookieSameSite({ headers: { "x-forwarded-proto": "https" } } as never)}`,
);

const resolveAiLocale = (value: string | undefined): Locale => (value === "ko" ? "ko" : "en");

const localePromptSuffix = (locale: Locale) => (locale === "ko" ? "Respond in Korean." : "Respond in English.");

const getMarkdownByteLength = (markdown: string | undefined) => Buffer.byteLength(markdown || "", "utf8");

const getScreenshotByteLength = (
  request:
    | AgentTurnRequest
    | NavigatorGoalSuggestionRequest
    | NavigatorTurnRequest
    | SummarizeDocumentRequest
    | GenerateSectionRequest
    | GenerateTocRequest
    | ProposeEditorActionRequest,
) => getApproximateBase64ByteLength(request.screenshot?.dataBase64);

const buildAiRequestLogContext = (
  request:
    | AgentTurnRequest
    | NavigatorGoalSuggestionRequest
    | NavigatorTurnRequest
    | SummarizeDocumentRequest
    | GenerateSectionRequest
    | GenerateTocRequest
    | ProposeEditorActionRequest
    | TexAutoFixRequest
    | TexExportPdfRequest
    | TexPreviewRequest
    | TexValidateRequest,
) => {
  if ("document" in request) {
    return {
      markdownBytes: getMarkdownByteLength(request.document.markdown),
      screenshotBytes: getScreenshotByteLength(request),
    };
  }

  if ("activeDocument" in request) {
    return {
      loadedDriveDocs: 0,
      markdownBytes: getMarkdownByteLength(request.activeDocument?.markdown),
      screenshotBytes: getScreenshotByteLength(request),
      selectedDriveRefs: (request.driveReferenceFileIds || []).length,
    };
  }

  if ("intent" in request && "ui" in request) {
    return {
      screenshotBytes: getScreenshotByteLength(request),
    };
  }

  if ("latex" in request) {
    return {
      latexBytes: Buffer.byteLength(request.latex, "utf8"),
    };
  }

  return {};
};

const assertMarkdownDocument = (
  request: SummarizeDocumentRequest | GenerateSectionRequest | GenerateTocRequest | ProposeEditorActionRequest,
) => {
  if (!request.document?.markdown?.trim()) {
    throw new HttpError(400, "Document markdown is required.");
  }
};

const assertNavigatorScreenshotRequest = (request: NavigatorGoalSuggestionRequest | NavigatorTurnRequest) => {
  if (!request.screenshot?.dataBase64?.trim() || !request.screenshot.mimeType?.trim()) {
    throw new HttpError(400, "Navigator screenshot is required.");
  }
};

const assertNavigatorRequest = (request: NavigatorTurnRequest) => {
  if (!request.intent.trim()) {
    throw new HttpError(400, "Navigator intent is required.");
  }

  assertNavigatorScreenshotRequest(request);
};

const getRequestImages = (
  request:
    | AgentTurnRequest
    | NavigatorGoalSuggestionRequest
    | NavigatorTurnRequest
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
          anchorStrategy: { type: schemaType.STRING },
          anchorText: { type: schemaType.STRING },
          level: { type: schemaType.INTEGER },
          title: { type: schemaType.STRING },
        },
        required: ["title", "level", "anchorStrategy", "anchorText"],
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
- For each entry, return an anchorStrategy of "existing_heading", "promote_block", or "unmatched".
- Return anchorText as a short exact excerpt copied from an existing heading or promotable document block.
- Use "existing_heading" only when the anchorText is the exact current heading text to reuse.
- Use "promote_block" only when the anchorText is a short exact excerpt from a non-heading document block that should become a heading.
- Use "unmatched" with an empty anchorText when you cannot safely anchor the entry to the current document.
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
  const rawResult = await generateMultimodalStructuredJson<GenerateTocResponse>({
    images: getRequestImages(request),
    prompt: buildTocPrompt(request, chunks, resolveAiLocale(request.locale)),
    responseSchema: generateTocResponseSchema,
  });
  const result = normalizeGenerateTocResponse(rawResult);

  validateAttributions(chunks, result.attributions);
  return result;
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

export const handleNavigatorGoalSuggestions = async (
  request: NavigatorGoalSuggestionRequest,
): Promise<NavigatorGoalSuggestionResponse> => {
  assertNavigatorScreenshotRequest(request);
  const locale = resolveAiLocale(request.locale);
  const response = await generateMultimodalStructuredJson({
    images: getRequestImages(request),
    prompt: buildGoalSuggestionPrompt(request, locale),
    responseSchema: navigatorGoalSuggestionResponseSchema,
  });

  return normalizeNavigatorGoalSuggestionResponse({
    request,
    response,
  });
};

export const handleNavigatorTurn = async (
  request: NavigatorTurnRequest,
): Promise<NavigatorTurnResponse> => {
  assertNavigatorRequest(request);
  const locale = resolveAiLocale(request.locale);
  const response = await generateMultimodalStructuredJson({
    images: getRequestImages(request),
    prompt: buildNavigatorPrompt(request, locale),
    responseSchema: navigatorTurnResponseSchema,
  });

  return normalizeNavigatorTurnResponse(response);
};

const MIN_PLANNER_CONFIDENCE = 0.65;
const SUCCESS_REPLY_ONLY_PATTERN = /\b(done|updated|applied|prepared|created|imported|reflected)\b|(?:\uBC18\uC601|\uC218\uC815|\uC801\uC6A9|\uC644\uB8CC|\uC0DD\uC131|\uC900\uBE44)/i;

const findLatestUserMessage = (request: AgentTurnRequest) => {
  const latestUserMessage = [...(request.messages || [])]
    .reverse()
    .find((message) => message.role === "user" && message.text.trim().length > 0)
    ?.text
    .trim();

  if (!latestUserMessage) {
    throw new HttpError(400, "Live agent turn requires at least one user message.");
  }

  return latestUserMessage;
};

interface AgentConversationIntentHints {
  currentDocumentSummaryRequested: boolean;
  currentDocumentUpdateRequested: boolean;
  handoverDocumentRequested: boolean;
  latestSummaryRequest: string | null;
  summaryDocumentRequested: boolean;
}

const DOCUMENT_FOLLOWUP_PATTERN = /\b(?:document|doc|source document|target document|summary document|section|heading|field|which part|where)\b|(?:요약할\s*문서|대상\s*문서|원본\s*문서|소스\s*문서|비교할\s*문서|참조\s*문서|어떤\s*섹션|어느\s*부분|어떤\s*필드|어느\s*헤딩)/iu;
const SUMMARY_DOCUMENT_PATTERN = /(summary document|separate summary|document the summary|요약 문서|문서화|따로 문서|별도 문서)/i;

const buildConversationIntentHints = (request: AgentTurnRequest): AgentConversationIntentHints => {
  const messages = request.messages || [];
  const latestSummaryRequest = findLatestSummaryRequestInConversation(messages);

  return {
    currentDocumentSummaryRequested: Boolean(request.activeDocument) && hasSummaryRequestInConversation(messages),
    currentDocumentUpdateRequested: Boolean(request.activeDocument)
      && hasExplicitCurrentDocumentUpdateRequestInConversation(messages),
    handoverDocumentRequested: hasHandoverDocumentRequestInConversation(messages),
    latestSummaryRequest,
    summaryDocumentRequested: Boolean(latestSummaryRequest && SUMMARY_DOCUMENT_PATTERN.test(latestSummaryRequest)),
  };
};

const shouldUseActiveDocumentOverride = ({
  planner,
  preRouteHints,
  request,
}: {
  planner: ReturnType<typeof normalizePlannerResponse>;
  preRouteHints: ReturnType<typeof buildAgentPreRouteHints>;
  request: AgentTurnRequest;
}) => Boolean(request.activeDocument)
  && !preRouteHints.localTarget
  && !preRouteHints.driveReferenceTarget
  && preRouteHints.ambiguousLocalTargets.length === 0
  && preRouteHints.ambiguousDriveReferences.length === 0
  && planner.missingInformation.length > 0;

const buildAgentStatusMessage = ({
  kind,
  locale,
}: {
  kind: AgentStatus["kind"];
  locale?: Locale;
}) => {
  if (kind === "gemini_rate_limited") {
    return locale === "ko"
      ? "Gemini 사용 한도에 도달했습니다."
      : "Gemini usage is currently rate-limited.";
  }

  if (kind === "gemini_misconfigured") {
    return locale === "ko"
      ? "Gemini 모델 설정이 올바르지 않습니다."
      : "The Gemini model configuration is invalid.";
  }

  return locale === "ko"
    ? "Gemini가 연결되어 있지 않습니다."
    : "Gemini is not connected.";
};

const classifyGeminiStatus = ({
  error,
  locale,
}: {
  error: unknown;
  locale?: Locale;
}): AgentStatus => {
  const statusCode = getGeminiErrorStatusCode(error);

  if (isGeminiRateLimitError(error)) {
    return {
      kind: "gemini_rate_limited",
      message: buildAgentStatusMessage({ kind: "gemini_rate_limited", locale }),
    };
  }

  if (isGeminiModelConfigurationError(error)) {
    return {
      kind: "gemini_misconfigured",
      message: buildAgentStatusMessage({ kind: "gemini_misconfigured", locale }),
    };
  }

  if (statusCode === 400) {
    console.warn("[LiveAgent] Gemini request failed with a non-model 400; reporting unavailable status.");
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

const logGeminiRequestFailure = ({
  error,
  phase,
  requestId,
}: {
  error: unknown;
  phase: "executor" | "planner";
  requestId: string;
}) => {
  const statusCode = getGeminiErrorStatusCode(error);
  const message = sanitizeLogMessage(error instanceof Error ? error.message : String(error));
  console.error(
    `[LiveAgent] Gemini ${phase} failed requestId=${requestId} statusCode=${statusCode ?? "unknown"} message=${message}`,
    error,
  );
};

const buildPlannerFollowupResponse = ({
  locale,
  planner,
}: {
  locale?: Locale;
  planner: ReturnType<typeof normalizePlannerResponse>;
}) => ({
  assistantText: planner.missingInformation.length > 0
    ? (locale === "ko"
      ? `\uACC4\uC18D \uC9C4\uD589\uD558\uB824\uBA74 \uB2E4\uC74C \uC815\uBCF4\uAC00 \uB354 \uD544\uC694\uD569\uB2C8\uB2E4: ${planner.missingInformation.join(", ")}.`
      : `I need a bit more detail before I can continue: ${planner.missingInformation.join(", ")}.`)
    : planner.reason,
  effect: {
    type: "ask_followup" as const,
  },
});

const shouldWarnOnReplyOnlySuccessText = (response: AgentTurnResponse) =>
  response.effect.type === "reply_only"
  && SUCCESS_REPLY_ONLY_PATTERN.test(response.assistantMessage.text);

const summarizeCspReportPayload = (payload: unknown) => {
  const reports = Array.isArray(payload) ? payload : [payload];
  return reports
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return "invalid_report";
      }

      const report = "csp-report" in entry
        ? (entry as { "csp-report"?: Record<string, unknown> })["csp-report"]
        : entry as Record<string, unknown>;
      const directive = typeof report?.["effective-directive"] === "string"
        ? report["effective-directive"]
        : typeof report?.["violated-directive"] === "string"
          ? report["violated-directive"]
          : "unknown-directive";
      const blockedUri = typeof report?.["blocked-uri"] === "string"
        ? sanitizeLogMessage(report["blocked-uri"])
        : "unknown-blocked-uri";

      return `${directive}:${blockedUri}`;
    })
    .join(" | ");
};

const handleCspReport = async (request: import("node:http").IncomingMessage, requestId: string) => {
  try {
    const payload = await parseOptionalRequestBody<unknown>(request, { maxBytes: 32_768 });
    console.info(`[AI Server] [${requestId}] CSP report ${summarizeCspReportPayload(payload)}`);
  } catch (error) {
    const message = error instanceof Error ? sanitizeLogMessage(error.message) : "invalid_csp_report";
    console.warn(`[AI Server] [${requestId}] CSP report parse failed: ${message}`);
  }
};

export const handleAgentTurn = async (
  httpRequest: import("node:http").IncomingMessage,
  request: AgentTurnRequest,
  requestId = randomUUID(),
  requestLogContext?: { loadedDriveDocs?: number },
): Promise<AgentTurnResponse> => {
  const latestUserMessage = findLatestUserMessage(request);
  const locale = request.locale ? resolveAiLocale(request.locale) : undefined;
  const workspaceSession = await resolveWorkspaceSessionForAgent(httpRequest, requestId);
  const workspaceConnected = workspaceSession.workspaceConnected;
  const retrievalContext = buildActiveDocumentRetrievalContext({
    latestUserMessage,
    request,
  });
  let driveReferences: Array<{ excerpt: string; fileId: string; fileName: string }> = [];

  const driveReferenceFileIds = request.driveReferenceFileIds || [];

  if (workspaceConnected && driveReferenceFileIds.length > 0) {
    try {
      driveReferences = (await loadDriveReferenceDocuments(httpRequest, driveReferenceFileIds))
        .map((reference) => ({
          excerpt: reference.excerpt,
          fileId: reference.fileId,
          fileName: reference.fileName,
        }));
      if (requestLogContext) {
        requestLogContext.loadedDriveDocs = driveReferences.length;
      }
    } catch (error) {
      console.warn(`[LiveAgent] failed to load selected drive references before planning requestId=${requestId}`, error);
      driveReferences = [];
      if (requestLogContext) {
        requestLogContext.loadedDriveDocs = 0;
      }
    }
  }

  const preRouteHints = buildAgentPreRouteHints({
    driveReferences,
    latestUserMessage,
    request,
  });
  const conversationIntent = buildConversationIntentHints(request);

  let planner;

  try {
    const rawPlannerResponse = await generateMultimodalStructuredJson({
      images: getRequestImages(request),
      prompt: buildPlannerPrompt({
        conversationIntent,
        driveReferences,
        preRouteHints,
        retrievalContext,
        request,
        workspaceConnected,
      }),
      responseSchema: agentPlannerResponseSchema,
    });
    planner = normalizePlannerResponse(rawPlannerResponse);

    if (
      shouldUseActiveDocumentOverride({
        planner,
        preRouteHints,
        request,
      })
      && conversationIntent.currentDocumentSummaryRequested
    ) {
      planner = {
        ...planner,
        action: "summarize_document",
        arguments: {
          ...planner.arguments,
          createDocumentAfter: Boolean(planner.arguments?.createDocumentAfter)
            || conversationIntent.summaryDocumentRequested
            || conversationIntent.handoverDocumentRequested,
          prompt: planner.arguments?.prompt || conversationIntent.latestSummaryRequest || latestUserMessage,
        },
        missingInformation: [],
        reason: "Summarize the active document.",
        target: {
          ...planner.target,
          documentId: request.activeDocument?.documentId,
          documentName: request.activeDocument?.fileName,
        },
      };
    } else if (
      shouldUseActiveDocumentOverride({
        planner,
        preRouteHints,
        request,
      })
      && conversationIntent.currentDocumentUpdateRequested
    ) {
      planner = {
        ...planner,
        action: "update_current_document",
        missingInformation: [],
        reason: "Update the active document.",
        target: {
          ...planner.target,
          documentId: request.activeDocument?.documentId,
          documentName: request.activeDocument?.fileName,
        },
      };
    }

    if (
      preRouteHints.activeDocumentPinned
      && request.activeDocument
      && !planner.target?.documentId
      && (
        planner.action === "update_current_document"
        || planner.action === "summarize_document"
        || planner.action === "generate_section"
        || planner.action === "generate_toc"
        || planner.action === "extract_procedure"
      )
    ) {
      planner = {
        ...planner,
        target: {
          ...planner.target,
          documentId: request.activeDocument.documentId,
          documentName: request.activeDocument.fileName,
        },
      };
    }

    if (
      !planner.target?.documentId
      && preRouteHints.localTarget
      && (planner.action === "compare_documents" || planner.action === "suggest_document_updates")
    ) {
      planner = {
        ...planner,
        target: {
          ...planner.target,
          documentId: preRouteHints.localTarget.documentId,
          documentName: preRouteHints.localTarget.fileName,
        },
      };
    }

    if (
      !planner.target?.fileId
      && preRouteHints.driveReferenceTarget
      && (planner.action === "compare_documents" || planner.action === "suggest_document_updates" || planner.action === "prepare_drive_import")
    ) {
      planner = {
        ...planner,
        target: {
          ...planner.target,
          fileId: preRouteHints.driveReferenceTarget.fileId,
          fileName: preRouteHints.driveReferenceTarget.fileName,
        },
      };
    }
  } catch (error) {
    logGeminiRequestFailure({
      error,
      phase: "planner",
      requestId,
    });
    return normalizeAgentTurnResponse({
      availableImportTargets: [],
      driveCandidates: [],
      response: buildAgentStatusResponse({
        locale,
        status: classifyGeminiStatus({
          error,
          locale,
        }),
      }),
    });
  }

  console.info(
    `[LiveAgent] planner requestId=${requestId} action=${planner.action} confidence=${planner.confidence.toFixed(2)} workspaceConnected=${workspaceConnected ? "yes" : "no"} sessionLookupFailed=${workspaceSession.sessionLookupFailed ? "yes" : "no"} graphSections=${retrievalContext?.topSectionTargets.map((target) => `${target.sectionId || target.headingNodeId}:${target.score}`).join("|") || "none"} graphFields=${retrievalContext?.topFieldTargets.map((target) => `${target.fieldKey}:${target.score}`).join("|") || "none"}`,
  );

  if (plannerNeedsFollowup(planner, MIN_PLANNER_CONFIDENCE)) {
    const followupResponse = normalizeAgentTurnResponse({
      availableImportTargets: [],
      driveCandidates: [],
      response: buildPlannerFollowupResponse({
        locale,
        planner,
      }),
    });

    if (shouldWarnOnReplyOnlySuccessText(followupResponse)) {
      console.warn(`[LiveAgent] suspicious reply_only success text after planner followup: ${followupResponse.assistantMessage.text}`);
    }

    return followupResponse;
  }

  try {
    const executionResult = await executePlannedAction({
      driveReferences,
      httpRequest,
      latestUserMessage,
      request,
      retrievalContext,
      workspaceConnected,
    }, planner);

    const normalizedResponse = normalizeAgentTurnResponse({
      availableImportTargets: executionResult.availableImportTargets,
      driveCandidates: executionResult.driveCandidates,
      response: executionResult.rawResponse,
    });

    console.info(
      `[LiveAgent] executor requestId=${requestId} action=${executionResult.telemetry?.executorAction || planner.action} effect=${normalizedResponse.effect.type} deterministicFallback=${executionResult.telemetry?.deterministicFallbackUsed ? "yes" : "no"} driveAuthGate=${executionResult.telemetry?.driveAuthGateUsed ? "yes" : "no"} failureReason=${executionResult.telemetry?.failureReason || "none"}`,
    );

    if (shouldWarnOnReplyOnlySuccessText(normalizedResponse)) {
      console.warn(`[LiveAgent] suspicious reply_only success text: ${normalizedResponse.assistantMessage.text}`);
    }

    return normalizedResponse;
  } catch (error) {
    logGeminiRequestFailure({
      error,
      phase: "executor",
      requestId,
    });
    return normalizeAgentTurnResponse({
      availableImportTargets: [],
      driveCandidates: [],
      response: buildAgentStatusResponse({
        locale,
        status: classifyGeminiStatus({
          error,
          locale,
        }),
      }),
    });
  }
};

const server = createServer(async (request, response) => {
  const requestId = randomUUID();
  const startedAt = Date.now();
  let route = request.url || "/";
  let responseStatus = 500;
  let requestLogExtra: Record<string, boolean | number | string | null | undefined> | undefined;
  console.log(`[AI Server] [${requestId}] ${request.method} ${request.url}`);
  logRequestStart({
    request,
    requestId,
    route,
    service: "ai",
  });

  try {
    if (!request.url) {
      throw new HttpError(404, "Unknown request.");
    }

    if (request.method === "OPTIONS") {
      responseStatus = 200;
      writeHttpResponse(response, json({ ok: true }, 200, request.headers.origin));
      return;
    }

    const requestUrl = getRequestUrl(request);
    route = requestUrl.pathname;

    // Health check - ABSOLUTELY FIRST
    if (request.method === "GET" && (requestUrl.pathname === "/api/ai/health" || requestUrl.pathname === "/health")) {
      console.log(`[AI Server] [${requestId}] Health check passed`);
      responseStatus = 200;
      writeHttpResponse(response, json(buildPublicAiHealthPayload({
        configured: isGeminiConfigured(),
      }), 200, request.headers.origin));
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/api/internal/ai/health") {
      if (!isAuthorizedDiagnosticsRequest(request)) {
        throw new HttpError(404, "Route not found.");
      }

      const googleOAuthSummary = getGoogleOAuthRuntimeSummary();
      responseStatus = 200;
      writeHttpResponse(response, json(buildInternalAiHealthPayload({
        allowedOrigins: ALLOWED_ORIGINS,
        configured: isGeminiConfigured(),
        fallbackModel: getGeminiFallbackModel(),
        frontendOrigin: googleOAuthSummary.frontendOrigin,
        googleOAuthPublishingStatus: googleOAuthSummary.publishingStatus,
        googleOAuthRedirectOrigin: googleOAuthSummary.redirectOrigin,
        googleOAuthRedirectUri: googleOAuthSummary.redirectUri,
        googleWorkspaceScopeProfile: googleOAuthSummary.scopeProfile,
        googleWorkspaceScopeRisk: googleOAuthSummary.scopeRisk,
        model: getGeminiModel(),
        runtimeRevision: process.env.K_REVISION?.trim() || null,
        runtimeService: process.env.K_SERVICE?.trim() || null,
        workspaceAuthSuccessCriterion: WORKSPACE_AUTH_SUCCESS_CRITERION,
        workspaceRepositoryBackend: resolveWorkspaceRepositoryBackend(),
        workspaceSessionCookieAcceptedNames: getWorkspaceSessionCookieNames(),
        workspaceSessionCookieSecureName: FORWARDED_WORKSPACE_SESSION_COOKIE,
        workspaceSessionCookieSecureSameSite: getWorkspaceSessionCookieSameSite({ headers: { "x-forwarded-proto": "https" } } as never),
      }), 200, request.headers.origin));
      return;
    }

    const rateLimitPolicy = resolveRateLimitPolicy({
      method: request.method || "GET",
      pathname: requestUrl.pathname,
    });

    if (rateLimitPolicy) {
      const rateLimitDecision = consumeRateLimit({
        clientId: getRequestClientId(request),
        policy: rateLimitPolicy,
      });

      if (!rateLimitDecision.allowed) {
        console.warn(
          `[AI Server] [${requestId}] rate_limited bucket=${rateLimitPolicy.bucket} path=${requestUrl.pathname}`,
        );
        responseStatus = 429;
        writeHttpResponse(response, json({
          error: "Rate limit exceeded.",
        }, 429, request.headers.origin, {
          "Retry-After": String(rateLimitDecision.retryAfterSeconds),
        }));
        return;
      }
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/security/csp-report") {
      await handleCspReport(request, requestId);
      responseStatus = 204;
      writeHttpResponse(response, empty(204, request.headers.origin));
      return;
    }

    const shareRouteResult = await handleShareRoute(request);
    if (shareRouteResult) {
      console.log(`[AI Server] [${requestId}] Share route matched`);
      responseStatus = shareRouteResult.statusCode;
      writeHttpResponse(response, shareRouteResult);
      return;
    }

    console.log(`[AI Server] [${requestId}] Handling auth route...`);
    const authRouteResult = await handleAuthRoute(request);
    if (authRouteResult) {
      console.log(`[AI Server] [${requestId}] Auth route matched`);
      responseStatus = authRouteResult.statusCode;
      writeHttpResponse(response, authRouteResult);
      return;
    }

    console.log(`[AI Server] [${requestId}] Handling workspace route...`);
    const workspaceRouteResult = await handleWorkspaceRoute(request);
    if (workspaceRouteResult) {
      console.log(`[AI Server] [${requestId}] Workspace route matched`);
      responseStatus = workspaceRouteResult.statusCode;
      writeHttpResponse(response, workspaceRouteResult);
      return;
    }

    if (request.method === "POST" && request.url === "/api/ai/summarize") {
      const payload = await parseRequestBody<SummarizeDocumentRequest>(request, { maxBytes: MAX_REQUEST_BYTES });
      const result = await handleSummarize(payload);
      requestLogExtra = buildAiRequestLogContext(payload);
      responseStatus = 200;
      writeHttpResponse(response, json(result, 200, request.headers.origin));
      return;
    }

    if (request.method === "POST" && request.url === "/api/ai/autosave-diff-summary") {
      const payload = await parseRequestBody<AutosaveDiffSummaryRequest>(request, { maxBytes: MAX_REQUEST_BYTES });
      const result = await handleAutosaveDiffSummary(payload);
      responseStatus = 200;
      writeHttpResponse(response, json(result, 200, request.headers.origin));
      return;
    }

    if (request.method === "POST" && request.url === "/api/ai/agent/turn") {
      const payload = await parseRequestBody<AgentTurnRequest>(request, { maxBytes: MAX_REQUEST_BYTES });
      const agentRequestLogContext = buildAiRequestLogContext(payload);
      const result = await handleAgentTurn(request, payload, requestId, agentRequestLogContext);
      requestLogExtra = agentRequestLogContext;
      responseStatus = 200;
      writeHttpResponse(response, json(result, 200, request.headers.origin));
      return;
    }

    if (request.method === "POST" && request.url === "/api/ai/navigator/turn") {
      const payload = await parseRequestBody<NavigatorTurnRequest>(request, { maxBytes: MAX_REQUEST_BYTES });
      const result = await handleNavigatorTurn(payload);
      requestLogExtra = buildAiRequestLogContext(payload);
      responseStatus = 200;
      writeHttpResponse(response, json(result, 200, request.headers.origin));
      return;
    }

    if (request.method === "POST" && request.url === "/api/ai/navigator/suggest-goals") {
      const payload = await parseRequestBody<NavigatorGoalSuggestionRequest>(request, { maxBytes: MAX_REQUEST_BYTES });
      const result = await handleNavigatorGoalSuggestions(payload);
      requestLogExtra = buildAiRequestLogContext(payload);
      responseStatus = 200;
      writeHttpResponse(response, json(result, 200, request.headers.origin));
      return;
    }

    if (request.method === "POST" && request.url === "/api/ai/generate-section") {
      const payload = await parseRequestBody<GenerateSectionRequest>(request, { maxBytes: MAX_REQUEST_BYTES });
      const result = await handleGenerateSection(payload);
      requestLogExtra = buildAiRequestLogContext(payload);
      responseStatus = 200;
      writeHttpResponse(response, json(result, 200, request.headers.origin));
      return;
    }

    if (request.method === "POST" && request.url === "/api/ai/generate-toc") {
      const payload = await parseRequestBody<GenerateTocRequest>(request, { maxBytes: MAX_REQUEST_BYTES });
      const result = await handleGenerateToc(payload);
      requestLogExtra = buildAiRequestLogContext(payload);
      responseStatus = 200;
      writeHttpResponse(response, json(result, 200, request.headers.origin));
      return;
    }

    if (request.method === "POST" && request.url === "/api/ai/propose-action") {
      const payload = await parseRequestBody<ProposeEditorActionRequest>(request, { maxBytes: MAX_REQUEST_BYTES });
      const result = await handleProposeAction(payload);
      requestLogExtra = buildAiRequestLogContext(payload);
      responseStatus = 200;
      writeHttpResponse(response, json(result, 200, request.headers.origin));
      return;
    }

    if (request.method === "POST" && request.url === "/api/ai/tex/fix") {
      const payload = await parseRequestBody<TexAutoFixRequest>(request, { maxBytes: MAX_REQUEST_BYTES });
      const result = await handleTexAutoFix(payload);
      requestLogExtra = buildAiRequestLogContext(payload);
      responseStatus = 200;
      writeHttpResponse(response, json(result, 200, request.headers.origin));
      return;
    }

    if (request.method === "GET" && request.url === "/api/tex/health") {
      const result = await getTexServiceHealth();
      responseStatus = 200;
      writeHttpResponse(response, json(result, 200, request.headers.origin));
      return;
    }

    if (request.method === "POST" && request.url === "/api/tex/validate") {
      const payload = await parseRequestBody<TexValidateRequest>(request, { maxBytes: MAX_REQUEST_BYTES });
      assertTexCompilationAllowed({ latex: payload.latex, sourceType: payload.sourceType });
      const result = await validateTexWithService(payload);
      requestLogExtra = buildAiRequestLogContext(payload);
      responseStatus = 200;
      writeHttpResponse(response, json(result, 200, request.headers.origin));
      return;
    }

    if (request.method === "POST" && request.url === "/api/tex/preview") {
      const payload = await parseRequestBody<TexPreviewRequest>(request, { maxBytes: MAX_REQUEST_BYTES });
      assertTexCompilationAllowed({ latex: payload.latex, sourceType: payload.sourceType });
      const result = await previewTexWithService(payload);
      requestLogExtra = buildAiRequestLogContext(payload);
      responseStatus = 202;
      writeHttpResponse(response, json(result, 202, request.headers.origin));
      return;
    }

    if (request.method === "POST" && request.url === "/api/tex/export-pdf") {
      const payload = await parseRequestBody<TexExportPdfRequest>(request, { maxBytes: MAX_REQUEST_BYTES });
      assertTexCompilationAllowed({ latex: payload.latex, sourceType: payload.sourceType });
      const result = await exportTexPdf(payload);
      requestLogExtra = buildAiRequestLogContext(payload);
      responseStatus = 202;
      writeHttpResponse(response, json(result, 202, request.headers.origin));
      return;
    }

    if (request.method === "GET" && requestUrl.pathname.startsWith("/api/tex/jobs/")) {
      const jobId = requestUrl.pathname.replace(/^\/api\/tex\/jobs\//, "").trim();

      if (!jobId) {
        throw new HttpError(400, "jobId is required.");
      }

      const result = await getTexJobWithService(jobId);
      responseStatus = 200;
      writeHttpResponse(response, json(result, 200, request.headers.origin));
      return;
    }

    console.log(`[AI Server] [${requestId}] Route not found: ${request.url}`);
    throw new HttpError(404, "Route not found.");
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    const rawMessage = error instanceof Error ? error.message : "Unexpected server error.";
    const sanitizedMessage = sanitizeLogMessage(rawMessage);
    const publicMessage = error instanceof HttpError && statusCode < 500
      ? sanitizedMessage || "Request failed."
      : "Unexpected server error.";

    if (process.env.NODE_ENV === "production") {
      console.error(`[AI Server] [${requestId}] Error [${statusCode}]: ${sanitizedMessage}`);
    } else {
      console.error(`[AI Server] [${requestId}] Error [${statusCode}]: ${sanitizedMessage}`, error);
    }

    responseStatus = statusCode;
    writeHttpResponse(response, json({ error: publicMessage }, statusCode, request.headers.origin));
  } finally {
    logRequestCompletion({
      extra: requestLogExtra,
      request,
      requestId,
      route,
      service: "ai",
      startedAt,
      statusCode: responseStatus,
    });
  }
});

if (process.env.VITEST !== "true") {
  server.once("error", (error) => {
    void handleListenError({
      error: error as NodeJS.ErrnoException,
      port: PORT,
      serviceName: "AI Server",
    }).then((exitCode) => {
      process.exit(exitCode);
    }).catch((listenError) => {
      console.error("[AI Server] Failed to handle startup error.", listenError);
      process.exit(1);
    });
  });

  console.log("[AI Server] Starting listener...");
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[AI Server] Listening on http://0.0.0.0:${PORT}`);
  });
}
