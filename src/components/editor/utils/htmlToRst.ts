/**
 * Converts Tiptap HTML output to reStructuredText (.rst) source code.
 * Supports: headings, inline formatting, lists, tables, code blocks,
 * blockquotes, images, links, math, admonitions, footnotes, captions,
 * cross-references, TOC.
 */

export function htmlToRst(html: string): string {
  let s = html;

  // --- Block-level processing (order matters) ---

  // TOC
  s = s.replace(/<div[^>]*data-type="toc"[^>]*>[\s\S]*?<\/div>/gi, ".. contents:: 목차\n   :depth: 3\n");

  // Figure captions — use placeholder to protect from tag stripping
  s = s.replace(
    /<div[^>]*data-type="figure-caption"[^>]*data-caption-type="([^"]*)"[^>]*data-label="([^"]*)"[^>]*>([^<]*)<\/div>/gi,
    (_, type, label, text) => {
      const clean = text.replace(/^[^:]+:\s*/, "");
      const labelDirective = label ? `\n\n.. _${label}:\n` : "";
      return `${labelDirective}\n.. figure:: placeholder\n   :align: center\n\n   ${clean}`;
    }
  );

  // Cross references — use placeholder to avoid stripping
  s = s.replace(
    /<span[^>]*data-type="cross-ref"[^>]*data-target="([^"]*)"[^>]*>[^<]*<\/span>/gi,
    (_, target) => `\x00RST_REF_START\x00${target}\x00RST_REF_END\x00`
  );

  // Admonitions
  s = s.replace(
    /<div[^>]*data-type="admonition"[^>]*data-admonition-type="([^"]*)"[^>]*>([\s\S]*?)<\/div>/gi,
    (_, type, content) => {
      const rstType = getRstAdmonitionType(type);
      const clean = stripHtml(content).trim();
      const indented = clean.split("\n").map((l) => `   ${l}`).join("\n");
      return `\n.. ${rstType}::\n\n${indented}\n`;
    }
  );

  // Mermaid blocks — comment out
  s = s.replace(
    /<div[^>]*data-type="mermaidBlock"[^>]*>[\s\S]*?<\/div>/gi,
    "\n.. comment:: Mermaid diagram (not supported in RST)\n"
  );

  // Math blocks
  s = s.replace(
    /<div[^>]*data-type="mathBlock"[^>]*data-latex="([^"]*)"[^>]*>[\s\S]*?<\/div>/gi,
    (_, latex) => `\n.. math::\n\n   ${decodeEntities(latex)}\n`
  );

  // Code blocks with language
  s = s.replace(
    /<pre><code[^>]*class="language-([^"]*)"[^>]*>([\s\S]*?)<\/code><\/pre>/gi,
    (_, lang, code) => {
      const decoded = decodeEntities(stripHtml(code)).trim();
      const indented = decoded.split("\n").map((l) => `   ${l}`).join("\n");
      return `\n.. code-block:: ${lang}\n\n${indented}\n`;
    }
  );

  // Code blocks without language
  s = s.replace(
    /<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi,
    (_, code) => {
      const decoded = decodeEntities(stripHtml(code)).trim();
      const indented = decoded.split("\n").map((l) => `   ${l}`).join("\n");
      return `\n.. code-block::\n\n${indented}\n`;
    }
  );

  // Tables
  s = s.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, content) =>
    processTable(content)
  );

  // Blockquotes
  s = s.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, content) => {
    const text = stripHtml(content).trim();
    const indented = text.split("\n").map((l) => `   ${l}`).join("\n");
    return `\n..\n\n${indented}\n`;
  });

  // Footnote items (collected by footnote-ref inline)
  s = s.replace(/<div[^>]*data-type="footnote-item"[^>]*>[\s\S]*?<\/div>/gi, "");

  // Headings — RST uses underline/overline characters
  s = s.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, c) => {
    const text = stripInline(c);
    return `\n${makeHeading(text, "=", true)}\n`;
  });
  s = s.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, c) => {
    const text = stripInline(c);
    return `\n${makeHeading(text, "-")}\n`;
  });
  s = s.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, c) => {
    const text = stripInline(c);
    return `\n${makeHeading(text, "~")}\n`;
  });
  s = s.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_, c) => {
    const text = stripInline(c);
    return `\n${makeHeading(text, "^")}\n`;
  });
  s = s.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, (_, c) => {
    const text = stripInline(c);
    return `\n${makeHeading(text, '"')}\n`;
  });

  // Horizontal rules
  s = s.replace(/<hr\s*\/?>/gi, "\n----\n");

  // Images
  s = s.replace(
    /<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi,
    (_, src, alt) => `\n.. image:: ${src}\n   :alt: ${alt}\n`
  );
  s = s.replace(
    /<img[^>]*src="([^"]*)"[^>]*\/?>/gi,
    (_, src) => `\n.. image:: ${src}\n`
  );

  // Task lists
  s = s.replace(
    /<ul[^>]*data-type="taskList"[^>]*>([\s\S]*?)<\/ul>/gi,
    (_, content) => {
      return content.replace(
        /<li[^>]*data-checked="([^"]*)"[^>]*>([\s\S]*?)<\/li>/gi,
        (_: string, checked: string, text: string) => {
          const marker = checked === "true" ? "[x]" : "[ ]";
          return `- ${marker} ${stripHtml(text).trim()}`;
        }
      );
    }
  );

  // Ordered lists
  s = s.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, content) => {
    let idx = 0;
    return content.replace(
      /<li[^>]*>([\s\S]*?)<\/li>/gi,
      (_: string, text: string) => {
        idx++;
        return `${idx}. ${stripHtml(text).trim()}`;
      }
    );
  });

  // Unordered lists
  s = s.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, content) => {
    return content.replace(
      /<li[^>]*>([\s\S]*?)<\/li>/gi,
      (_: string, text: string) => `- ${stripHtml(text).trim()}`
    );
  });

  // Paragraphs
  s = s.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, content) => {
    const text = processInline(content);
    return text.trim() ? `\n${text.trim()}\n` : "";
  });

  // --- Inline processing for remaining ---
  s = processInline(s);

  // Strip remaining HTML tags
  s = s.replace(/<\/?[^>]+>/g, "");

  // Decode entities
  s = decodeEntities(s);

  // Resolve cross-reference placeholders
  s = s.replace(
    /\x00RST_REF_START\x00([^\x00]*)\x00RST_REF_END\x00/g,
    (_, target) => `:ref:\`${target}\``
  );

  // Clean up excessive newlines
  s = s.replace(/\n{3,}/g, "\n\n").trim();

  return s + "\n";
}

// ─── Heading helper ───

function makeHeading(text: string, char: string, overline = false): string {
  const line = char.repeat(Math.max(text.length, 4));
  if (overline) {
    return `${line}\n${text}\n${line}`;
  }
  return `${text}\n${line}`;
}

// ─── Inline processing ───

function processInline(s: string): string {
  // Inline math
  s = s.replace(
    /<span[^>]*data-type="mathInline"[^>]*data-latex="([^"]*)"[^>]*>[\s\S]*?<\/span>/gi,
    (_, latex) => `:math:\`${decodeEntities(latex)}\``
  );

  // Footnote references
  s = s.replace(
    /<span[^>]*data-type="footnote-ref"[^>]*data-note="([^"]*)"[^>]*>[\s\S]*?<\/span>/gi,
    (_, note) => {
      // RST inline footnotes aren't standard; use auto-numbered footnotes
      return `[#]_\n\n.. [#] ${decodeEntities(note)}`;
    }
  );

  // Bold
  s = s.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, (_, c) => `**${stripTags(c)}**`);
  s = s.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, (_, c) => `**${stripTags(c)}**`);

  // Italic
  s = s.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, (_, c) => `*${stripTags(c)}*`);
  s = s.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, (_, c) => `*${stripTags(c)}*`);

  // Underline — RST has no native underline; use interpreted role
  s = s.replace(/<u[^>]*>([\s\S]*?)<\/u>/gi, (_, c) => `:underline:\`${stripTags(c)}\``);

  // Strikethrough — use custom role
  s = s.replace(/<s[^>]*>([\s\S]*?)<\/s>/gi, (_, c) => `:strike:\`${stripTags(c)}\``);
  s = s.replace(/<del[^>]*>([\s\S]*?)<\/del>/gi, (_, c) => `:strike:\`${stripTags(c)}\``);

  // Inline code
  s = s.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, c) => `\`\`${stripTags(c)}\`\``);

  // Highlight/mark
  s = s.replace(/<mark[^>]*>([\s\S]*?)<\/mark>/gi, (_, c) => `:highlight:\`${stripTags(c)}\``);

  // Superscript / Subscript
  s = s.replace(/<sup[^>]*>([\s\S]*?)<\/sup>/gi, (_, c) => `:sup:\`${stripTags(c)}\``);
  s = s.replace(/<sub[^>]*>([\s\S]*?)<\/sub>/gi, (_, c) => `:sub:\`${stripTags(c)}\``);

  // Links — use placeholder to protect angle brackets from tag stripping
  s = s.replace(
    /<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
    (_, href, text) => `\`${stripTags(text)} \x00LT\x00${href}\x00GT\x00\`_`
  );

  // Colored text — no native RST support, use raw role
  s = s.replace(
    /<span[^>]*style="[^"]*color:\s*([^;"]*)[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
    (_, _color, text) => stripTags(text)
  );

  // Line breaks
  s = s.replace(/<br\s*\/?>/gi, "\n");

  return s;
}

// ─── Table processor ───

function processTable(content: string): string {
  const rows: { cells: string[]; isHeader: boolean }[] = [];
  const rowMatches = content.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];

  for (const row of rowMatches) {
    const isHeader = /<th/i.test(row);
    const cells: string[] = [];
    const cellMatches =
      row.match(/<(?:td|th)[^>]*>[\s\S]*?<\/(?:td|th)>/gi) || [];
    for (const cell of cellMatches) {
      const text = stripHtml(
        cell.replace(/<\/?(?:td|th)[^>]*>/gi, "")
      ).trim();
      cells.push(text);
    }
    rows.push({ cells, isHeader });
  }

  if (rows.length === 0) return "";

  // Calculate column widths
  const cols = Math.max(...rows.map((r) => r.cells.length));
  const colWidths: number[] = Array(cols).fill(3);
  for (const row of rows) {
    for (let i = 0; i < row.cells.length; i++) {
      colWidths[i] = Math.max(colWidths[i], row.cells[i].length + 2);
    }
  }

  const borderLine = "+" + colWidths.map((w) => "-".repeat(w)).join("+") + "+";
  const headerBorder =
    "+" + colWidths.map((w) => "=".repeat(w)).join("+") + "+";

  let result = "\n" + borderLine + "\n";

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const cellTexts = colWidths.map((w, i) => {
      const text = row.cells[i] || "";
      return " " + text.padEnd(w - 1);
    });
    result += "|" + cellTexts.join("|") + "|\n";

    if (row.isHeader) {
      result += headerBorder + "\n";
    } else {
      result += borderLine + "\n";
    }
  }

  return result;
}

// ─── Admonition type mapping ───

function getRstAdmonitionType(type: string): string {
  const map: Record<string, string> = {
    note: "note",
    tip: "tip",
    warning: "warning",
    danger: "danger",
    info: "note",
    caution: "caution",
    important: "important",
  };
  return map[type] || "note";
}

// ─── Utility helpers ───

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}

function stripInline(s: string): string {
  let result = processInline(s);
  result = result.replace(/<[^>]+>/g, "");
  return result.trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&emsp;/g, " ")
    .replace(/&ensp;/g, " ")
    .replace(/&thinsp;/g, " ")
    .replace(/&#10;/g, "\n");
}
