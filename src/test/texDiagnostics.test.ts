import { describe, expect, it } from "vitest";
import { parseTexDiagnostics, summarizeTexLog } from "../../server/modules/tex/diagnostics";

describe("parseTexDiagnostics", () => {
  it("extracts line-based errors and warnings", () => {
    const diagnostics = parseTexDiagnostics(`
./document.tex:12: Undefined control sequence.
LaTeX Warning: Label(s) may have changed. Rerun to get cross-references right.
! Emergency stop.
    `.trim());

    expect(diagnostics).toEqual([
      {
        line: 12,
        message: "Undefined control sequence.",
        severity: "error",
        stage: "compile",
      },
      {
        message: "Label(s) may have changed. Rerun to get cross-references right.",
        severity: "warning",
        stage: "latexmk",
      },
      {
        message: "Emergency stop.",
        severity: "error",
        stage: "compile",
      },
    ]);
  });

  it("summarizes the most relevant log lines", () => {
    expect(summarizeTexLog(`
This is XeTeX, Version 3.141592653
Latexmk: applying rule 'xelatex'
./document.tex:7: Missing $ inserted.
LaTeX Warning: Citation 'foo' undefined.
    `.trim())).toContain("Missing $ inserted.");
  });
});
