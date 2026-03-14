import { describe, expect, it } from "vitest";
import {
  assertTexCompilationAllowed,
  findRestrictedTexPrimitive,
  isFullLatexDocument,
} from "../../server/modules/tex/security";

describe("tex security", () => {
  it("allows safe generated and raw fragment latex", () => {
    expect(() => assertTexCompilationAllowed({
      latex: "\\section{Overview}\nBody content.",
      sourceType: "generated-latex",
    })).not.toThrow();

    expect(() => assertTexCompilationAllowed({
      latex: "\\resumeProject{Docsy}{Secure preview path}",
      sourceType: "raw-latex",
    })).not.toThrow();
  });

  it("rejects restricted file and package primitives", () => {
    expect(findRestrictedTexPrimitive("\\input{secret.tex}")).toBe("\\input");

    expect(() => assertTexCompilationAllowed({
      latex: "\\includegraphics{secret.png}",
      sourceType: "raw-latex",
    })).toThrow(/restricted command/i);
  });

  it("rejects full raw latex documents unless explicitly enabled", () => {
    const fullDocument = "\\documentclass{article}\n\\begin{document}\nHi\n\\end{document}";

    expect(isFullLatexDocument(fullDocument)).toBe(true);
    expect(() => assertTexCompilationAllowed({
      env: {
        TEX_ALLOW_RAW_DOCUMENT: "false",
      },
      latex: fullDocument,
      sourceType: "raw-latex",
    })).toThrow(/disabled for this deployment/i);

    expect(() => assertTexCompilationAllowed({
      env: {
        TEX_ALLOW_RAW_DOCUMENT: "true",
      },
      latex: fullDocument,
      sourceType: "raw-latex",
    })).not.toThrow();
  });
});
