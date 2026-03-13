import { describe, expect, it } from "vitest";
import { buildLiveAgentPatchSet } from "@/lib/ai/liveAgentPatchBuilder";
import { applyDocumentPatchSet } from "@/lib/ast/applyDocumentPatch";
import { renderAstToMarkdown } from "@/lib/ast/renderAstToMarkdown";
import type { DocumentAst } from "@/types/documentAst";

const applyAcceptedPatchSet = (document: DocumentAst, patchSet: ReturnType<typeof buildLiveAgentPatchSet>) =>
  applyDocumentPatchSet(document, {
    ...patchSet,
    patches: patchSet.patches.map((patch) => ({
      ...patch,
      status: "accepted" as const,
    })),
  }).document;

const baseDocument: DocumentAst = {
  blocks: [
    {
      children: [{ type: "text", text: "Overview" }],
      kind: "block",
      level: 1,
      nodeId: "heading-overview",
      type: "heading",
    },
    {
      children: [{ type: "text", text: "Old overview body." }],
      kind: "block",
      nodeId: "para-overview",
      type: "paragraph",
    },
    {
      children: [{ type: "text", text: "Details" }],
      kind: "block",
      level: 2,
      nodeId: "heading-details",
      type: "heading",
    },
    {
      children: [{ type: "text", text: "Current details body." }],
      kind: "block",
      nodeId: "para-details",
      type: "paragraph",
    },
  ],
  nodeId: "doc-1",
  type: "document",
};

describe("buildLiveAgentPatchSet", () => {
  it("replaces an existing section body", () => {
    const patchSet = buildLiveAgentPatchSet({
      documentAst: structuredClone(baseDocument),
      documentId: "doc-1",
      draft: {
        edits: [{
          kind: "replace_section",
          markdownBody: "Updated overview text.\n\nSecond paragraph.",
          rationale: "Refresh the overview.",
          targetHeadingNodeId: "heading-overview",
          targetHeadingTitle: "Overview",
        }],
        kind: "current_document",
      },
      patchSetId: "patch-set-1",
      title: "Update overview",
    });

    const nextDocument = applyAcceptedPatchSet(structuredClone(baseDocument), patchSet);
    const markdown = renderAstToMarkdown(nextDocument);

    expect(markdown).toContain("Updated overview text.");
    expect(markdown).toContain("Second paragraph.");
    expect(markdown).not.toContain("Old overview body.");
  });

  it("inserts a new section after an existing section", () => {
    const patchSet = buildLiveAgentPatchSet({
      documentAst: structuredClone(baseDocument),
      documentId: "doc-1",
      draft: {
        edits: [{
          kind: "insert_after_section",
          markdownBody: "Inserted notes for the new section.",
          newHeading: {
            level: 2,
            title: "Follow-up",
          },
          rationale: "Add a follow-up section.",
          targetHeadingNodeId: "heading-overview",
          targetHeadingTitle: "Overview",
        }],
        kind: "current_document",
      },
      patchSetId: "patch-set-2",
      title: "Insert follow-up",
    });

    const nextDocument = applyAcceptedPatchSet(structuredClone(baseDocument), patchSet);
    const markdown = renderAstToMarkdown(nextDocument);

    expect(markdown).toContain("## Follow-up");
    expect(markdown).toContain("Inserted notes for the new section.");
  });

  it("appends a new section at the end of the document", () => {
    const patchSet = buildLiveAgentPatchSet({
      documentAst: structuredClone(baseDocument),
      documentId: "doc-1",
      draft: {
        edits: [{
          kind: "append_section",
          markdownBody: "Release-ready summary.",
          newHeading: {
            level: 2,
            title: "Release",
          },
          rationale: "Add a closing release section.",
        }],
        kind: "current_document",
      },
      patchSetId: "patch-set-3",
      title: "Append release section",
    });

    const nextDocument = applyAcceptedPatchSet(structuredClone(baseDocument), patchSet);
    const markdown = renderAstToMarkdown(nextDocument);

    expect(markdown.trimEnd()).toMatch(/## Release[\s\S]*Release-ready summary\./);
  });

  it("fails when the target heading no longer exists", () => {
    expect(() => buildLiveAgentPatchSet({
      documentAst: structuredClone(baseDocument),
      documentId: "doc-1",
      draft: {
        edits: [{
          kind: "replace_section",
          markdownBody: "Updated body.",
          rationale: "Should fail.",
          targetHeadingNodeId: "missing-heading",
        }],
        kind: "current_document",
      },
      patchSetId: "patch-set-4",
      title: "Invalid target",
    })).toThrow(/missing-heading/);
  });
});
