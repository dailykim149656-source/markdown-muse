import { randomUUID } from "node:crypto";
import type { Locale } from "../../../src/i18n/types";
import type { TexAutoFixRequest, TexAutoFixResponse, TexValidateRequest, TexValidateResponse } from "../../../src/types/tex";
import { generateStructuredJson, schemaType } from "../gemini/client";
import { HttpError } from "../http/http";
import { assertTexCompilationAllowed } from "./security";
import { validateTex } from "./client";

const localePromptSuffix = (locale: Locale) => (locale === "ko" ? "Respond in Korean." : "Respond in English.");
const resolveLocale = (value: string | undefined): Locale => (value === "ko" ? "ko" : "en");

export const texAutoFixResponseSchema = {
  properties: {
    fixedLatex: { type: schemaType.STRING },
    rationale: { type: schemaType.STRING },
  },
  required: ["fixedLatex", "rationale"],
  type: schemaType.OBJECT,
};

export const buildTexAutoFixPrompt = (request: TexAutoFixRequest, locale: Locale) => `
You are repairing a raw LaTeX document for an in-product patch review workflow.
Return strict JSON matching the provided schema.
${localePromptSuffix(locale)}

Rules:
- Fix only the minimum amount of LaTeX needed to resolve the reported compile errors.
- Do not rewrite document meaning, structure, or tone unless strictly required to make it compile.
- Preserve existing macros, comments, whitespace style, and layout whenever possible.
- Keep unrelated sections unchanged.
- Return the full revised LaTeX source in fixedLatex.
- Keep rationale short and concrete.

Document name:
${request.documentName || "Untitled"}

Source type:
${request.sourceType}

Compiler diagnostics:
${JSON.stringify(request.diagnostics, null, 2)}

Compiler log summary:
${request.logSummary}

Original LaTeX:
${request.latex}
`.trim();

interface HandleTexAutoFixDependencies {
  generateJson?: (payload: {
    model?: string;
    prompt: string;
    responseSchema: object;
  }) => Promise<{ fixedLatex: string; rationale: string }>;
  validate?: (payload: TexValidateRequest) => Promise<TexValidateResponse>;
}

export const handleTexAutoFix = async (
  request: TexAutoFixRequest,
  dependencies: HandleTexAutoFixDependencies = {},
): Promise<TexAutoFixResponse> => {
  if (request.sourceType !== "raw-latex") {
    throw new HttpError(400, "AI LaTeX fix is available only for raw LaTeX source.");
  }

  if (!request.latex.trim()) {
    throw new HttpError(400, "LaTeX source is required.");
  }

  assertTexCompilationAllowed({
    latex: request.latex,
    sourceType: request.sourceType,
  });

  if (!Array.isArray(request.diagnostics) || request.diagnostics.length === 0) {
    throw new HttpError(400, "At least one LaTeX diagnostic is required.");
  }

  const locale = resolveLocale(request.locale);
  const generateJson = dependencies.generateJson
    || ((payload: { model?: string; prompt: string; responseSchema: object }) =>
      generateStructuredJson<{ fixedLatex: string; rationale: string }>(payload));
  const validate = dependencies.validate || validateTex;
  const response = await generateJson({
    prompt: buildTexAutoFixPrompt(request, locale),
    responseSchema: texAutoFixResponseSchema,
  });

  if (!response.fixedLatex.trim()) {
    throw new HttpError(502, "Gemini returned an empty LaTeX fix.");
  }

  const validation = await validate({
    contentHash: randomUUID(),
    documentName: request.documentName,
    latex: response.fixedLatex,
    sourceType: request.sourceType,
  });

  if (!validation.ok) {
    const primaryError = validation.diagnostics.find((diagnostic) => diagnostic.severity === "error")?.message
      || validation.logSummary
      || "The generated LaTeX fix still failed XeLaTeX validation.";
    throw new HttpError(422, primaryError);
  }

  return {
    fixedLatex: response.fixedLatex,
    rationale: response.rationale.trim(),
    validation,
  };
};
