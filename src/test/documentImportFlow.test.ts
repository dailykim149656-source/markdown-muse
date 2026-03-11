import { describe, expect, it } from "vitest";
import { resolveImportedDocumentOptions } from "@/hooks/useDocumentIO";
import type { CreateDocumentOptions, DocumentData } from "@/types/document";

const createDocument = (overrides: Partial<DocumentData> = {}): DocumentData => ({
  content: "",
  createdAt: 1,
  id: "doc-1",
  metadata: {},
  mode: "markdown",
  name: "Untitled",
  sourceSnapshots: { markdown: "" },
  storageKind: "docsy",
  tiptapJson: null,
  updatedAt: 1,
  ...overrides,
});

const createImportedDocument = (overrides: Partial<CreateDocumentOptions> = {}): CreateDocumentOptions => ({
  content: "# Imported",
  id: "imported-doc",
  mode: "markdown",
  name: "Imported",
  sourceSnapshots: { markdown: "# Imported" },
  ...overrides,
});

describe("document import flow", () => {
  it("replaces the single blank draft when importing into an empty workspace", () => {
    const imported = resolveImportedDocumentOptions({
      activeDocId: "doc-1",
      documents: [createDocument()],
      importedDocument: createImportedDocument(),
    });

    expect(imported.replaceDocumentId).toBe("doc-1");
  });

  it("keeps existing documents intact when the active document already has content", () => {
    const imported = resolveImportedDocumentOptions({
      activeDocId: "doc-1",
      documents: [createDocument({
        content: "# Existing",
        name: "Existing",
        sourceSnapshots: { markdown: "# Existing" },
      })],
      importedDocument: createImportedDocument(),
    });

    expect(imported.replaceDocumentId).toBeUndefined();
  });

  it("still replaces a blank draft after the editor has attached empty ast and tiptap state", () => {
    const imported = resolveImportedDocumentOptions({
      activeDocId: "doc-1",
      documents: [createDocument({
        ast: {
          blocks: [],
          nodeId: "doc-1-root",
          type: "document",
        },
        tiptapJson: {
          content: [{ type: "paragraph" }],
          type: "doc",
        },
        sourceSnapshots: {
          html: "<p data-node-id=\"blk_0\"></p>",
          latex: "\n",
          markdown: "",
        },
      })],
      importedDocument: createImportedDocument(),
    });

    expect(imported.replaceDocumentId).toBe("doc-1");
  });

  it("replaces an existing imported document when the incoming docsy id already exists", () => {
    const imported = resolveImportedDocumentOptions({
      activeDocId: "doc-1",
      documents: [
        createDocument({ id: "doc-1", name: "Existing 1" }),
        createDocument({ id: "imported-doc", name: "Existing Imported" }),
      ],
      importedDocument: createImportedDocument(),
    });

    expect(imported.replaceDocumentId).toBe("imported-doc");
  });
});
