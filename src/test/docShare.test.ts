import { describe, expect, it } from "vitest";
import {
  buildDocShareHash,
  DOC_SHARE_HASH_PREFIX,
  parseSharedDocumentFromHash,
} from "@/lib/share/docShare";
import type { DocumentData } from "@/types/document";

const createDocument = (content: string): DocumentData => ({
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
});

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
});
