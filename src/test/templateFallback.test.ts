import { describe, expect, it } from "vitest";
import { getTemplateFallbackContent } from "@/lib/editor/templateFallback";

describe("getTemplateFallbackContent", () => {
  it("returns the canonical english markdown fallback", () => {
    expect(getTemplateFallbackContent("markdown", "en")).toBe([
      "# New Document",
      "",
      "## Summary",
      "",
      "Write a short summary.",
    ].join("\n"));
  });

  it("returns structured fallbacks without changing the previous output shape", () => {
    expect(getTemplateFallbackContent("json", "en")).toBe(JSON.stringify({
      summary: "Write a short summary.",
    }, null, 2));
    expect(getTemplateFallbackContent("yaml", "en")).toBe("summary: Write a short summary.");
  });
});
