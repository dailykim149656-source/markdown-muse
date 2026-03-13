import { afterEach, describe, expect, it, vi } from "vitest";
import { summarizeAutosaveDiff } from "@/lib/ai/client";

describe("ai client", () => {
  afterEach(() => {
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
});
