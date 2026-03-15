import type { TexDiagnostic } from "@/types/tex";

const MAX_LOG_SUMMARY_LENGTH = 1600;

const pushDiagnostic = (
  diagnostics: TexDiagnostic[],
  nextDiagnostic: TexDiagnostic,
  dedupeKeys: Set<string>,
) => {
  const key = `${nextDiagnostic.severity}:${nextDiagnostic.stage}:${nextDiagnostic.line || 0}:${nextDiagnostic.message}`;

  if (dedupeKeys.has(key)) {
    return;
  }

  dedupeKeys.add(key);
  diagnostics.push(nextDiagnostic);
};

export const parseTexDiagnostics = (logOutput: string): TexDiagnostic[] => {
  const diagnostics: TexDiagnostic[] = [];
  const dedupeKeys = new Set<string>();
  const lines = logOutput.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    const fileLineMatch = line.match(/^(?:\.\/*)?[^:]+:(\d+):\s*(.+)$/);
    if (fileLineMatch) {
      pushDiagnostic(diagnostics, {
        line: Number(fileLineMatch[1]),
        message: fileLineMatch[2].trim(),
        severity: /warning/i.test(fileLineMatch[2]) ? "warning" : "error",
        stage: "compile",
      }, dedupeKeys);
      continue;
    }

    const latexWarningMatch = line.match(/^(?:LaTeX|Package)(?:\s+.+?)?\s+Warning:\s*(.+)$/i);
    if (latexWarningMatch) {
      pushDiagnostic(diagnostics, {
        message: latexWarningMatch[1].trim(),
        severity: "warning",
        stage: "latexmk",
      }, dedupeKeys);
      continue;
    }

    if (/^! /.test(line)) {
      pushDiagnostic(diagnostics, {
        message: line.replace(/^!\s*/, "").trim(),
        severity: "error",
        stage: "compile",
      }, dedupeKeys);
    }
  }

  return diagnostics;
};

export const summarizeTexLog = (logOutput: string) => {
  const trimmed = logOutput.trim();

  if (!trimmed) {
    return "No compiler output.";
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^This is XeTeX/i.test(line))
    .filter((line) => !/^Latexmk:/i.test(line) || /warning|error|failed|successfully/i.test(line))
    .slice(0, 12);

  const summary = lines.join("\n");

  return summary.length > MAX_LOG_SUMMARY_LENGTH
    ? `${summary.slice(0, MAX_LOG_SUMMARY_LENGTH - 1)}…`
    : summary;
};
