import { HttpError } from "../http/http";
import type { TexSourceType } from "@/types/tex";

const FULL_DOCUMENT_PATTERN = /\\documentclass(?:\[[^\]]*\])?\{[^}]+\}|\\begin\{document\}|\\end\{document\}/i;
const RESTRICTED_COMMAND_PATTERNS = [
  /\\documentclass\b/i,
  /\\usepackage\b/i,
  /\\input\b/i,
  /\\include\b/i,
  /\\openin\b/i,
  /\\openout\b/i,
  /\\read\b/i,
  /\\write(?:18)?\b/i,
  /\\catcode\b/i,
  /\\includegraphics\b/i,
  /\\lstinputlisting\b/i,
  /\\verbatiminput\b/i,
];

export const isRawDocumentCompilationAllowed = (env = process.env) =>
  env.TEX_ALLOW_RAW_DOCUMENT?.trim().toLowerCase() === "true";

export const isFullLatexDocument = (latex: string) => FULL_DOCUMENT_PATTERN.test(latex);

export const findRestrictedTexPrimitive = (latex: string) =>
  RESTRICTED_COMMAND_PATTERNS
    .map((pattern) => latex.match(pattern)?.[0] || null)
    .find((match): match is string => Boolean(match))
    || null;

export const assertTexCompilationAllowed = ({
  env = process.env,
  latex,
  sourceType,
}: {
  env?: NodeJS.ProcessEnv;
  latex: string;
  sourceType: TexSourceType;
}) => {
  if (isRawDocumentCompilationAllowed(env)) {
    return;
  }

  if (sourceType === "raw-latex" && isFullLatexDocument(latex)) {
    throw new HttpError(
      400,
      "Raw LaTeX document compilation is disabled for this deployment. Submit document body content instead of a full preamble/document wrapper.",
    );
  }

  const restrictedPrimitive = findRestrictedTexPrimitive(latex);

  if (restrictedPrimitive) {
    throw new HttpError(
      400,
      `LaTeX source uses restricted command "${restrictedPrimitive}". Remove file, package, or process primitives before compiling.`,
    );
  }
};
