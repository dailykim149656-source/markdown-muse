import type { ReactNode } from "react";
import { renderHook } from "@testing-library/react";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { I18nContext } from "@/i18n/I18nProvider";
import { useTexAutoFix } from "@/hooks/useTexAutoFix";

const fixTexCompileErrorMock = vi.fn();

vi.mock("@/lib/ai/texAutoFixClient", () => ({
  fixTexCompileError: (...args: unknown[]) => fixTexCompileErrorMock(...args),
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <I18nContext.Provider
    value={{
      locale: "en",
      setLocale: vi.fn(),
      t: (key: string) => key,
    }}
  >
    {children}
  </I18nContext.Provider>
);

describe("useTexAutoFix", () => {
  it("builds a document_text patch set from the AI response", async () => {
    fixTexCompileErrorMock.mockResolvedValueOnce({
      fixedLatex: "\\section{Overview}\nFixed body.",
      rationale: "Closed a missing brace.",
      validation: {
        compileMs: 40,
        diagnostics: [],
        engine: "xelatex",
        logSummary: "ok",
        ok: true,
      },
    });

    const { result } = renderHook(() => useTexAutoFix({
      diagnostics: [{
        line: 2,
        message: "Missing } inserted.",
        severity: "error",
        stage: "compile",
      }],
      documentId: "doc-1",
      documentName: "Draft",
      latexSource: "\\section{Overview}\nBroken body.",
      logSummary: "Missing } inserted.",
      sourceType: "raw-latex",
    }), { wrapper });

    let patchSet;

    await act(async () => {
      patchSet = await result.current.generatePatchSet();
    });

    expect(fixTexCompileErrorMock).toHaveBeenCalledWith(expect.objectContaining({
      documentName: "Draft",
      latex: "\\section{Overview}\nBroken body.",
      sourceType: "raw-latex",
    }));
    expect(patchSet).toEqual(expect.objectContaining({
      documentId: "doc-1",
      patches: [
        expect.objectContaining({
          operation: "replace_text_range",
          target: expect.objectContaining({
            targetType: "document_text",
          }),
        }),
      ],
      title: "hooks.ai.texAutoFixPatchSetTitle",
    }));
  });
});
