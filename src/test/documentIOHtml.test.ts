import { describe, expect, it } from "vitest";
import { GOOGLE_FONTS_URL, PRETENDARD_STYLESHEET_URL } from "@/components/editor/fonts";
import { buildExportHtml, buildPrintHtml } from "@/hooks/useDocumentIO";

describe("document output html builders", () => {
  it("includes the full font stylesheet set for html export", () => {
    const html = buildExportHtml("Test", "<p>Hello</p>");

    expect(html).toContain(GOOGLE_FONTS_URL);
    expect(html).toContain(PRETENDARD_STYLESHEET_URL);
    expect(html).toContain("'Fira Code', 'JetBrains Mono', 'D2Coding', monospace");
  });

  it("includes the full font stylesheet set for print output", () => {
    const html = buildPrintHtml("Test", "<p>Hello</p>");

    expect(html).toContain(GOOGLE_FONTS_URL);
    expect(html).toContain(PRETENDARD_STYLESHEET_URL);
    expect(html).toContain("font-family:'Fira Code','JetBrains Mono','D2Coding',monospace");
  });
});
