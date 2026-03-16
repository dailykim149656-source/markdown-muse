import { mkdtemp, open, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { HttpError } from "../http/http";
import { assertTexCompilationAllowed } from "./security";
import { buildResumeSupportBlock, hasResumeLatexCommands } from "@/lib/latex/resumeSupport";
import { parseTexDiagnostics, summarizeTexLog } from "./diagnostics";
import type { TexDiagnostic, TexExportPdfRequest, TexPreviewRequest, TexValidateRequest } from "@/types/tex";

const COMPILE_TIMEOUT_MS = Number(process.env.TEX_COMPILE_TIMEOUT_MS || 15000);
const MAX_SOURCE_BYTES = Number(process.env.TEX_MAX_SOURCE_BYTES || 300_000);
const MAX_CONCURRENCY = Number(process.env.TEX_MAX_CONCURRENCY || 1);
const MAX_COMPILE_OUTPUT_BYTES = 64_000;
const MAX_LOG_TAIL_BYTES = 128_000;
type CompileMode = "export" | "preview" | "validate";

let activeCompilations = 0;
const waitingResolvers: Array<() => void> = [];

const acquireCompileSlot = async () => {
  if (activeCompilations < MAX_CONCURRENCY) {
    activeCompilations += 1;
    return;
  }

  await new Promise<void>((resolve) => waitingResolvers.push(resolve));
  activeCompilations += 1;
};

const releaseCompileSlot = () => {
  activeCompilations = Math.max(0, activeCompilations - 1);
  const next = waitingResolvers.shift();
  next?.();
};

const getLatexByteLength = (latex: string) => Buffer.byteLength(latex, "utf8");

const ensureLatexLength = (latex: string) => {
  const size = getLatexByteLength(latex);

  if (size === 0) {
    throw new HttpError(400, "LaTeX content is required.");
  }

  if (size > MAX_SOURCE_BYTES) {
    throw new HttpError(413, `LaTeX source exceeds ${MAX_SOURCE_BYTES} bytes.`);
  }
};

const buildWrappedLatexDocument = (latex: string, documentName?: string) => {
  const title = (documentName || "Untitled").replace(/[{}\\]/g, "").trim() || "Untitled";
  const usesResumeMacros = hasResumeLatexCommands(latex);
  return [
    "\\documentclass[11pt]{article}",
    "\\usepackage{amsmath}",
    "\\usepackage{amssymb}",
    ...(usesResumeMacros ? ["\\usepackage{enumitem}"] : []),
    "\\usepackage{graphicx}",
    "\\usepackage[hidelinks]{hyperref}",
    "\\usepackage{fontspec}",
    "\\usepackage{xeCJK}",
    "\\setmainfont{Noto Sans KR}",
    "\\setCJKmainfont{Noto Sans KR}",
    ...(usesResumeMacros ? [buildResumeSupportBlock()] : []),
    `\\title{${title}}`,
    "\\date{}",
    "\\begin{document}",
    latex,
    "\\end{document}",
  ].join("\n");
};

const normalizeCompileInput = (latex: string, documentName?: string) => {
  if (/\\documentclass(?:\[.*?\])?\{.+?\}/.test(latex) && /\\begin\{document\}/.test(latex)) {
    return latex;
  }

  return buildWrappedLatexDocument(latex, documentName);
};

const appendCappedText = (current: string, nextChunk: string, maxBytes: number) => {
  const combined = `${current}${nextChunk}`;
  const combinedBytes = Buffer.byteLength(combined, "utf8");

  if (combinedBytes <= maxBytes) {
    return combined;
  }

  return Buffer.from(combined, "utf8")
    .subarray(Math.max(0, combinedBytes - maxBytes))
    .toString("utf8");
};

const runCompileCommand = async (workdir: string) => {
  const command = "latexmk";
  const args = [
    "-xelatex",
    "-interaction=nonstopmode",
    "-halt-on-error",
    "-file-line-error",
    "-synctex=1",
    "document.tex",
  ];

  return new Promise<{ code: number | null; output: string }>((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    const child = spawn(command, args, {
      cwd: workdir,
      env: {
        ...process.env,
        max_print_line: "1000",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new HttpError(504, `TeX compilation timed out after ${COMPILE_TIMEOUT_MS}ms.`));
    }, COMPILE_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      stdout = appendCappedText(stdout, chunk.toString("utf8"), MAX_COMPILE_OUTPUT_BYTES);
    });

    child.stderr.on("data", (chunk) => {
      stderr = appendCappedText(stderr, chunk.toString("utf8"), MAX_COMPILE_OUTPUT_BYTES);
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(new HttpError(503, error.message));
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      resolve({
        code,
        output: `${stdout}\n${stderr}`.trim(),
      });
    });
  });
};

export interface CompileTexResult {
  compileMs: number;
  compileMode: CompileMode;
  diagnostics: TexDiagnostic[];
  latexBytes: number;
  logSummary: string;
  ok: boolean;
  pdfBytes: number;
  pdfBuffer?: Buffer;
}

const readLogOutput = async (workdir: string, fallbackOutput: string) => {
  try {
    const fileHandle = await open(join(workdir, "document.log"), "r");

    try {
      const stats = await fileHandle.stat();
      const bytesToRead = Math.min(stats.size, MAX_LOG_TAIL_BYTES);
      const buffer = Buffer.alloc(bytesToRead);

      await fileHandle.read(buffer, 0, bytesToRead, Math.max(0, stats.size - bytesToRead));
      const logText = buffer.toString("utf8").trim();
      return logText ? `${fallbackOutput}\n${logText}`.trim() : fallbackOutput;
    } finally {
      await fileHandle.close();
    }
  } catch {
    return fallbackOutput;
  }
};

const compileLatexDocument = async (
  latex: string,
  documentName: string | undefined,
  sourceType: TexValidateRequest["sourceType"],
  compileMode: CompileMode,
) => {
  ensureLatexLength(latex);
  assertTexCompilationAllowed({ latex, sourceType });
  await acquireCompileSlot();

  const startedAt = Date.now();
  const workdir = await mkdtemp(join(tmpdir(), "docsy-tex-"));
  const latexBytes = getLatexByteLength(latex);

  try {
    await writeFile(join(workdir, "document.tex"), normalizeCompileInput(latex, documentName), "utf8");
    const commandResult = await runCompileCommand(workdir);
    const fullLogOutput = await readLogOutput(workdir, commandResult.output);
    const diagnostics = parseTexDiagnostics(fullLogOutput);
    const shouldReadPdf = compileMode === "preview" || compileMode === "export";
    const pdfPath = join(workdir, "document.pdf");
    const pdfBuffer = shouldReadPdf
      ? await readFile(pdfPath).catch(() => null)
      : null;
    const ok = shouldReadPdf
      ? Boolean(pdfBuffer) && commandResult.code === 0
      : commandResult.code === 0;
    const compileMs = Date.now() - startedAt;

    return {
      compileMs,
      compileMode,
      diagnostics,
      latexBytes,
      logSummary: summarizeTexLog(fullLogOutput),
      ok,
      pdfBytes: pdfBuffer?.byteLength || 0,
      pdfBuffer: pdfBuffer || undefined,
    } satisfies CompileTexResult;
  } finally {
    releaseCompileSlot();
    await rm(workdir, { force: true, recursive: true }).catch(() => {});
  }
};

export const compileTexArtifact = ({
  documentName,
  latex,
  mode,
  sourceType,
}: {
  documentName?: string;
  latex: string;
  mode: CompileMode;
  sourceType: TexValidateRequest["sourceType"];
}) => compileLatexDocument(latex, documentName, sourceType, mode);

export const validateLatex = async (request: TexValidateRequest): Promise<CompileTexResult> => {
  const result = await compileLatexDocument(request.latex, request.documentName, request.sourceType, "validate");

  return {
    compileMs: result.compileMs,
    compileMode: result.compileMode,
    diagnostics: result.diagnostics,
    latexBytes: result.latexBytes,
    logSummary: result.logSummary,
    ok: result.ok,
    pdfBytes: result.pdfBytes,
  };
};

export const exportPdf = async (request: TexExportPdfRequest) => {
  const result = await compileTexArtifact({
    documentName: request.documentName,
    latex: request.latex,
    mode: "export",
    sourceType: request.sourceType,
  });

  if (!result.ok || !result.pdfBuffer) {
    const primaryError = result.diagnostics.find((diagnostic) => diagnostic.severity === "error")?.message || "XeLaTeX compilation failed.";
    throw new HttpError(422, primaryError);
  }

  return result;
};

export const previewLatex = async (request: TexPreviewRequest) => {
  return compileTexArtifact({
    documentName: request.documentName,
    latex: request.latex,
    mode: "preview",
    sourceType: request.sourceType,
  });
};

export const getTexToolingHealth = () => {
  const latexmk = spawnSync("latexmk", ["-v"], { encoding: "utf8" });
  const xelatex = spawnSync("xelatex", ["--version"], { encoding: "utf8" });

  return {
    configured: true,
    engine: "xelatex" as const,
    ok: latexmk.status === 0 && xelatex.status === 0,
  };
};
