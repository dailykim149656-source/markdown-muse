import { describe, expect, it } from "vitest";
import { buildSummaryDocumentDraft } from "@/lib/ai/summaryDocument";

describe("buildSummaryDocumentDraft", () => {
  it("builds stable markdown with summary metadata and attributions", () => {
    const draft = buildSummaryDocumentDraft({
      createdAt: Date.parse("2026-03-16T00:00:00.000Z"),
      documentKind: "summary",
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

  it("builds a handover document using the handover structure", () => {
    const draft = buildSummaryDocumentDraft({
      createdAt: Date.parse("2026-03-16T00:00:00.000Z"),
      documentKind: "handover",
      locale: "en",
      objective: "Summarize the current document and prepare a handover.",
      sourceDocumentId: "doc-1",
      sourceDocumentName: "Release plan",
      summary: {
        attributions: [{
          chunkId: "chunk-1",
          ingestionId: "doc-1",
          rationale: "This chunk explains the rollback path.",
          sectionId: "sec-1",
        }],
        bulletPoints: ["Rollback steps are documented.", "Deployment assumptions are captured."],
        requestId: "req-1",
        summary: "The release plan highlights rollback and validation steps.",
      },
    });

    expect(draft.title).toBe("Release plan Handover Notes");
    expect(draft.markdown).toContain("# Release plan Handover Notes");
    expect(draft.markdown).toContain("## Context");
    expect(draft.markdown).toContain("## Current Architecture");
    expect(draft.markdown).toContain("- Rollback steps are documented.");
    expect(draft.markdown).toContain("## Open Issues");
    expect(draft.markdown).toContain("## Next Milestones");
    expect(draft.markdown).toContain("## Operational Notes");
    expect(draft.markdown).toContain("### Source attributions");
  });
});
