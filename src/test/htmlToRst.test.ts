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

  // ─── Complex content tests ───

  describe("complex tables", () => {
    it("converts multi-column tables with proper grid format", () => {
      const r = htmlToRst(
        "<table><tr><th>Name</th><th>Age</th><th>City</th></tr>" +
        "<tr><td>Alice</td><td>30</td><td>Seoul</td></tr>" +
        "<tr><td>Bob</td><td>25</td><td>Busan</td></tr></table>"
      );
      expect(r).toContain("| Name");
      expect(r).toContain("| Alice");
      expect(r).toContain("| Bob");
      expect(r).toContain("Seoul");
      expect(r).toContain("Busan");
      // Header row should use = border
      const eqLine = r.split("\n").find(l => /^\+=+\+/.test(l));
      expect(eqLine).toBeTruthy();
    });

    it("converts tables with empty cells", () => {
      const r = htmlToRst(
        "<table><tr><th>A</th><th>B</th></tr><tr><td></td><td>val</td></tr></table>"
      );
      expect(r).toContain("val");
      expect(r).toContain("+");
    });

    it("converts tables with inline formatting in cells", () => {
      const r = htmlToRst(
        "<table><tr><td><strong>bold</strong></td><td><em>italic</em></td></tr></table>"
      );
      // stripHtml removes formatting inside cells
      expect(r).toContain("bold");
      expect(r).toContain("italic");
    });
  });

  describe("complex code blocks", () => {
    it("converts multi-line code blocks", () => {
      const r = htmlToRst(
        '<pre><code class="language-javascript">function hello() {\n  console.log("hi");\n  return true;\n}</code></pre>'
      );
      expect(r).toContain(".. code-block:: javascript");
      expect(r).toContain('   function hello() {');
      expect(r).toContain('     console.log("hi");');
      expect(r).toContain("     return true;");
    });

    it("converts code blocks with HTML entities", () => {
      const r = htmlToRst(
        '<pre><code class="language-html">&lt;div class=&quot;test&quot;&gt;&lt;/div&gt;</code></pre>'
      );
      expect(r).toContain(".. code-block:: html");
      expect(r).toContain('<div class="test"></div>');
    });

    it("converts code blocks with various languages", () => {
      for (const lang of ["python", "rust", "typescript", "go", "sql"]) {
        const r = htmlToRst(`<pre><code class="language-${lang}">code</code></pre>`);
        expect(r).toContain(`.. code-block:: ${lang}`);
      }
    });
  });

  describe("complex math", () => {
    it("converts block math with multiline LaTeX", () => {
      const r = htmlToRst(
        '<div data-type="mathBlock" data-latex="\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}">$$...$$</div>'
      );
      expect(r).toContain(".. math::");
      expect(r).toContain("\\int_0^\\infty");
      expect(r).toContain("\\frac{\\sqrt{\\pi}}{2}");
    });

    it("converts inline math alongside text", () => {
      const r = htmlToRst(
        '<p>The equation <span data-type="mathInline" data-latex="a^2 + b^2 = c^2">a²+b²=c²</span> is famous.</p>'
      );
      expect(r).toContain(":math:`a^2 + b^2 = c^2`");
      expect(r).toContain("The equation");
      expect(r).toContain("is famous.");
    });

    it("converts multiple inline math in one paragraph", () => {
      const r = htmlToRst(
        '<p>Given <span data-type="mathInline" data-latex="x">x</span> and <span data-type="mathInline" data-latex="y">y</span>, find <span data-type="mathInline" data-latex="x+y">x+y</span>.</p>'
      );
      expect(r).toContain(":math:`x`");
      expect(r).toContain(":math:`y`");
      expect(r).toContain(":math:`x+y`");
    });
  });

  describe("complex admonitions", () => {
    it("converts admonition with multi-paragraph content", () => {
      const r = htmlToRst(
        '<div data-type="admonition" data-admonition-type="warning"><p>First warning line.</p><p>Second warning line.</p></div>'
      );
      expect(r).toContain(".. warning::");
      expect(r).toContain("First warning line.");
      expect(r).toContain("Second warning line.");
    });

    it("converts all admonition types", () => {
      const types = [
        { type: "note", rst: "note" },
        { type: "tip", rst: "tip" },
        { type: "warning", rst: "warning" },
        { type: "danger", rst: "danger" },
        { type: "caution", rst: "caution" },
        { type: "important", rst: "important" },
      ];
      for (const { type, rst } of types) {
        const r = htmlToRst(`<div data-type="admonition" data-admonition-type="${type}"><p>msg</p></div>`);
        expect(r).toContain(`.. ${rst}::`);
      }
    });

    it("converts admonition with code inside", () => {
      const r = htmlToRst(
        '<div data-type="admonition" data-admonition-type="tip"><p>Use <code>pip install</code> to install.</p></div>'
      );
      expect(r).toContain(".. tip::");
      expect(r).toContain("pip install");
    });
  });

  describe("complex mixed content", () => {
    it("converts document with heading + paragraph + list + code", () => {
      const r = htmlToRst(
        "<h1>Introduction</h1>" +
        "<p>This is a guide.</p>" +
        "<h2>Steps</h2>" +
        "<ol><li>Install</li><li>Configure</li><li>Run</li></ol>" +
        '<pre><code class="language-bash">npm install\nnpm start</code></pre>'
      );
      // Heading with overline
      expect(r).toContain("Introduction");
      const lines = r.split("\n");
      const introIdx = lines.findIndex(l => l.trim() === "Introduction");
      expect(introIdx).toBeGreaterThan(0);
      expect(lines[introIdx - 1]).toMatch(/^=+$/);
      expect(lines[introIdx + 1]).toMatch(/^=+$/);
      // H2
      expect(r).toContain("Steps");
      expect(r).toContain("-----");
      // List
      expect(r).toContain("1. Install");
      expect(r).toContain("2. Configure");
      expect(r).toContain("3. Run");
      // Code
      expect(r).toContain(".. code-block:: bash");
      expect(r).toContain("   npm install");
    });

    it("converts footnotes", () => {
      const r = htmlToRst(
        '<p>Text with footnote<span data-type="footnote-ref" data-note="This is a footnote.">1</span>.</p>'
      );
      expect(r).toContain("[#]_");
      expect(r).toContain(".. [#] This is a footnote.");
    });

    it("converts task lists", () => {
      const r = htmlToRst(
        '<ul data-type="taskList"><li data-checked="true">Done task</li><li data-checked="false">Pending task</li></ul>'
      );
      expect(r).toContain("[x] Done task");
      expect(r).toContain("[ ] Pending task");
    });

    it("converts nested inline formatting", () => {
      const r = htmlToRst("<p><strong><em>bold italic</em></strong></p>");
      // Both bold and italic markers should be present
      expect(r).toContain("**");
      expect(r).toContain("bold italic");
    });

    it("converts document with images and captions", () => {
      const r = htmlToRst(
        '<img src="diagram.png" alt="Architecture Diagram" />' +
        '<div data-type="figure-caption" data-caption-type="figure" data-label="fig:arch">그림: Architecture Overview</div>'
      );
      expect(r).toContain(".. image:: diagram.png");
      expect(r).toContain(":alt: Architecture Diagram");
      expect(r).toContain(".. _fig:arch:");
      expect(r).toContain("Architecture Overview");
    });

    it("converts mermaid blocks (mermaidBlock) to code-block", () => {
      const r = htmlToRst('<div data-type="mermaidBlock" code="graph TD\n    A-->B"></div>');
      expect(r).toContain(".. code-block:: mermaid");
      expect(r).toContain("A-->B");
    });

    it("converts mermaid blocks (mermaid) to code-block", () => {
      const r = htmlToRst('<div data-type="mermaid" code="graph LR\n    X-->Y"></div>');
      expect(r).toContain(".. code-block:: mermaid");
      expect(r).toContain("X-->Y");
    });

    it("converts colored text by stripping color", () => {
      const r = htmlToRst('<p><span style="color: red">Important</span> text</p>');
      expect(r).toContain("Important");
      expect(r).toContain("text");
      expect(r).not.toContain("color");
    });

    it("handles line breaks in paragraphs", () => {
      const r = htmlToRst("<p>Line one<br/>Line two</p>");
      expect(r).toContain("Line one");
      expect(r).toContain("Line two");
    });

    it("converts multiple cross references", () => {
      const r = htmlToRst(
        '<p>See <span data-type="cross-ref" data-target="fig:1">그림 1</span> and <span data-type="cross-ref" data-target="tab:1">표 1</span>.</p>'
      );
      expect(r).toContain(":ref:`fig:1`");
      expect(r).toContain(":ref:`tab:1`");
    });
  });
});
