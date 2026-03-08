import { describe, it, expect } from "vitest";
import { htmlToRst } from "@/components/editor/utils/htmlToRst";

describe("htmlToRst", () => {
  it("converts H1 with overline", () => {
    const r = htmlToRst("<h1>Title</h1>");
    expect(r).toContain("=====");
    expect(r).toContain("Title");
    // H1 should have overline + underline
    const lines = r.trim().split("\n").filter(l => l.trim());
    const titleIdx = lines.findIndex(l => l.includes("Title"));
    expect(lines[titleIdx - 1]).toMatch(/^=+$/);
    expect(lines[titleIdx + 1]).toMatch(/^=+$/);
  });

  it("converts H2 with dash underline", () => {
    const r = htmlToRst("<h2>Section</h2>");
    expect(r).toContain("Section");
    expect(r).toContain("-------");
  });

  it("converts H3 with tilde underline", () => {
    const r = htmlToRst("<h3>SubSection</h3>");
    expect(r).toContain("SubSection");
    expect(r).toContain("~~~~~~~~~~");
  });

  it("converts bold and italic", () => {
    const r = htmlToRst("<p><strong>bold</strong> <em>italic</em></p>");
    expect(r).toContain("**bold**");
    expect(r).toContain("*italic*");
  });

  it("converts inline code", () => {
    const r = htmlToRst("<p><code>variable</code></p>");
    expect(r).toContain("``variable``");
  });

  it("converts superscript and subscript", () => {
    const r = htmlToRst("<p>x<sup>2</sup> H<sub>2</sub>O</p>");
    expect(r).toContain(":sup:`2`");
    expect(r).toContain(":sub:`2`");
  });

  it("converts links", () => {
    const r = htmlToRst('<p><a href="https://example.com">Link</a></p>');
    expect(r).toContain("`Link <https://example.com>`_");
  });

  it("converts unordered lists", () => {
    const r = htmlToRst("<ul><li>Apple</li><li>Banana</li></ul>");
    expect(r).toContain("- Apple");
    expect(r).toContain("- Banana");
  });

  it("converts ordered lists", () => {
    const r = htmlToRst("<ol><li>First</li><li>Second</li></ol>");
    expect(r).toContain("1. First");
    expect(r).toContain("2. Second");
  });

  it("converts code blocks with language", () => {
    const r = htmlToRst('<pre><code class="language-python">print("hello")</code></pre>');
    expect(r).toContain(".. code-block:: python");
    expect(r).toContain('   print("hello")');
  });

  it("converts code blocks without language", () => {
    const r = htmlToRst("<pre><code>some code</code></pre>");
    expect(r).toContain(".. code-block::");
    expect(r).toContain("   some code");
  });

  it("converts inline math", () => {
    const r = htmlToRst('<span data-type="mathInline" data-latex="x^2">x²</span>');
    expect(r).toContain(":math:`x^2`");
  });

  it("converts block math", () => {
    const r = htmlToRst('<div data-type="mathBlock" data-latex="E = mc^2">$$E = mc^2$$</div>');
    expect(r).toContain(".. math::");
    expect(r).toContain("   E = mc^2");
  });

  it("converts images", () => {
    const r = htmlToRst('<img src="photo.png" alt="A photo" />');
    expect(r).toContain(".. image:: photo.png");
    expect(r).toContain(":alt: A photo");
  });

  it("converts horizontal rules", () => {
    const r = htmlToRst("<hr/>");
    expect(r).toContain("----");
  });

  it("converts TOC", () => {
    const r = htmlToRst('<div data-type="toc">목차</div>');
    expect(r).toContain(".. contents:: 목차");
    expect(r).toContain(":depth: 3");
  });

  it("converts admonitions", () => {
    const r = htmlToRst('<div data-type="admonition" data-admonition-type="warning"><p>Be careful</p></div>');
    expect(r).toContain(".. warning::");
    expect(r).toContain("Be careful");
  });

  it("converts admonition types correctly", () => {
    expect(htmlToRst('<div data-type="admonition" data-admonition-type="note"><p>N</p></div>')).toContain(".. note::");
    expect(htmlToRst('<div data-type="admonition" data-admonition-type="tip"><p>T</p></div>')).toContain(".. tip::");
    expect(htmlToRst('<div data-type="admonition" data-admonition-type="danger"><p>D</p></div>')).toContain(".. danger::");
  });

  it("converts cross references", () => {
    const r = htmlToRst('<p>See <span data-type="cross-ref" data-target="fig:1">그림 1</span> here</p>');
    expect(r).toContain(":ref:`fig:1`");
  });

  it("converts figure captions with labels", () => {
    const r = htmlToRst('<div data-type="figure-caption" data-caption-type="figure" data-label="fig:result">그림: My Figure</div>');
    expect(r).toContain(".. _fig:result:");
    expect(r).toContain(".. figure::");
    expect(r).toContain("My Figure");
  });

  it("converts tables with grid format", () => {
    const r = htmlToRst("<table><tr><th>Name</th><th>Age</th></tr><tr><td>Alice</td><td>30</td></tr></table>");
    expect(r).toContain("+");
    expect(r).toContain("|");
    expect(r).toContain("Name");
    expect(r).toContain("Alice");
    // Header row should use = border
    expect(r).toContain("=");
  });

  it("converts underline and strikethrough", () => {
    const r = htmlToRst("<p><u>under</u> <s>strike</s></p>");
    expect(r).toContain(":underline:`under`");
    expect(r).toContain(":strike:`strike`");
  });

  it("converts highlight/mark", () => {
    const r = htmlToRst("<p><mark>highlighted</mark></p>");
    expect(r).toContain(":highlight:`highlighted`");
  });

  it("converts blockquotes", () => {
    const r = htmlToRst("<blockquote><p>A quote</p></blockquote>");
    expect(r).toContain("A quote");
  });
});
