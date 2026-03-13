import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { HttpError } from "../http/http";
import { parseTexDiagnostics, summarizeTexLog } from "./diagnostics";
import type { TexDiagnostic, TexExportPdfRequest, TexPreviewRequest, TexValidateRequest } from "@/types/tex";

const COMPILE_TIMEOUT_MS = Number(process.env.TEX_COMPILE_TIMEOUT_MS || 15000);
const MAX_SOURCE_BYTES = Number(process.env.TEX_MAX_SOURCE_BYTES || 300_000);
const MAX_CONCURRENCY = Number(process.env.TEX_MAX_CONCURRENCY || 2);

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

const ensureLatexLength = (latex: string) => {
  const size = Buffer.byteLength(latex, "utf8");

  if (size === 0) {
    throw new HttpError(400, "LaTeX content is required.");
  }

  if (size > MAX_SOURCE_BYTES) {
    throw new HttpError(413, `LaTeX source exceeds ${MAX_SOURCE_BYTES} bytes.`);
  }
};

const buildWrappedLatexDocument = (latex: string, documentName?: string) => {
  const title = (documentName || "Untitled").replace(/[{}\\]/g, "").trim() || "Untitled";
  return [
    "\\documentclass[11pt]{article}",
    "\\usepackage{amsmath}",
    "\\usepackage{amssymb}",
    "\\usepackage{graphicx}",
    "\\usepackage[hidelinks]{hyperref}",
    "\\usepackage{fontspec}",
    "\\usepackage{xeCJK}",
    "\\setmainfont{Noto Sans KR}",
    "\\setCJKmainfont{Noto Sans KR}",
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
      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
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
  diagnostics: TexDiagnostic[];
  logSummary: string;
  ok: boolean;
  pdfBuffer?: Buffer;
}

const readLogOutput = async (workdir: string, fallbackOutput: string) => {
  try {
    const logBuffer = await readFile(join(workdir, "document.log"));
    const logText = logBuffer.toString("utf8").trim();
    return logText ? `${fallbackOutput}\n${logText}`.trim() : fallbackOutput;
  } catch {
    return fallbackOutput;
  }
};

const compileLatexDocument = async (latex: string, documentName?: string) => {
  ensureLatexLength(latex);
  await acquireCompileSlot();

  const startedAt = Date.now();
  const workdir = await mkdtemp(join(tmpdir(), "docsy-tex-"));

  try {
    await writeFile(join(workdir, "document.tex"), normalizeCompileInput(latex, documentName), "utf8");
    const commandResult = await runCompileCommand(workdir);
    const fullLogOutput = await readLogOutput(workdir, commandResult.output);
    const diagnostics = parseTexDiagnostics(fullLogOutput);
    const pdfPath = join(workdir, "document.pdf");
    const pdfBuffer = await readFile(pdfPath).catch(() => null);
    const ok = Boolean(pdfBuffer) && commandResult.code === 0;
    const compileMs = Date.now() - startedAt;

    return {
      compileMs,
      diagnostics,
      logSummary: summarizeTexLog(fullLogOutput),
      ok,
      pdfBuffer: pdfBuffer || undefined,
    } satisfies CompileTexResult;
  } finally {
    releaseCompileSlot();
    await rm(workdir, { force: true, recursive: true }).catch(() => {});
  }
};

export const validateLatex = async (request: TexValidateRequest): Promise<CompileTexResult> => {
  const result = await compileLatexDocument(request.latex, request.documentName);

  return {
    compileMs: result.compileMs,
    diagnostics: result.diagnostics,
    logSummary: result.logSummary,
    ok: result.ok,
  };
};

export const exportPdf = async (request: TexExportPdfRequest) => {
  const result = await compileLatexDocument(request.latex, request.documentName);

  if (!result.ok || !result.pdfBuffer) {
    const primaryError = result.diagnostics.find((diagnostic) => diagnostic.severity === "error")?.message || "XeLaTeX compilation failed.";
    throw new HttpError(422, primaryError);
  }

  return result;
};

export const previewLatex = async (request: TexPreviewRequest) => {
  const result = await compileLatexDocument(request.latex, request.documentName);

  return {
    compileMs: result.compileMs,
    diagnostics: result.diagnostics,
    logSummary: result.logSummary,
    ok: result.ok,
    pdfBase64: result.ok && result.pdfBuffer
      ? result.pdfBuffer.toString("base64")
      : undefined,
  };
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
