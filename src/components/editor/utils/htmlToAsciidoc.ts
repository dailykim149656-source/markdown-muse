/**
 * Converts Tiptap HTML output to AsciiDoc source code.
 * Supports: headings, inline formatting, lists, tables, code blocks,
 * blockquotes, images, links, math, admonitions, footnotes, captions, TOC.
 */

export function htmlToAsciidoc(html: string): string {
  let s = html;

  // --- Block-level processing (order matters) ---

  // TOC
  s = s.replace(/<div[^>]*data-type="toc"[^>]*>[\s\S]*?<\/div>/gi, ":toc:\n:toc-title: 목차\n");

  // Figure captions
  s = s.replace(/<div[^>]*data-type="figure-caption"[^>]*data-caption-type="([^"]*)"[^>]*data-label="([^"]*)"[^>]*>([^<]*)<\/div>/gi,
    (_, type, label, text) => {
      const clean = text.replace(/^[^\:]+:\s*/, "");
      const anchor = label ? `[[${label}]]\n` : "";
      return `${anchor}.${clean}`;
    });

  // Cross references — use placeholder to avoid stripping by HTML tag remover
  s = s.replace(/<span[^>]*data-type="cross-ref"[^>]*data-target="([^"]*)"[^>]*>[^<]*<\/span>/gi,
    (_, target) => `\x00XREF_START\x00${target}\x00XREF_END\x00`);
  // Admonitions
  s = s.replace(/<div[^>]*data-type="admonition"[^>]*data-admonition-type="([^"]*)"[^>]*>([\s\S]*?)<\/div>/gi,
    (_, type, content) => {
      const adocType = getAdocAdmonitionType(type);
      const clean = stripHtml(content).trim();
      return `[${adocType}]\n====\n${clean}\n====`;
    });

  // Math blocks
  s = s.replace(/<div[^>]*data-type="mathBlock"[^>]*data-latex="([^"]*)"[^>]*>[\s\S]*?<\/div>/gi,
    (_, latex) => `[stem]\n++++\n${decodeEntities(latex)}\n++++`);

  // Code blocks with language
  s = s.replace(/<pre><code[^>]*class="language-([^"]*)"[^>]*>([\s\S]*?)<\/code><\/pre>/gi,
    (_, lang, code) => `[source,${lang}]\n----\n${decodeEntities(stripHtml(code)).trim()}\n----`);

  // Code blocks without language
  s = s.replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi,
    (_, code) => `[source]\n----\n${decodeEntities(stripHtml(code)).trim()}\n----`);

  // Tables
  s = s.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, content) => processTable(content));

  // Blockquotes
  s = s.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, content) => {
    const text = stripHtml(content).trim();
    return `[quote]\n____\n${text}\n____`;
  });

  // Headings
  s = s.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, c) => `== ${stripInline(c)}`);
  s = s.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, c) => `=== ${stripInline(c)}`);
  s = s.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, c) => `==== ${stripInline(c)}`);
  s = s.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_, c) => `===== ${stripInline(c)}`);
  s = s.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, (_, c) => `====== ${stripInline(c)}`);

  // Task lists
  s = s.replace(/<ul[^>]*data-type="taskList"[^>]*>([\s\S]*?)<\/ul>/gi, (_, content) => {
    return content.replace(/<li[^>]*data-checked="([^"]*)"[^>]*>([\s\S]*?)<\/li>/gi,
      (_: string, checked: string, text: string) => {
        const marker = checked === "true" ? "[x]" : "[ ]";
        return `* ${marker} ${stripHtml(text).trim()}`;
      });
  });

  // Ordered lists
  s = s.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, content) => {
    return content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi,
      (_: string, text: string) => `. ${stripHtml(text).trim()}`);
  });

  // Unordered lists
  s = s.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, content) => {
    return content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi,
      (_: string, text: string) => `* ${stripHtml(text).trim()}`);
  });

  // Horizontal rules
  s = s.replace(/<hr\s*\/?>/gi, "'''");

  // Images
  s = s.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi,
    (_, src, alt) => `image::${src}[${alt}]`);
  s = s.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi,
    (_, src) => `image::${src}[]`);

  // Paragraphs
  s = s.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, content) => {
    const text = processInline(content);
    return text.trim() ? `${text.trim()}\n` : "";
  });

  // --- Inline processing ---
  s = processInline(s);

  // Strip remaining HTML tags
  s = s.replace(/<\/?[^>]+>/g, "");

  // Decode entities
  s = decodeEntities(s);

  // Clean up excessive newlines
  s = s.replace(/\n{3,}/g, "\n\n").trim();

  // Resolve cross-reference placeholders
  s = s.replace(/\x00XREF_START\x00([^\x00]*)\x00XREF_END\x00/g, (_, target) => `<<${target}>>`);

  return s + "\n";
}

function processInline(s: string): string {
  // Inline math
  s = s.replace(/<span[^>]*data-type="mathInline"[^>]*data-latex="([^"]*)"[^>]*>[\s\S]*?<\/span>/gi,
    (_, latex) => `stem:[${decodeEntities(latex)}]`);

  // Footnotes
  s = s.replace(/<span[^>]*data-type="footnote-ref"[^>]*data-note="([^"]*)"[^>]*>[\s\S]*?<\/span>/gi,
    (_, note) => `footnote:[${decodeEntities(note)}]`);

  // Bold
  s = s.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, (_, c) => `*${stripTags(c)}*`);
  s = s.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, (_, c) => `*${stripTags(c)}*`);

  // Italic
  s = s.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, (_, c) => `_${stripTags(c)}_`);
  s = s.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, (_, c) => `_${stripTags(c)}_`);

  // Underline — AsciiDoc uses [.underline]#text#
  s = s.replace(/<u[^>]*>([\s\S]*?)<\/u>/gi, (_, c) => `[.underline]#${stripTags(c)}#`);

  // Strikethrough
  s = s.replace(/<s[^>]*>([\s\S]*?)<\/s>/gi, (_, c) => `[.line-through]#${stripTags(c)}#`);
  s = s.replace(/<del[^>]*>([\s\S]*?)<\/del>/gi, (_, c) => `[.line-through]#${stripTags(c)}#`);

  // Inline code
  s = s.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, c) => `\`${stripTags(c)}\``);

  // Highlight/mark
  s = s.replace(/<mark[^>]*>([\s\S]*?)<\/mark>/gi, (_, c) => `#${stripTags(c)}#`);

  // Superscript / Subscript
  s = s.replace(/<sup[^>]*>([\s\S]*?)<\/sup>/gi, (_, c) => `^${stripTags(c)}^`);
  s = s.replace(/<sub[^>]*>([\s\S]*?)<\/sub>/gi, (_, c) => `~${stripTags(c)}~`);

  // Links
  s = s.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
    (_, href, text) => `${href}[${stripTags(text)}]`);

  // Line breaks
  s = s.replace(/<br\s*\/?>/gi, " +\n");

  return s;
}

function processTable(content: string): string {
  const rows: { cells: string[]; isHeader: boolean }[] = [];
  const rowMatches = content.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];

  for (const row of rowMatches) {
    const isHeader = /<th/i.test(row);
    const cells: string[] = [];
    const cellMatches = row.match(/<(?:td|th)[^>]*>[\s\S]*?<\/(?:td|th)>/gi) || [];
    for (const cell of cellMatches) {
      const text = stripHtml(cell.replace(/<\/?(?:td|th)[^>]*>/gi, "")).trim();
      cells.push(text);
    }
    rows.push({ cells, isHeader });
  }

  if (rows.length === 0) return "";

  const cols = Math.max(...rows.map(r => r.cells.length));
  let result = `[cols="${Array(cols).fill("1").join(",")}", options="header"]\n|===\n`;

  for (const row of rows) {
    result += row.cells.map(c => `| ${c}`).join(" ") + "\n";
    // Add blank line after header row
    if (row.isHeader) result += "\n";
  }

  result += "|===";
  return result;
}

function getAdocAdmonitionType(type: string): string {
  const map: Record<string, string> = {
    note: "NOTE",
    tip: "TIP",
    warning: "WARNING",
    danger: "CAUTION",
    info: "NOTE",
    caution: "CAUTION",
    important: "IMPORTANT",
  };
  return map[type] || "NOTE";
}

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
