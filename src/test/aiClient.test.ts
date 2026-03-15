import { afterEach, describe, expect, it, vi } from "vitest";
import { summarizeAutosaveDiff } from "@/lib/ai/autosaveSummaryClient";
import { fixTexCompileError } from "@/lib/ai/texAutoFixClient";

describe("ai client", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("uses the local /api proxy without duplicating the api prefix", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({
      requestId: "req-1",
      summary: "Added an Audit section.",
    }), {
      headers: {
        "Content-Type": "application/json",
      },
      status: 200,
    }));

    await summarizeAutosaveDiff({
      comparison: {
        counts: {
          added: 1,
          changed: 0,
          inconsistent: 0,
          removed: 0,
        },
        deltas: [{
          afterExcerpt: "Enable audit logging.",
          kind: "added",
          summary: "Section \"Audit\" exists only in the target document.",
          title: "Audit",
        }],
      },
      document: {
        documentId: "doc-1",
        fileName: "Runbook",
        mode: "markdown",
      },
      locale: "en",
    });

    expect(fetchSpy).toHaveBeenCalledWith("/api/ai/autosave-diff-summary", expect.objectContaining({
      method: "POST",
    }));
  });

  it("posts AI LaTeX fixes to the dedicated endpoint", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({
      fixedLatex: "\\section{Overview}\nFixed body.",
      rationale: "Closed a missing brace.",
      validation: {
        compileMs: 21,
        diagnostics: [],
        engine: "xelatex",
        logSummary: "ok",
        ok: true,
      },
    }), {
      headers: {
        "Content-Type": "application/json",
      },
      status: 200,
    }));

    await fixTexCompileError({
      diagnostics: [{
        message: "Missing } inserted.",
        severity: "error",
        stage: "compile",
      }],
      documentName: "Draft",
      latex: "\\section{Overview\nBroken body.",
      logSummary: "Missing } inserted.",
      sourceType: "raw-latex",
    });

    expect(fetchSpy).toHaveBeenCalledWith("/api/ai/tex/fix", expect.objectContaining({
      method: "POST",
    }));
  });

  it("retries local AI requests while the dev server is still starting", async () => {
    vi.useFakeTimers();

    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        requestId: "req-2",
        summary: "Server became ready.",
      }), {
        headers: {
          "Content-Type": "application/json",
        },
        status: 200,
      }));

    const request = summarizeAutosaveDiff({
      comparison: {
        counts: {
          added: 1,
          changed: 0,
          inconsistent: 0,
          removed: 0,
        },
        deltas: [{
          afterExcerpt: "Enable audit logging.",
          kind: "added",
          summary: "Section \"Audit\" exists only in the target document.",
          title: "Audit",
        }],
      },
      document: {
        documentId: "doc-1",
        fileName: "Runbook",
        mode: "markdown",
      },
      locale: "en",
    });

    await vi.runAllTimersAsync();

    await expect(request).resolves.toEqual({
      requestId: "req-2",
      summary: "Server became ready.",
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
