import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import {
  buildDocumentDataFromDocsyFile,
  buildDocsyFileFromDocumentData,
  parseDocsyFile,
  serializeDocsyFile,
} from "@/lib/docsy/fileFormat";
import type { DocumentData } from "@/types/document";

const richTextTiptapDoc: JSONContent = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1, nodeId: "node-heading-1" },
      content: [{ type: "text", text: "Docsy Title" }],
    },
    {
      type: "paragraph",
      attrs: { nodeId: "node-paragraph-1", textAlign: "center" },
      content: [
        { type: "text", text: "Formula " },
        { type: "math", attrs: { latex: "e^{i\\pi}+1=0", display: "inline", nodeId: "node-math-1" } },
      ],
    },
  ],
};

describe("docsy file format", () => {
  it("serializes and parses a rich text .docsy envelope", () => {
    const document: DocumentData = {
      id: "doc-1",
      name: "Spec",
      mode: "markdown",
      content: "# Docsy Title\n",
      createdAt: 1,
      updatedAt: 2,
      metadata: { tags: ["spec"] },
      sourceSnapshots: {
        markdown: "# Docsy Title\n",
      },
      storageKind: "docsy",
      tiptapJson: richTextTiptapDoc,
    };

    const envelope = buildDocsyFileFromDocumentData(document);
    const reparsed = parseDocsyFile(serializeDocsyFile(envelope));
    const restored = buildDocumentDataFromDocsyFile(reparsed);

    expect(reparsed.format).toBe("docsy");
    expect(reparsed.version).toBe("1.0");
    expect(reparsed.document.kind).toBe("rich_text");
    expect(restored.name).toBe("Spec");
    expect(restored.mode).toBe("markdown");
    expect(restored.tiptapJson).toEqual(richTextTiptapDoc);
    expect(restored.sourceSnapshots?.markdown).toBe("# Docsy Title\n\nFormula $e^{i\\pi}+1=0$\n");
  });

  it("wraps structured documents without losing the raw source snapshot", () => {
    const document: DocumentData = {
      id: "doc-json-1",
      name: "Config",
      mode: "json",
      content: '{\n  "enabled": true\n}',
      createdAt: 10,
      updatedAt: 20,
      sourceSnapshots: {
        json: '{\n  "enabled": true\n}',
      },
      storageKind: "docsy",
      tiptapJson: null,
      ast: null,
    };

    const restored = buildDocumentDataFromDocsyFile(buildDocsyFileFromDocumentData(document));

    expect(restored.mode).toBe("json");
    expect(restored.content).toBe(document.content);
    expect(restored.sourceSnapshots?.json).toBe(document.content);
  });
});
