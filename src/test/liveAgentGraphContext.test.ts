import { describe, expect, it } from "vitest";
import { buildLiveAgentGraphContext } from "@/lib/ai/liveAgentGraphContext";
import type { DocumentData } from "@/types/document";

const createMarkdownDocument = ({
  id,
  markdown,
  name,
}: {
  id: string;
  markdown: string;
  name: string;
}): DocumentData => ({
  content: markdown,
  createdAt: 1,
  id,
  mode: "markdown",
  name,
  sourceSnapshots: {
    markdown,
  },
  tiptapJson: null,
  updatedAt: 1,
});

describe("buildLiveAgentGraphContext", () => {
  it("builds workspace graph hints for the active document", () => {
    const documents = [
      createMarkdownDocument({
        id: "doc-1",
        markdown: "# Runbook\n\nSee [handover.md](handover.md).",
        name: "runbook",
      }),
      createMarkdownDocument({
        id: "doc-2",
        markdown: "# Handover\n\nOwner: TBD",
        name: "handover",
      }),
    ];

    const context = buildLiveAgentGraphContext({
      activeDocumentId: "doc-1",
      documents,
    });

    expect(context?.workspaceHints?.impactSummary.outboundReferenceCount).toBeGreaterThanOrEqual(1);
    expect(context?.workspaceHints?.relatedDocuments.some((document) => document.documentId === "doc-2")).toBe(true);
  });
});
