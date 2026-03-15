import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/core";
import { isUsableTiptapDocument } from "@/lib/ast/tiptapUsability";

describe("isUsableTiptapDocument", () => {
  it("treats an empty document shell as unusable", () => {
    const emptyDoc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
        },
      ],
    };

    expect(isUsableTiptapDocument(emptyDoc)).toBe(false);
  });

  it("treats a document with text as usable", () => {
    const filledDoc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello" }],
        },
      ],
    };

    expect(isUsableTiptapDocument(filledDoc)).toBe(true);
  });
});
