import { describe, expect, it } from "vitest";
import type { DocumentPatchSet } from "@/types/documentPatch";
import {
  applyPatchDecision,
  applyPatchDecisions,
  canApplyEditedSuggestedText,
} from "@/lib/patches/reviewPatchSet";

const patchSetFixture: DocumentPatchSet = {
  patchSetId: "set-1",
  documentId: "doc-1",
  title: "Patch review",
  author: "ai",
  status: "in_review",
  createdAt: Date.now(),
  patches: [
    {
      patchId: "patch-text",
      title: "Edit intro",
      operation: "replace_text_range",
      target: { targetType: "text_range", nodeId: "node-paragraph-1", startOffset: 0, endOffset: 8 },
      suggestedText: "New intro",
      payload: { kind: "replace_text", text: "New intro" },
      author: "ai",
      status: "pending",
    },
    {
      patchId: "patch-insert",
      title: "Insert paragraph",
      operation: "insert_after",
      target: { targetType: "node", nodeId: "node-paragraph-1" },
      suggestedText: "Inserted paragraph",
      payload: {
        kind: "insert_nodes",
        nodes: [
          {
            type: "paragraph",
            kind: "block",
            nodeId: "node-paragraph-9",
            children: [{ type: "text", text: "Inserted paragraph" }],
          },
        ],
      },
      author: "ai",
      status: "pending",
    },
    {
      patchId: "patch-delete",
      title: "Delete node",
      operation: "delete_node",
      target: { targetType: "node", nodeId: "node-paragraph-3" },
      author: "ai",
      status: "pending",
    },
  ],
};

describe("reviewPatchSet", () => {
  it("updates patch payload when an edited text suggestion is saved", () => {
    const result = applyPatchDecision(patchSetFixture, {
      patchId: "patch-text",
      decision: "edited",
      editedSuggestedText: "Edited intro",
      decidedAt: Date.now(),
    });

    const patch = result.patchSet.patches[0];

    expect(result.warnings).toEqual([]);
    expect(patch.status).toBe("edited");
    expect(patch.suggestedText).toBe("Edited intro");
    expect(patch.payload).toEqual({ kind: "replace_text", text: "Edited intro" });
  });

  it("rewrites simple insert payloads from edited suggestion text", () => {
    const result = applyPatchDecision(patchSetFixture, {
      patchId: "patch-insert",
      decision: "edited",
      editedSuggestedText: "Edited inserted paragraph",
      decidedAt: Date.now(),
    });

    const patch = result.patchSet.patches[1];

    expect(result.warnings).toEqual([]);
    expect(patch.status).toBe("edited");
    expect(patch.suggestedText).toBe("Edited inserted paragraph");
    expect(patch.payload?.kind).toBe("insert_nodes");
    if (patch.payload?.kind === "insert_nodes") {
      expect(patch.payload.nodes[0]).toMatchObject({
        type: "paragraph",
        children: [{ type: "text", text: "Edited inserted paragraph" }],
      });
    }
  });

  it("applies multiple decisions and reports unknown patch ids", () => {
    const result = applyPatchDecisions(patchSetFixture, [
      {
        patchId: "patch-text",
        decision: "accepted",
        decidedAt: Date.now(),
      },
      {
        patchId: "missing-patch",
        decision: "rejected",
        decidedAt: Date.now(),
      },
    ]);

    expect(result.patchSet.patches[0].status).toBe("accepted");
    expect(result.warnings).toEqual([
      {
        patchId: "missing-patch",
        message: "Patch decision referenced an unknown patch id.",
      },
    ]);
  });

  it("detects whether edited suggested text can be mapped back into payload", () => {
    expect(canApplyEditedSuggestedText(patchSetFixture.patches[0])).toBe(true);
    expect(canApplyEditedSuggestedText(patchSetFixture.patches[1])).toBe(true);
    expect(canApplyEditedSuggestedText(patchSetFixture.patches[2])).toBe(false);
  });
});
