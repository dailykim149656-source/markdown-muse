import { describe, expect, it } from "vitest";
import { buildDocumentPerformanceProfile } from "@/lib/documents/documentPerformanceProfile";
import type { DocumentData } from "@/types/document";

const createDocument = (content: string, overrides: Partial<DocumentData> = {}): DocumentData => ({
  ast: null,
  content,
  createdAt: 1,
  id: overrides.id || "doc-1",
  metadata: {},
  mode: "markdown",
  name: "Document",
  sourceSnapshots: {
    markdown: content,
  },
  storageKind: "docsy",
  tiptapJson: null,
  updatedAt: 2,
  ...overrides,
});

describe("documentPerformanceProfile", () => {
  it("classifies a small document as normal", () => {
    const profile = buildDocumentPerformanceProfile(createDocument("# Title\n\nShort body."));

    expect(profile.kind).toBe("normal");
  });

  it("classifies a medium workspace document as large", () => {
    const content = Array.from({ length: 220 }, (_, index) => `## Section ${index + 1}\n\nBody ${index + 1}`).join("\n\n");
    const profile = buildDocumentPerformanceProfile(createDocument(content));

    expect(profile.kind).toBe("large");
    expect(profile.blockCount).toBeGreaterThanOrEqual(150);
  });

  it("classifies a very large document as heavy", () => {
    const content = `# Heavy\n\n${"Paragraph content.\n\n".repeat(8_000)}`;
    const profile = buildDocumentPerformanceProfile(createDocument(content));

    expect(profile.kind).toBe("heavy");
    expect(profile.charCount).toBeGreaterThan(100_000);
  });
});
