import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import { validateDocumentAst } from "@/lib/ast/validateDocumentAst";
import { buildDocumentDataFromDocsyFile, buildDocsyFileFromDocumentData } from "@/lib/docsy/fileFormat";
import type { DocumentData } from "@/types/document";

const roundTripDoc: JSONContent = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      attrs: { nodeId: "node-paragraph-1" },
      content: [
        { type: "text", text: "See " },
        { type: "crossReference", attrs: { nodeId: "node-cross-ref-1", targetLabel: "fig:system" } },
        { type: "text", text: " and note" },
        { type: "footnoteRef", attrs: { id: "fn-1", nodeId: "node-footnote-ref-1" } },
      ],
    },
    {
      type: "admonition",
      attrs: {
        nodeId: "node-admonition-1",
        type: "warning",
        title: "Check",
        color: "yellow",
        icon: "alert-triangle",
      },
      content: [
        {
          type: "paragraph",
          attrs: { nodeId: "node-paragraph-2" },
          content: [{ type: "text", text: "Important" }],
        },
      ],
    },
    {
      type: "image",
      attrs: {
        nodeId: "node-image-1",
        src: "https://example.com/diagram.png",
        width: 320,
        align: "center",
      },
    },
    {
      type: "figureCaption",
      attrs: {
        nodeId: "node-caption-1",
        captionType: "figure",
        label: "fig:system",
        captionText: "System diagram",
      },
    },
    {
      type: "footnoteItem",
      attrs: { id: "fn-1", text: "Footnote text", nodeId: "node-footnote-item-1" },
    },
  ],
};

describe("rich text .docsy round-trip", () => {
  it("preserves rich text tiptap state and produces a valid AST", () => {
    const input: DocumentData = {
      id: "doc-roundtrip-1",
      name: "Roundtrip",
      mode: "html",
      content: "<p>Roundtrip</p>",
      createdAt: 1,
      updatedAt: 2,
      sourceSnapshots: {
        html: "<p>Roundtrip</p>",
      },
      storageKind: "docsy",
      tiptapJson: roundTripDoc,
    };

    const restored = buildDocumentDataFromDocsyFile(buildDocsyFileFromDocumentData(input));

    expect(restored.tiptapJson).toEqual(roundTripDoc);
    expect(restored.ast).not.toBeNull();
    expect(validateDocumentAst(restored.ast!)).toMatchObject({ valid: true });
  });
});
