import type { ReactNode } from "react";
import { renderHook } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nContext } from "@/i18n/I18nProvider";
import { useTexValidation } from "@/hooks/useTexValidation";

const getTexHealthMock = vi.fn();
const previewTexMock = vi.fn();
const exportTexPdfMock = vi.fn();

vi.mock("@/lib/ai/client", () => ({
  exportTexPdf: (...args: unknown[]) => exportTexPdfMock(...args),
  getTexHealth: (...args: unknown[]) => getTexHealthMock(...args),
  previewTex: (...args: unknown[]) => previewTexMock(...args),
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <I18nContext.Provider
    value={{
      locale: "en",
      setLocale: vi.fn(),
      t: (key, vars) => typeof vars?.value !== "undefined" ? `${key}:${vars.value}` : key,
    }}
  >
    {children}
  </I18nContext.Provider>
);

describe("useTexValidation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getTexHealthMock.mockReset();
    previewTexMock.mockReset();
    exportTexPdfMock.mockReset();
    getTexHealthMock.mockResolvedValue({
      configured: true,
      engine: "xelatex",
      ok: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces background validation requests", async () => {
    previewTexMock.mockResolvedValue({
      compileMs: 42,
      diagnostics: [],
      engine: "xelatex",
      logSummary: "ok",
      ok: true,
      pdfBase64: undefined,
    });

    renderHook(() => useTexValidation({
      documentName: "Draft",
      latexSource: "\\section{One}",
      mode: "latex",
    }), { wrapper });

    await act(async () => {
      vi.advanceTimersByTime(1490);
    });

    expect(previewTexMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(previewTexMock).toHaveBeenCalledTimes(1);
    expect(previewTexMock.mock.calls[0]?.[1]).toMatchObject({
      signal: expect.any(AbortSignal),
    });
  });

  it("keeps the latest validation result when older requests resolve later", async () => {
    let resolveFirst: ((value: unknown) => void) | null = null;
    let resolveSecond: ((value: unknown) => void) | null = null;

    previewTexMock
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveFirst = resolve;
      }))
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveSecond = resolve;
      }));

    const { result, rerender } = renderHook((props: { latexSource: string }) => useTexValidation({
      documentName: "Draft",
      latexSource: props.latexSource,
      mode: "latex",
    }), {
      initialProps: {
        latexSource: "\\section{First}",
      },
      wrapper,
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    rerender({
      latexSource: "\\section{Second}",
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    await act(async () => {
      resolveFirst?.({
        compileMs: 10,
        diagnostics: [{
          message: "Old error",
          severity: "error",
          stage: "compile",
        }],
        engine: "xelatex",
        logSummary: "old",
        ok: false,
        pdfBase64: undefined,
      });
      await Promise.resolve();
    });

    await act(async () => {
      resolveSecond?.({
        compileMs: 12,
        diagnostics: [],
        engine: "xelatex",
        logSummary: "new",
        ok: true,
        pdfBase64: undefined,
      });
      await Promise.resolve();
    });

    expect(result.current.status).toBe("success");
    expect(result.current.logSummary).toBe("new");
    expect(result.current.diagnostics).toEqual([]);
  });

  it("keeps the last successful preview when a later compile fails", async () => {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn().mockReturnValue("blob:preview-1"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });

    previewTexMock
      .mockResolvedValueOnce({
        compileMs: 11,
        diagnostics: [],
        engine: "xelatex",
        logSummary: "ok",
        ok: true,
        pdfBase64: btoa("%PDF-1.7"),
      })
      .mockResolvedValueOnce({
        compileMs: 13,
        diagnostics: [{
          message: "Compile error",
          severity: "error",
          stage: "compile",
        }],
        engine: "xelatex",
        logSummary: "failed",
        ok: false,
        pdfBase64: undefined,
      });

    const { result, rerender } = renderHook((props: { latexSource: string }) => useTexValidation({
      documentName: "Draft",
      latexSource: props.latexSource,
      mode: "latex",
    }), {
      initialProps: { latexSource: "\\section{A}" },
      wrapper,
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(result.current.previewUrl).toBe("blob:preview-1");

    rerender({ latexSource: "\\section{B}" });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(result.current.previewUrl).toBe("blob:preview-1");
    expect(result.current.status).toBe("error");
  });
});
