import { describe, expect, it, vi } from "vitest";
import { HttpError } from "../../server/modules/http/http";
import { handleTexAutoFix } from "../../server/modules/tex/autoFix";

describe("handleTexAutoFix", () => {
  it("rejects non-raw-latex requests", async () => {
    await expect(handleTexAutoFix({
      diagnostics: [{
        message: "Undefined control sequence.",
        severity: "error",
        stage: "compile",
      }],
      documentName: "Draft",
      latex: "\\badcommand",
      logSummary: "Undefined control sequence.",
      sourceType: "generated-latex",
    }, {
      generateJson: vi.fn(),
      validate: vi.fn(),
    })).rejects.toBeInstanceOf(HttpError);
  });

  it("returns the fixed latex only after validation succeeds", async () => {
    const generateJson = vi.fn().mockResolvedValue({
      fixedLatex: "\\section{Overview}\nFixed body.",
      rationale: "Closed a missing brace.",
    });
    const validate = vi.fn().mockResolvedValue({
      compileMs: 32,
      diagnostics: [],
      engine: "xelatex",
      logSummary: "ok",
      ok: true,
    });

    const result = await handleTexAutoFix({
      diagnostics: [{
        message: "Missing } inserted.",
        severity: "error",
        stage: "compile",
      }],
      documentName: "Draft",
      latex: "\\section{Overview\nBroken body.",
      logSummary: "Missing } inserted.",
      sourceType: "raw-latex",
    }, {
      generateJson,
      validate,
    });

    expect(generateJson).toHaveBeenCalled();
    expect(validate).toHaveBeenCalledWith(expect.objectContaining({
      documentName: "Draft",
      latex: "\\section{Overview}\nFixed body.",
      sourceType: "raw-latex",
    }));
    expect(result.validation.ok).toBe(true);
  });

  it("fails when the generated fix still does not compile", async () => {
    await expect(handleTexAutoFix({
      diagnostics: [{
        message: "Missing } inserted.",
        severity: "error",
        stage: "compile",
      }],
      documentName: "Draft",
      latex: "\\section{Overview\nBroken body.",
      logSummary: "Missing } inserted.",
      sourceType: "raw-latex",
    }, {
      generateJson: vi.fn().mockResolvedValue({
        fixedLatex: "\\section{Overview\nStill broken.",
        rationale: "Tried a minimal fix.",
      }),
      validate: vi.fn().mockResolvedValue({
        compileMs: 18,
        diagnostics: [{
          message: "Still broken",
          severity: "error",
          stage: "compile",
        }],
        engine: "xelatex",
        logSummary: "Still broken",
        ok: false,
      }),
    })).rejects.toMatchObject({
      statusCode: 422,
    });
  });
});
