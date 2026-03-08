import { describe, it, expect } from "vitest";
import { htmlToLatex } from "@/components/editor/utils/htmlToLatex";
import { htmlToTypst } from "@/components/editor/utils/htmlToTypst";
import { htmlToAsciidoc } from "@/components/editor/utils/htmlToAsciidoc";
import { latexToTypst } from "@/components/editor/utils/latexToTypst";

// ═══════════════════════════════════════════
// HTML → LaTeX
// ═══════════════════════════════════════════
describe("htmlToLatex", () => {
  const convert = (html: string) => htmlToLatex(html, false);

  it("converts headings", () => {
    const r = convert("<h1>Introduction</h1><h2>Background</h2><h3>Details</h3>");
    expect(r).toContain("\\section{Introduction}");
    expect(r).toContain("\\subsection{Background}");
    expect(r).toContain("\\subsubsection{Details}");
  });

  it("converts paragraphs", () => {
    const r = convert("<p>Hello world</p>");
    expect(r).toContain("Hello world");
  });

  it("converts inline formatting", () => {
    const r = convert("<p><strong>bold</strong> <em>italic</em> <u>underline</u> <s>strike</s> <code>code</code></p>");
    expect(r).toContain("\\textbf{bold}");
    expect(r).toContain("\\textit{italic}");
    expect(r).toContain("\\underline{underline}");
    expect(r).toContain("\\sout{strike}");
    expect(r).toContain("\\texttt{code}");
  });

  it("converts sub/superscript", () => {
    const r = convert("<p>H<sub>2</sub>O x<sup>2</sup></p>");
    expect(r).toContain("\\textsubscript{2}");
    expect(r).toContain("\\textsuperscript{2}");
  });

  it("converts unordered lists", () => {
    const r = convert("<ul><li>Item 1</li><li>Item 2</li></ul>");
    expect(r).toContain("\\begin{itemize}");
    expect(r).toContain("\\item Item 1");
    expect(r).toContain("\\end{itemize}");
  });

  it("converts ordered lists", () => {
    const r = convert("<ol><li>First</li><li>Second</li></ol>");
    expect(r).toContain("\\begin{enumerate}");
    expect(r).toContain("\\item First");
    expect(r).toContain("\\end{enumerate}");
  });

  it("converts blockquotes", () => {
    const r = convert("<blockquote><p>A quote</p></blockquote>");
    expect(r).toContain("\\begin{quote}");
    expect(r).toContain("\\end{quote}");
  });

  it("converts links", () => {
    const r = convert('<p><a href="https://example.com">Link</a></p>');
    expect(r).toContain("\\href{https://example.com}{Link}");
  });

  it("converts inline math", () => {
    const r = convert('<p><span data-type="mathInline" data-latex="x^2">x²</span></p>');
    expect(r).toContain("$x^2$");
  });

  it("converts block math", () => {
    const r = convert('<div data-type="mathBlock" data-latex="E = mc^2">$$E = mc^2$$</div>');
    expect(r).toContain("\\[\nE = mc^2\n\\]");
  });

  it("converts code blocks", () => {
    const r = convert('<pre><code class="language-python">print("hello")</code></pre>');
    expect(r).toContain("\\begin{lstlisting}[language=python]");
    expect(r).toContain('print("hello")');
    expect(r).toContain("\\end{lstlisting}");
  });

  it("converts tables", () => {
    const r = convert("<table><tr><th>Name</th><th>Value</th></tr><tr><td>A</td><td>1</td></tr></table>");
    expect(r).toContain("\\begin{tabular}");
    expect(r).toContain("Name & Value");
    expect(r).toContain("A & 1");
    expect(r).toContain("\\midrule");
  });

  it("converts horizontal rules", () => {
    const r = convert("<hr/>");
    expect(r).toContain("\\rule{\\textwidth}");
  });

  it("converts admonitions", () => {
    const r = convert('<div data-type="admonition" data-admonition-type="warning" data-admonition-color="yellow"><p>Careful!</p></div>');
    expect(r).toContain("\\begin{admonitionbox}");
    expect(r).toContain("\\end{admonitionbox}");
  });

  it("generates full document with wrapper", () => {
    const r = htmlToLatex("<p>Test</p>", true);
    expect(r).toContain("\\documentclass");
    expect(r).toContain("\\begin{document}");
    expect(r).toContain("\\end{document}");
  });

  it("escapes special LaTeX characters", () => {
    const r = convert("<p>Price: $10 & 20% off #sale</p>");
    expect(r).toContain("\\$");
    expect(r).toContain("\\&");
    expect(r).toContain("\\%");
    expect(r).toContain("\\#");
  });

  it("converts text alignment", () => {
    const r = convert('<p style="text-align: center">Centered</p>');
    expect(r).toContain("\\begin{center}");
  });
});

// ═══════════════════════════════════════════
// HTML → Typst
// ═══════════════════════════════════════════
describe("htmlToTypst", () => {
  it("converts headings", () => {
    const r = htmlToTypst("<h1>Title</h1><h2>Sub</h2><h3>SubSub</h3>");
    expect(r).toContain("= Title");
    expect(r).toContain("== Sub");
    expect(r).toContain("=== SubSub");
  });

  it("converts inline formatting", () => {
    const r = htmlToTypst("<p><strong>bold</strong> <em>italic</em> <u>under</u> <s>strike</s></p>");
    expect(r).toContain("*bold*");
    expect(r).toContain("_italic_");
    expect(r).toContain("#underline[under]");
    expect(r).toContain("#strike[strike]");
  });

  it("converts lists", () => {
    const r = htmlToTypst("<ul><li>A</li><li>B</li></ul>");
    expect(r).toContain("- A");
    expect(r).toContain("- B");
  });

  it("converts ordered lists", () => {
    const r = htmlToTypst("<ol><li>First</li><li>Second</li></ol>");
    expect(r).toContain("+ First");
    expect(r).toContain("+ Second");
  });

  it("converts blockquotes", () => {
    const r = htmlToTypst("<blockquote><p>Quote text</p></blockquote>");
    expect(r).toContain("#quote(block: true)");
  });

  it("converts inline math", () => {
    const r = htmlToTypst('<p><span data-type="mathInline" data-latex="x^2">x²</span></p>');
    expect(r).toContain("$x^2$");
  });

  it("converts block math", () => {
    const r = htmlToTypst('<div data-type="mathBlock" data-latex="E = mc^2">$$E = mc^2$$</div>');
    expect(r).toContain("$ E = mc^2 $");
  });

  it("converts code blocks with language", () => {
    const r = htmlToTypst('<pre><code class="language-js">let x = 1;</code></pre>');
    expect(r).toContain("```js");
    expect(r).toContain("let x = 1;");
  });

  it("converts tables", () => {
    const r = htmlToTypst("<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>");
    expect(r).toContain("#table(");
    expect(r).toContain("columns: 2");
    expect(r).toContain("table.header(");
  });

  it("converts links", () => {
    const r = htmlToTypst('<p><a href="https://example.com">Link</a></p>');
    expect(r).toContain('#link("https://example.com")[Link]');
  });

  it("converts images", () => {
    const r = htmlToTypst('<img src="img.png" alt="photo" />');
    expect(r).toContain('#image("img.png"');
  });

  it("converts TOC", () => {
    const r = htmlToTypst('<div data-type="toc">목차</div>');
    expect(r).toContain("#outline()");
  });

  it("converts figure captions", () => {
    const r = htmlToTypst('<div data-type="figure-caption" data-caption-type="figure" data-label="fig:1">그림: My caption</div>');
    expect(r).toContain("#figure(caption:");
    expect(r).toContain("My caption");
  });

  it("converts cross references", () => {
    const r = htmlToTypst('<span data-type="cross-ref" data-target="fig:1">그림 1</span>');
    expect(r).toContain("@fig:1");
  });

  it("converts admonitions", () => {
    const r = htmlToTypst('<div data-type="admonition" data-admonition-type="warning"><p>Watch out!</p></div>');
    expect(r).toContain("#admonition(");
    expect(r).toContain("Warning");
  });

  it("converts footnotes", () => {
    const r = htmlToTypst('<span data-type="footnote-ref" data-note="A note">1</span>');
    expect(r).toContain("#footnote[A note]");
  });

  it("converts horizontal rules", () => {
    const r = htmlToTypst("<hr/>");
    expect(r).toContain("#line(length: 100%)");
  });

  it("converts superscript and subscript", () => {
    const r = htmlToTypst("<p>x<sup>2</sup> H<sub>2</sub>O</p>");
    expect(r).toContain("#super[2]");
    expect(r).toContain("#sub[2]");
  });
});

// ═══════════════════════════════════════════
// HTML → AsciiDoc
// ═══════════════════════════════════════════
describe("htmlToAsciidoc", () => {
  it("converts headings", () => {
    const r = htmlToAsciidoc("<h1>Title</h1><h2>Sub</h2>");
    expect(r).toContain("== Title");
    expect(r).toContain("=== Sub");
  });

  it("converts inline formatting", () => {
    const r = htmlToAsciidoc("<p><strong>bold</strong> <em>italic</em></p>");
    expect(r).toContain("*bold*");
    expect(r).toContain("_italic_");
  });

  it("converts underline and strikethrough", () => {
    const r = htmlToAsciidoc("<p><u>under</u> <s>strike</s></p>");
    expect(r).toContain("[.underline]#under#");
    expect(r).toContain("[.line-through]#strike#");
  });

  it("converts unordered lists", () => {
    const r = htmlToAsciidoc("<ul><li>A</li><li>B</li></ul>");
    expect(r).toContain("* A");
    expect(r).toContain("* B");
  });

  it("converts ordered lists", () => {
    const r = htmlToAsciidoc("<ol><li>First</li></ol>");
    expect(r).toContain(". First");
  });

  it("converts blockquotes", () => {
    const r = htmlToAsciidoc("<blockquote><p>Quote</p></blockquote>");
    expect(r).toContain("[quote]");
    expect(r).toContain("____");
  });

  it("converts code blocks", () => {
    const r = htmlToAsciidoc('<pre><code class="language-python">print(1)</code></pre>');
    expect(r).toContain("[source,python]");
    expect(r).toContain("----");
    expect(r).toContain("print(1)");
  });

  it("converts inline math", () => {
    const r = htmlToAsciidoc('<span data-type="mathInline" data-latex="x^2">x²</span>');
    expect(r).toContain("stem:[x^2]");
  });

  it("converts block math", () => {
    const r = htmlToAsciidoc('<div data-type="mathBlock" data-latex="E=mc^2">$$E=mc^2$$</div>');
    expect(r).toContain("[stem]");
    expect(r).toContain("++++");
    expect(r).toContain("E=mc^2");
  });

  it("converts TOC", () => {
    const r = htmlToAsciidoc('<div data-type="toc">목차</div>');
    expect(r).toContain(":toc:");
  });

  it("converts figure captions", () => {
    const r = htmlToAsciidoc('<div data-type="figure-caption" data-caption-type="figure" data-label="fig:1">그림: My Figure</div>');
    expect(r).toContain("[[fig:1]]");
    expect(r).toContain(".My Figure");
  });

  it("converts cross references", () => {
    const r = htmlToAsciidoc('<p>See <span data-type="cross-ref" data-target="fig:1">그림 1</span> here</p>');
    expect(r).toContain("<<fig:1>>");
  });

  it("converts admonitions", () => {
    const r = htmlToAsciidoc('<div data-type="admonition" data-admonition-type="warning"><p>Be careful</p></div>');
    expect(r).toContain("[WARNING]");
    expect(r).toContain("====");
  });

  it("converts tables", () => {
    const r = htmlToAsciidoc("<table><tr><th>Name</th></tr><tr><td>Value</td></tr></table>");
    expect(r).toContain("|===");
    expect(r).toContain("| Name");
    expect(r).toContain("| Value");
  });

  it("converts links", () => {
    const r = htmlToAsciidoc('<p><a href="https://example.com">Link</a></p>');
    expect(r).toContain("https://example.com[Link]");
  });

  it("converts images", () => {
    const r = htmlToAsciidoc('<img src="photo.png" alt="A photo" />');
    expect(r).toContain("image::photo.png[A photo]");
  });

  it("converts horizontal rules", () => {
    const r = htmlToAsciidoc("<hr/>");
    expect(r).toContain("'''");
  });

  it("converts superscript and subscript", () => {
    const r = htmlToAsciidoc("<p>x<sup>2</sup> H<sub>2</sub>O</p>");
    expect(r).toContain("^2^");
    expect(r).toContain("~2~");
  });
});

// ═══════════════════════════════════════════
// LaTeX → Typst (already has separate test file, add integration checks)
// ═══════════════════════════════════════════
describe("latexToTypst integration", () => {
  const wrap = (body: string) =>
    `\\documentclass{article}\n\\begin{document}\n${body}\n\\end{document}`;

  it("converts a full document structure", () => {
    const latex = `\\documentclass[11pt]{article}
\\title{Test Paper}
\\author{Author Name}
\\begin{document}
\\maketitle
\\section{Introduction}
This is the introduction.
\\subsection{Background}
Some background text.
\\end{document}`;
    const r = latexToTypst(latex);
    expect(r).toContain("#set text(size: 11pt)");
    expect(r).toContain("= Introduction");
    expect(r).toContain("== Background");
  });

  it("converts nested math expressions", () => {
    const r = latexToTypst(wrap("$\\frac{\\frac{a}{b}}{c}$"));
    expect(r).toContain("$");
    expect(r).toContain("/");
  });

  it("converts itemize and enumerate", () => {
    const r = latexToTypst(wrap("\\begin{itemize}\n\\item First\n\\item Second\n\\end{itemize}"));
    expect(r).toContain("- First");
    expect(r).toContain("- Second");
  });

  it("converts enumerate to numbered list", () => {
    const r = latexToTypst(wrap("\\begin{enumerate}\n\\item One\n\\item Two\n\\end{enumerate}"));
    expect(r).toContain("+ One");
    expect(r).toContain("+ Two");
  });

  it("converts tabular to Typst table", () => {
    const r = latexToTypst(wrap("\\begin{tabular}{|l|c|r|}\n\\hline\nA & B & C \\\\\n\\hline\n1 & 2 & 3 \\\\\n\\hline\n\\end{tabular}"));
    expect(r).toContain("table(");
    expect(r).toContain("columns:");
  });
});
