import { describe, expect, it } from "vitest";
import { buildDerivedDocumentIndex } from "@/lib/ast/documentIndex";
import { serializeTiptapToAst } from "@/lib/ast/tiptapAst";
import { technicalDocumentFixture } from "@/test/fixtures/technicalDocument.fixture";

describe("buildDerivedDocumentIndex", () => {
  it("collects headings, labels, and footnotes", () => {
    const ast = serializeTiptapToAst(technicalDocumentFixture, { documentNodeId: "doc_index" });
    const index = buildDerivedDocumentIndex(ast);

    expect(index.headings).toEqual([
      expect.objectContaining({
        level: 1,
        text: "System Overview",
      }),
    ]);
    expect(index.labels["fig:system"]).toBeTruthy();
    expect(index.footnotes["fn-1"]).toBeTruthy();
  });
});
