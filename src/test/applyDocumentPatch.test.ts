import { describe, expect, it } from "vitest";
import type { DocumentAst, ParagraphNode } from "@/types/documentAst";
import type { DocumentPatchSet } from "@/types/documentPatch";
import {
  applyDocumentPatch,
  applyDocumentPatchSet,
  computePatchNodeHash,
  extractAstNodeText,
  PatchApplicationError,
} from "@/lib/ast/applyDocumentPatch";

const createFixtureAst = (): DocumentAst => ({
  type: "document",
  nodeId: "doc-root",
  blocks: [
    {
      type: "heading",
      kind: "block",
      nodeId: "node-heading-1",
      level: 1,
      children: [{ type: "text", text: "Overview" }],
    },
    {
      type: "paragraph",
      kind: "block",
      nodeId: "node-paragraph-1",
      children: [{ type: "text", text: "Old intro text." }],
    },
    {
      type: "admonition",
      kind: "block",
      nodeId: "node-admonition-1",
      admonitionType: "warning",
      title: "Review",
      blocks: [
        {
          type: "paragraph",
          kind: "block",
          nodeId: "node-paragraph-2",
          children: [{ type: "text", text: "Check this section." }],
        },
      ],
    },
  ],
});

describe("applyDocumentPatch", () => {
  it("replaces text inside a text range target", () => {
    const document = createFixtureAst();

    const nextDocument = applyDocumentPatch(document, {
      patchId: "patch-1",
      title: "Update intro",
      operation: "replace_text_range",
      target: {
        targetType: "text_range",
        nodeId: "node-paragraph-1",
        startOffset: 0,
        endOffset: 3,
      },
      payload: {
        kind: "replace_text",
        text: "New",
      },
      author: "ai",
      status: "pending",
    });

    const paragraph = nextDocument.blocks[1] as ParagraphNode;
    expect(extractAstNodeText(paragraph)).toBe("New intro text.");
    expect(extractAstNodeText(document.blocks[1])).toBe("Old intro text.");
  });

  it("inserts a new block after a target node", () => {
    const document = createFixtureAst();

    const nextDocument = applyDocumentPatch(document, {
      patchId: "patch-2",
      title: "Add follow-up paragraph",
      operation: "insert_after",
      target: {
        targetType: "node",
        nodeId: "node-paragraph-1",
      },
      payload: {
        kind: "insert_nodes",
        nodes: [
          {
            type: "paragraph",
            kind: "block",
            nodeId: "node-paragraph-3",
            children: [{ type: "text", text: "Follow-up content." }],
          },
        ],
      },
      author: "ai",
      status: "pending",
    });

    expect(nextDocument.blocks[2].nodeId).toBe("node-paragraph-3");
    expect(extractAstNodeText(nextDocument.blocks[2])).toBe("Follow-up content.");
  });

  it("replaces and deletes block nodes", () => {
    const document = createFixtureAst();

    const replacedDocument = applyDocumentPatch(document, {
      patchId: "patch-3",
      title: "Replace admonition",
      operation: "replace_node",
      target: {
        targetType: "node",
        nodeId: "node-admonition-1",
      },
      payload: {
        kind: "replace_node",
        node: {
          type: "paragraph",
          kind: "block",
          nodeId: "node-paragraph-9",
          children: [{ type: "text", text: "Replacement paragraph." }],
        },
      },
      author: "ai",
      status: "pending",
    });

    expect(replacedDocument.blocks[2].nodeId).toBe("node-paragraph-9");

    const deletedDocument = applyDocumentPatch(replacedDocument, {
      patchId: "patch-4",
      title: "Delete replacement",
      operation: "delete_node",
      target: {
        targetType: "node",
        nodeId: "node-paragraph-9",
      },
      author: "ai",
      status: "pending",
    });

    expect(deletedDocument.blocks).toHaveLength(2);
    expect(deletedDocument.blocks.some((block) => block.nodeId === "node-paragraph-9")).toBe(false);
  });

  it("updates node attributes", () => {
    const document = createFixtureAst();

    const nextDocument = applyDocumentPatch(document, {
      patchId: "patch-5",
      title: "Center heading",
      operation: "update_attribute",
      target: {
        targetType: "attribute",
        nodeId: "node-heading-1",
        attributePath: "align",
      },
      payload: {
        kind: "update_attribute",
        value: "center",
      },
      author: "ai",
      status: "pending",
    });

    expect((nextDocument.blocks[0] as { align?: string }).align).toBe("center");
  });

  it("fails on unmet preconditions", () => {
    const document = createFixtureAst();

    expect(() =>
      applyDocumentPatch(document, {
        patchId: "patch-6",
        title: "Guarded update",
        operation: "replace_text_range",
        target: {
          targetType: "text_range",
          nodeId: "node-paragraph-1",
          startOffset: 0,
          endOffset: 3,
        },
        payload: {
          kind: "replace_text",
          text: "New",
        },
        precondition: {
          expectedText: "Different text",
        },
        author: "ai",
        status: "pending",
      }),
    ).toThrow(PatchApplicationError);

    expect(() =>
      applyDocumentPatch(document, {
        patchId: "patch-7",
        title: "Hash mismatch",
        operation: "delete_node",
        target: {
          targetType: "node",
          nodeId: "node-paragraph-1",
        },
        precondition: {
          expectedNodeHash: `${computePatchNodeHash(document.blocks[1])}-wrong`,
        },
        author: "ai",
        status: "pending",
      }),
    ).toThrow(/expectedNodeHash/);
  });
});

describe("applyDocumentPatchSet", () => {
  it("applies accepted and edited patches in order", () => {
    const document = createFixtureAst();
    const patchSet: DocumentPatchSet = {
      patchSetId: "set-1",
      documentId: "doc-1",
      title: "Patch set",
      author: "ai",
      status: "in_review",
      createdAt: Date.now(),
      patches: [
        {
          patchId: "patch-accepted",
          title: "Accepted intro change",
          operation: "replace_text_range",
          target: {
            targetType: "text_range",
            nodeId: "node-paragraph-1",
            startOffset: 0,
            endOffset: 3,
          },
          payload: {
            kind: "replace_text",
            text: "New",
          },
          author: "ai",
          status: "accepted",
        },
        {
          patchId: "patch-edited",
          title: "Edited insertion",
          operation: "insert_after",
          target: {
            targetType: "node",
            nodeId: "node-paragraph-1",
          },
          payload: {
            kind: "insert_nodes",
            nodes: [
              {
                type: "paragraph",
                kind: "block",
                nodeId: "node-paragraph-8",
                children: [{ type: "text", text: "Inserted after edit." }],
              },
            ],
          },
          author: "ai",
          status: "edited",
        },
        {
          patchId: "patch-pending",
          title: "Pending deletion",
          operation: "delete_node",
          target: {
            targetType: "node",
            nodeId: "node-admonition-1",
          },
          author: "ai",
          status: "pending",
        },
      ],
    };

    const result = applyDocumentPatchSet(document, patchSet);

    expect(result.appliedPatchIds).toEqual(["patch-accepted", "patch-edited"]);
    expect(result.failures).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(extractAstNodeText(result.document.blocks[1])).toBe("New intro text.");
    expect(result.document.blocks[2].nodeId).toBe("node-paragraph-8");
    expect(result.document.blocks.some((block) => block.nodeId === "node-admonition-1")).toBe(true);
  });

  it("can include pending patches when requested", () => {
    const document = createFixtureAst();
    const patchSet: DocumentPatchSet = {
      patchSetId: "set-2",
      documentId: "doc-1",
      title: "Patch set",
      author: "ai",
      status: "in_review",
      createdAt: Date.now(),
      patches: [
        {
          patchId: "patch-pending-delete",
          title: "Pending deletion",
          operation: "delete_node",
          target: {
            targetType: "node",
            nodeId: "node-admonition-1",
          },
          author: "ai",
          status: "pending",
        },
      ],
    };

    const result = applyDocumentPatchSet(document, patchSet, { includePending: true });

    expect(result.appliedPatchIds).toEqual(["patch-pending-delete"]);
    expect(result.document.blocks.some((block) => block.nodeId === "node-admonition-1")).toBe(false);
    expect(result.warnings).toEqual([]);
  });

  it("rejects patches that produce an invalid AST", () => {
    const document = createFixtureAst();
    const patchSet: DocumentPatchSet = {
      patchSetId: "set-3",
      documentId: "doc-1",
      title: "Invalid patch set",
      author: "ai",
      status: "in_review",
      createdAt: Date.now(),
      patches: [
        {
          patchId: "patch-invalid-insert",
          title: "Insert duplicate node id",
          operation: "insert_after",
          target: {
            targetType: "node",
            nodeId: "node-paragraph-1",
          },
          payload: {
            kind: "insert_nodes",
            nodes: [
              {
                type: "paragraph",
                kind: "block",
                nodeId: "node-paragraph-1",
                children: [{ type: "text", text: "Duplicate id content." }],
              },
            ],
          },
          author: "ai",
          status: "accepted",
        },
      ],
    };

    const result = applyDocumentPatchSet(document, patchSet);

    expect(result.appliedPatchIds).toEqual([]);
    expect(result.document).toEqual(document);
    expect(result.failures).toEqual([
      expect.objectContaining({
        patchId: "patch-invalid-insert",
      }),
    ]);
    expect(result.failures[0]?.message).toMatch(/invalid AST/i);
  });
});
