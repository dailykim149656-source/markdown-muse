import { describe, expect, it } from "vitest";
import { buildSummaryDocumentDraft } from "@/lib/ai/summaryDocument";

describe("buildSummaryDocumentDraft", () => {
  it("builds stable markdown with summary metadata and attributions", () => {
    const draft = buildSummaryDocumentDraft({
      createdAt: Date.parse("2026-03-16T00:00:00.000Z"),
      locale: "en",
      objective: "Summarize the rollout risks.",
      sourceDocumentId: "doc-1",
      sourceDocumentName: "Release plan",
      summary: {
        attributions: [{
          chunkId: "chunk-1",
          ingestionId: "doc-1",
          rationale: "This chunk explains the rollback path.",
          sectionId: "sec-1",
        }],
        bulletPoints: ["Rollback steps are documented."],
        requestId: "req-1",
        summary: "The release plan highlights rollback and validation steps.",
      },
    });

    expect(draft.title).toBe("Release plan Summary");
    expect(draft.markdown).toContain("# Release plan Summary");
    expect(draft.markdown).toContain("Generated at: 2026-03-16T00:00:00.000Z");
    expect(draft.markdown).toContain("Objective: Summarize the rollout risks.");
    expect(draft.markdown).toContain("## Summary");
    expect(draft.markdown).toContain("## Key points");
    expect(draft.markdown).toContain("## Source attributions");
    expect(draft.markdown).toContain("`doc-1` / `chunk-1`");
  });
});
