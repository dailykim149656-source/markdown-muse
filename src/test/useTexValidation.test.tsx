import type { ReactNode } from "react";
import { renderHook } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nContext } from "@/i18n/I18nProvider";
import { useTexValidation } from "@/hooks/useTexValidation";

const getTexHealthMock = vi.fn();
const validateTexMock = vi.fn();
const previewTexMock = vi.fn();
const exportTexPdfMock = vi.fn();

vi.mock("@/lib/ai/texClient", () => ({
  exportTexPdf: (...args: unknown[]) => exportTexPdfMock(...args),
  getTexHealth: (...args: unknown[]) => getTexHealthMock(...args),
  previewTex: (...args: unknown[]) => previewTexMock(...args),
  validateTex: (...args: unknown[]) => validateTexMock(...args),
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

const flushAsyncValidation = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe("useTexValidation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getTexHealthMock.mockReset();
    validateTexMock.mockReset();
    previewTexMock.mockReset();
    exportTexPdfMock.mockReset();
    getTexHealthMock.mockResolvedValue({
      configured: true,
      engine: "xelatex",
      ok: true,
    });
    validateTexMock.mockResolvedValue({
      compileMs: 42,
      diagnostics: [],
      engine: "xelatex",
      logSummary: "ok",
      ok: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces background validation requests", async () => {
    renderHook(() => useTexValidation({
      documentName: "Draft",
      latexSource: "\\section{One}",
      mode: "latex",
    }), { wrapper });

    await act(async () => {
      vi.advanceTimersByTime(1490);
    });

    expect(validateTexMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(validateTexMock).toHaveBeenCalledTimes(1);
    expect(validateTexMock.mock.calls[0]?.[1]).toMatchObject({
      signal: expect.any(AbortSignal),
    });
    expect(previewTexMock).not.toHaveBeenCalled();
  });

  it("keeps the latest validation result when older requests resolve later", async () => {
    let resolveFirst: ((value: unknown) => void) | null = null;
    let resolveSecond: ((value: unknown) => void) | null = null;

    validateTexMock
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
    await flushAsyncValidation();

    rerender({
      latexSource: "\\section{Second}",
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    await flushAsyncValidation();

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
      });
      await Promise.resolve();
    });
    await flushAsyncValidation();

    await act(async () => {
      resolveSecond?.({
        compileMs: 12,
        diagnostics: [],
        engine: "xelatex",
        logSummary: "new",
        ok: true,
      });
      await Promise.resolve();
    });
    await flushAsyncValidation();

    expect(result.current.status).toBe("success");
    expect(result.current.logSummary).toBe("new");
    expect(result.current.diagnostics).toEqual([]);
  });

  it("keeps the last successful preview when a later compile fails", async () => {
    validateTexMock
      .mockResolvedValueOnce({
        compileMs: 11,
        diagnostics: [],
        engine: "xelatex",
        logSummary: "ok",
        ok: true,
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
      });

    previewTexMock
      .mockResolvedValueOnce({
        compileMs: 11,
        diagnostics: [],
        engine: "xelatex",
        logSummary: "ok",
        ok: true,
        previewExpiresAt: Date.now() + 900_000,
        previewUrl: "https://example.com/preview-1.pdf",
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
      });

    const { result, rerender } = renderHook((props: { latexSource: string }) => useTexValidation({
      documentName: "Draft",
      latexSource: props.latexSource,
      mode: "markdown",
    }), {
      initialProps: { latexSource: "\\section{A}" },
      wrapper,
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    await flushAsyncValidation();
    await flushAsyncValidation();

    expect(result.current.previewUrl).toBe("https://example.com/preview-1.pdf");

    rerender({ latexSource: "\\section{B}" });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    await flushAsyncValidation();

    expect(result.current.previewUrl).toBe("https://example.com/preview-1.pdf");
    expect(result.current.status).toBe("error");
  });
});
