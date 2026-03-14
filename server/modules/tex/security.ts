import { HttpError } from "../http/http";
import type { TexSourceType } from "@/types/tex";

const FULL_DOCUMENT_PATTERN = /\\documentclass(?:\[[^\]]*\])?\{[^}]+\}|\\begin\{document\}|\\end\{document\}/i;
const USE_PACKAGE_PATTERN = /\\usepackage(?:\[[^\]]*\])?\{([^}]+)\}/gi;
const RESTRICTED_COMMAND_PATTERNS = [
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
const DEFAULT_ALLOWED_TEX_PACKAGES = [
  "amsmath",
  "amssymb",
  "amsthm",
  "array",
  "booktabs",
  "caption",
  "enumitem",
  "etoolbox",
  "fancyhdr",
  "float",
  "fontspec",
  "geometry",
  "graphicx",
  "hyperref",
  "inputenc",
  "listings",
  "latexsym",
  "longtable",
  "makecell",
  "mathtools",
  "multirow",
  "setspace",
  "soul",
  "tabularx",
  "tcolorbox",
  "titlesec",
  "ulem",
  "xcolor",
  "xeCJK",
];

export const isRawDocumentCompilationAllowed = (env = process.env) =>
  env.TEX_ALLOW_RAW_DOCUMENT?.trim().toLowerCase() === "true";

export const isRestrictedTexCommandsAllowed = (env = process.env) =>
  env.TEX_ALLOW_RESTRICTED_COMMANDS?.trim().toLowerCase() === "true";

export const isFullLatexDocument = (latex: string) => FULL_DOCUMENT_PATTERN.test(latex);

export const getAllowedTexPackages = (env = process.env) => {
  const configured = env.TEX_ALLOWED_PACKAGES?.trim();

  if (!configured) {
    return new Set(DEFAULT_ALLOWED_TEX_PACKAGES);
  }

  return new Set(
    configured
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
};

export const extractRequestedTexPackages = (latex: string) => {
  const requestedPackages = new Set<string>();

  for (const match of latex.matchAll(USE_PACKAGE_PATTERN)) {
    const packageGroup = match[1] || "";

    packageGroup
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .forEach((packageName) => requestedPackages.add(packageName));
  }

  return [...requestedPackages];
};

export const findDisallowedTexPackage = (latex: string, env = process.env) => {
  const allowedPackages = getAllowedTexPackages(env);
  return extractRequestedTexPackages(latex).find((packageName) => !allowedPackages.has(packageName)) || null;
};

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
  if (sourceType === "raw-latex" && isFullLatexDocument(latex) && !isRawDocumentCompilationAllowed(env)) {
    throw new HttpError(
      400,
      "Raw LaTeX document compilation is disabled for this deployment. Submit document body content instead of a full preamble/document wrapper.",
    );
  }

  if (isRestrictedTexCommandsAllowed(env)) {
    return;
  }

  const disallowedPackage = findDisallowedTexPackage(latex, env);

  if (disallowedPackage) {
    throw new HttpError(
      400,
      `LaTeX source requests package "${disallowedPackage}", which is not on the allowed package list for this deployment.`,
    );
  }

  const restrictedPrimitive = findRestrictedTexPrimitive(latex);

  if (restrictedPrimitive) {
    throw new HttpError(
      400,
      `LaTeX source uses restricted command "${restrictedPrimitive}". Remove file or process primitives before compiling, or explicitly allow restricted commands in a trusted environment.`,
    );
  }
};
