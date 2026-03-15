import { describe, expect, it } from "vitest";
import {
  buildDocShareHash,
  DOC_SHARE_HASH_PREFIX,
  parseSharedDocumentFromHash,
} from "@/lib/share/docShare";
import { buildDocsyFileFromDocumentData, serializeDocsyFile } from "@/lib/docsy/fileFormat";
import type { DocumentData } from "@/types/document";
import type { DocumentAst } from "@/types/documentAst";

const createDocument = (content: string, overrides: Partial<DocumentData> = {}): DocumentData => ({
  ast: null,
  content,
  createdAt: 1,
  id: "doc-1",
  metadata: { title: "Shared doc" },
  mode: "markdown",
  name: "Shared doc",
  sourceSnapshots: { markdown: content },
  storageKind: "docsy",
  tiptapJson: null,
  updatedAt: 2,
  ...overrides,
});

const encodeBase64Url = (input: string) =>
  Buffer.from(new TextEncoder().encode(input))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

describe("docShare", () => {
  it("creates a share hash for a small document", () => {
    const hash = buildDocShareHash(createDocument("# Hello\n\nShared content"));

    expect(hash).not.toBeNull();
    expect(hash?.startsWith(DOC_SHARE_HASH_PREFIX)).toBe(true);
  });

  it("returns null when the serialized payload is too large", () => {
    const hash = buildDocShareHash(createDocument("A".repeat(10000)));

    expect(hash).toBeNull();
  });

  it("parses a shared document hash into a temporary document payload", () => {
    const hash = buildDocShareHash(createDocument("# Hello\n\nShared content"));

    if (!hash) {
      throw new Error("Expected a share hash.");
    }

    const parsed = parseSharedDocumentFromHash(hash);

    expect(parsed).not.toBeNull();
    expect(parsed?.id).not.toBe("doc-1");
    expect(parsed?.name).toContain("(Shared)");
    expect(parsed?.content).toContain("# Hello");
    expect(parsed?.metadata?.tags).toContain("shared");
  });

  it("ignores embedded tiptap payloads and rebuilds from the shared AST", () => {
    const safeAst: DocumentAst = {
      blocks: [{
        children: [{
          text: "Safe heading",
          type: "text",
        }],
        kind: "block",
        level: 1,
        nodeId: "heading-safe",
        type: "heading",
      }],
      nodeId: "doc-safe",
      type: "document",
    };
    const baseFile = buildDocsyFileFromDocumentData(createDocument("# Safe heading", {
      ast: safeAst,
      tiptapJson: {
        content: [{
          attrs: {
            code: 'flowchart LR\nA-->B\nclick A "javascript:alert(1)"',
          },
          type: "mermaidBlock",
        }],
        type: "doc",
      },
    }));
    const payload = serializeDocsyFile({
      ...baseFile,
      tiptap: {
        content: [{
          attrs: {
            code: 'flowchart LR\nA-->B\nclick A "javascript:alert(1)"',
          },
          type: "mermaidBlock",
        }],
        type: "doc",
      },
    });
    const hash = `${DOC_SHARE_HASH_PREFIX}${encodeBase64Url(payload)}`;

    const parsed = parseSharedDocumentFromHash(hash);

    expect(parsed?.content).toContain("Safe heading");
    expect(JSON.stringify(parsed?.tiptapJson)).not.toContain("javascript:alert(1)");
    expect(parsed?.tiptapJson).toEqual({
      content: [{
        attrs: {
          level: 1,
          nodeId: "heading-safe",
          textAlign: undefined,
        },
        content: [{
          text: "Safe heading",
          type: "text",
        }],
        type: "heading",
      }],
      type: "doc",
    });
  });
});
