import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/core";
import { getRenderableMarkdown } from "@/lib/ast/getRenderableMarkdown";

describe("getRenderableMarkdown", () => {
  it("falls back to markdown when tiptap document is structurally empty", () => {
    const emptyDocument: JSONContent = {
      type: "doc",
      content: [{ type: "paragraph" }],
    };

    expect(getRenderableMarkdown(emptyDocument, "# fallback")).toBe("# fallback");
  });
});
