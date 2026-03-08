/**
 * Converts Tiptap HTML output to Typst source code.
 * Supports: headings, inline formatting, lists, tables, code blocks,
 * blockquotes, images, links, math, admonitions, footnotes, captions, TOC.
 */

export function htmlToTypst(html: string): string {
  const usedFeatures = new Set<string>();
  let result = processNode(html, usedFeatures);

  // Build preamble
  let preamble = "";
  if (usedFeatures.has("admonition")) {
    preamble += `// Admonition helper\n#let admonition(title: "", color: blue, body) = block(\n  fill: color.lighten(90%),\n  stroke: (left: 3pt + color),\n  inset: 10pt,\n  radius: (right: 4pt),\n  width: 100%,\n  [*#title* \\ #body]\n)\n\n`;
  }

  // Clean up excessive newlines
  result = result.replace(/\n{3,}/g, "\n\n").trim();

  return preamble + result + "\n";
}

function processNode(html: string, features: Set<string>): string {
  let s = html;

  // --- Block-level processing (order matters) ---

  // TOC
  s = s.replace(/<div[^>]*data-type="toc"[^>]*>[\s\S]*?<\/div>/gi, "#outline()");

  // Figure captions
  s = s.replace(/<div[^>]*data-type="figure-caption"[^>]*data-caption-type="([^"]*)"[^>]*data-label="([^"]*)"[^>]*>([^<]*)<\/div>/gi,
    (_, type, label, text) => {
      features.add("caption");
      const clean = text.replace(/^[^\:]+:\s*/, "");
      if (label) {
        return `#figure(caption: [${clean}]) <${label}>`;
      }
      return `#figure(caption: [${clean}])`;
    });

  // Cross references
  s = s.replace(/<span[^>]*data-type="cross-ref"[^>]*data-target="([^"]*)"[^>]*>[^<]*<\/span>/gi,
    (_, target) => `@${target}`);

  // Mermaid — preserve as comment with code
  s = s.replace(/<div[^>]*data-type="mermaid(?:Block)?"[^>]*(?:code="([\s\S]*?)")?[^>]*>[\s\S]*?<\/div>/gi,
    (match, code) => {
      const mermaidCode = code || "";
      const decoded = decodeHtmlEntities(mermaidCode);
      return `// Mermaid diagram (not natively supported in Typst)\n// \`\`\`mermaid\n${decoded.split("\n").map((l: string) => `// ${l}`).join("\n")}\n// \`\`\``;
    });

  // Admonitions
  s = s.replace(/<div[^>]*data-type="admonition"[^>]*data-admonition-type="([^"]*)"[^>]*>([\s\S]*?)<\/div>/gi,
    (_, type, content) => {
      features.add("admonition");
      const label = type.charAt(0).toUpperCase() + type.slice(1);
      const clean = stripHtml(content).trim();
      return `#admonition(title: "${label}", color: ${getTypstColor(type)})[${clean}]`;
    });

  // Math blocks
  s = s.replace(/<div[^>]*data-type="mathBlock"[^>]*data-latex="([^"]*)"[^>]*>[\s\S]*?<\/div>/gi,
    (_, latex) => `$ ${decodeHtmlEntities(latex)} $`);

  // Code blocks with language
  s = s.replace(/<pre><code[^>]*class="language-([^"]*)"[^>]*>([\s\S]*?)<\/code><\/pre>/gi,
    (_, lang, code) => {
      features.add("code");
      return `\`\`\`${lang}\n${decodeHtmlEntities(stripHtml(code)).trim()}\n\`\`\``;
    });

  // Code blocks without language
  s = s.replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi,
    (_, code) => {
      features.add("code");
      return `\`\`\`\n${decodeHtmlEntities(stripHtml(code)).trim()}\n\`\`\``;
    });

  // Tables
  s = s.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, content) => {
    features.add("table");
    return processTable(content);
  });

  // Blockquotes
  s = s.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, content) => {
    const text = stripHtml(content).trim();
    return `#quote(block: true)[${text}]`;
  });

  // Headings
  s = s.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, c) => `= ${stripInline(c)}`);
  s = s.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, c) => `== ${stripInline(c)}`);
  s = s.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, c) => `=== ${stripInline(c)}`);
  s = s.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_, c) => `==== ${stripInline(c)}`);
  s = s.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, (_, c) => `===== ${stripInline(c)}`);

  // Task lists
  s = s.replace(/<ul[^>]*data-type="taskList"[^>]*>([\s\S]*?)<\/ul>/gi, (_, content) => {
    return content.replace(/<li[^>]*data-checked="([^"]*)"[^>]*>([\s\S]*?)<\/li>/gi,
      (_: string, checked: string, text: string) => {
        const marker = checked === "true" ? "[x]" : "[ ]";
        return `- ${marker} ${stripHtml(text).trim()}`;
      });
  });

  // Ordered lists
  s = s.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, content) => {
    let idx = 0;
    return content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi,
      (_: string, text: string) => {
        idx++;
        return `+ ${stripHtml(text).trim()}`;
      });
  });

  // Unordered lists
  s = s.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, content) => {
    return content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi,
      (_: string, text: string) => `- ${stripHtml(text).trim()}`);
  });

  // Horizontal rules
  s = s.replace(/<hr\s*\/?>/gi, "#line(length: 100%)");

  // Images
  s = s.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi,
    (_, src, alt) => `#image("${src}"${alt ? `, alt: "${alt}"` : ""})`);
  s = s.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi,
    (_, src) => `#image("${src}")`);

  // Paragraphs
  s = s.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, content) => {
    const text = processInline(content);
    return text.trim() ? `${text.trim()}\n` : "";
  });

  // --- Inline processing for remaining ---
  s = processInline(s);

  // Strip remaining HTML tags
  s = s.replace(/<\/?[^>]+>/g, "");

  // Decode HTML entities
  s = decodeHtmlEntities(s);

  return s;
}

function processInline(s: string): string {
  // Inline math
  s = s.replace(/<span[^>]*data-type="mathInline"[^>]*data-latex="([^"]*)"[^>]*>[\s\S]*?<\/span>/gi,
    (_, latex) => `$${decodeHtmlEntities(latex)}$`);

  // Footnotes
  s = s.replace(/<span[^>]*data-type="footnote-ref"[^>]*data-note="([^"]*)"[^>]*>[\s\S]*?<\/span>/gi,
    (_, note) => `#footnote[${decodeHtmlEntities(note)}]`);

  // Bold
  s = s.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, (_, c) => `*${stripTags(c)}*`);
  s = s.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, (_, c) => `*${stripTags(c)}*`);

  // Italic
  s = s.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, (_, c) => `_${stripTags(c)}_`);
  s = s.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, (_, c) => `_${stripTags(c)}_`);

  // Underline
  s = s.replace(/<u[^>]*>([\s\S]*?)<\/u>/gi, (_, c) => `#underline[${stripTags(c)}]`);

  // Strikethrough
  s = s.replace(/<s[^>]*>([\s\S]*?)<\/s>/gi, (_, c) => `#strike[${stripTags(c)}]`);
  s = s.replace(/<del[^>]*>([\s\S]*?)<\/del>/gi, (_, c) => `#strike[${stripTags(c)}]`);

  // Inline code
  s = s.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, c) => `\`${stripTags(c)}\``);

  // Highlight/mark
  s = s.replace(/<mark[^>]*>([\s\S]*?)<\/mark>/gi, (_, c) => `#highlight[${stripTags(c)}]`);

  // Superscript / Subscript
  s = s.replace(/<sup[^>]*>([\s\S]*?)<\/sup>/gi, (_, c) => `#super[${stripTags(c)}]`);
  s = s.replace(/<sub[^>]*>([\s\S]*?)<\/sub>/gi, (_, c) => `#sub[${stripTags(c)}]`);

  // Links
  s = s.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
    (_, href, text) => `#link("${href}")[${stripTags(text)}]`);

  // Colored text
  s = s.replace(/<span[^>]*style="[^"]*color:\s*([^;"]*)[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
    (_, color, text) => `#text(fill: rgb("${color}"))[${stripTags(text)}]`);

  // Line breaks
  s = s.replace(/<br\s*\/?>/gi, " \\\n");

  return s;
}

function processTable(content: string): string {
  const rows: string[][] = [];
  const rowMatches = content.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];

  for (const row of rowMatches) {
    const cells: string[] = [];
    const cellMatches = row.match(/<(?:td|th)[^>]*>[\s\S]*?<\/(?:td|th)>/gi) || [];
    for (const cell of cellMatches) {
      const text = stripHtml(cell.replace(/<\/?(?:td|th)[^>]*>/gi, "")).trim();
      cells.push(`[${text}]`);
    }
    rows.push(cells);
  }

  if (rows.length === 0) return "";

  const cols = Math.max(...rows.map(r => r.length));
  let result = `#table(\n  columns: ${cols},\n`;

  // If first row is header (th)
  const firstRow = rowMatches[0] || "";
  const isHeader = /<th/i.test(firstRow);

  for (let i = 0; i < rows.length; i++) {
    if (i === 0 && isHeader) {
      result += `  table.header(${rows[i].join(", ")}),\n`;
    } else {
      result += `  ${rows[i].join(", ")},\n`;
    }
  }

  result += ")";
  return result;
}

function getTypstColor(type: string): string {
  const map: Record<string, string> = {
    note: "blue",
    tip: "green",
    warning: "yellow",
    danger: "red",
    info: "blue",
    caution: "orange",
  };
  return map[type] || "blue";
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}

function stripInline(s: string): string {
  // Process inline formatting first, then strip remaining tags
  let result = processInline(s);
  result = result.replace(/<[^>]+>/g, "");
  return result.trim();
}

function decodeHtmlEntities(s: string): string {
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
