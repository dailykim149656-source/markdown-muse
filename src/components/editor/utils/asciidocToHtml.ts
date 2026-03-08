/**
 * Lightweight AsciiDoc to HTML converter.
 * Handles common AsciiDoc syntax for import into the editor.
 */

export function asciidocToHtml(adoc: string): string {
  let html = "";
  const lines = adoc.split("\n");
  let i = 0;
  let inList = false;
  let listType = "";

  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const processInline = (text: string): string => {
    let result = text;
    // Bold
    result = result.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    result = result.replace(/\*(.+?)\*/g, "<strong>$1</strong>");
    // Italic
    result = result.replace(/__(.+?)__/g, "<em>$1</em>");
    result = result.replace(/_(.+?)_/g, "<em>$1</em>");
    // Monospace
    result = result.replace(/`(.+?)`/g, "<code>$1</code>");
    // Superscript / subscript
    result = result.replace(/\^(.+?)\^/g, "<sup>$1</sup>");
    result = result.replace(/~(.+?)~/g, "<sub>$1</sub>");
    // Links: https://url[label] or link:url[label]
    result = result.replace(/(?:link:)?(https?:\/\/[^\s\[]+)\[([^\]]*)\]/g, '<a href="$1">$2</a>');
    // Image: image::url[alt]
    result = result.replace(/image::([^\[]+)\[([^\]]*)\]/g, '<img src="$1" alt="$2" />');
    // Inline image: image:url[alt]
    result = result.replace(/image:([^\[]+)\[([^\]]*)\]/g, '<img src="$1" alt="$2" />');
    return result;
  };

  const closeList = () => {
    if (inList) {
      html += listType === "ul" ? "</ul>\n" : "</ol>\n";
      inList = false;
      listType = "";
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    // Empty line
    if (line.trim() === "") {
      closeList();
      i++;
      continue;
    }

    // Document title: = Title
    const h1Match = line.match(/^=\s+(.+)/);
    if (h1Match && !line.startsWith("==")) {
      closeList();
      html += "<h1>" + processInline(escapeHtml(h1Match[1])) + "</h1>\n";
      i++;
      continue;
    }

    // Headings: == to =====
    const headingMatch = line.match(/^(={2,6})\s+(.+)/);
    if (headingMatch) {
      closeList();
      const level = headingMatch[1].length; // == = h2, === = h3, etc
      html += `<h${level}>` + processInline(escapeHtml(headingMatch[2])) + `</h${level}>\n`;
      i++;
      continue;
    }

    // Admonition blocks: NOTE: / TIP: / WARNING: / IMPORTANT: / CAUTION:
    const admonitionMatch = line.match(/^(NOTE|TIP|WARNING|IMPORTANT|CAUTION):\s*(.*)/);
    if (admonitionMatch) {
      closeList();
      const typeMap: Record<string, string> = {
        NOTE: "note", TIP: "tip", WARNING: "warning", IMPORTANT: "warning", CAUTION: "danger"
      };
      const type = typeMap[admonitionMatch[1]] || "note";
      html += `<div data-type="admonition" data-admonition-type="${type}"><p>` +
        processInline(escapeHtml(admonitionMatch[2])) + "</p></div>\n";
      i++;
      continue;
    }

    // Source code block: [source,lang] followed by ----
    const sourceMatch = line.match(/^\[source(?:,\s*(\w+))?\]/);
    if (sourceMatch) {
      const lang = sourceMatch[1] || "";
      i++;
      if (i < lines.length && lines[i].startsWith("----")) {
        i++;
        let code = "";
        while (i < lines.length && !lines[i].startsWith("----")) {
          code += escapeHtml(lines[i]) + "\n";
          i++;
        }
        i++; // skip closing ----
        const langClass = lang ? ` class="language-${lang}"` : "";
        html += `<pre><code${langClass}>${code.trimEnd()}</code></pre>\n`;
        continue;
      }
    }

    // Listing block: ----
    if (line.startsWith("----")) {
      closeList();
      i++;
      let code = "";
      while (i < lines.length && !lines[i].startsWith("----")) {
        code += escapeHtml(lines[i]) + "\n";
        i++;
      }
      i++;
      html += `<pre><code>${code.trimEnd()}</code></pre>\n`;
      continue;
    }

    // Blockquote (starts with > or ____)
    if (line.startsWith("____")) {
      closeList();
      i++;
      let quote = "";
      while (i < lines.length && !lines[i].startsWith("____")) {
        quote += processInline(escapeHtml(lines[i])) + " ";
        i++;
      }
      i++;
      html += `<blockquote><p>${quote.trim()}</p></blockquote>\n`;
      continue;
    }

    // Horizontal rule: --- or '''
    if (line.match(/^(-{3,}|'{3,})$/)) {
      closeList();
      html += "<hr />\n";
      i++;
      continue;
    }

    // Unordered list: * item or - item
    const ulMatch = line.match(/^(\*+|-)\s+(.*)/);
    if (ulMatch) {
      if (!inList || listType !== "ul") {
        closeList();
        html += "<ul>\n";
        inList = true;
        listType = "ul";
      }
      html += "  <li>" + processInline(escapeHtml(ulMatch[2])) + "</li>\n";
      i++;
      continue;
    }

    // Ordered list: . item or 1. item
    const olMatch = line.match(/^(?:\.|\d+\.)\s+(.*)/);
    if (olMatch) {
      if (!inList || listType !== "ol") {
        closeList();
        html += "<ol>\n";
        inList = true;
        listType = "ol";
      }
      html += "  <li>" + processInline(escapeHtml(olMatch[1])) + "</li>\n";
      i++;
      continue;
    }

    // Table: |=== block
    if (line.startsWith("|===")) {
      closeList();
      i++;
      const rows: string[][] = [];
      let isHeader = true;
      while (i < lines.length && !lines[i].startsWith("|===")) {
        const rowLine = lines[i].trim();
        if (rowLine === "") { i++; continue; }
        const cells = rowLine.split("|").filter((_, idx) => idx > 0).map(c => c.trim());
        if (cells.length > 0) {
          rows.push(cells);
        }
        i++;
      }
      i++; // skip closing |===

      if (rows.length > 0) {
        html += "<table>\n";
        rows.forEach((row, ri) => {
          html += "  <tr>\n";
          const tag = ri === 0 ? "th" : "td";
          row.forEach(cell => {
            html += `    <${tag}>${processInline(escapeHtml(cell))}</${tag}>\n`;
          });
          html += "  </tr>\n";
        });
        html += "</table>\n";
      }
      continue;
    }

    // Regular paragraph
    closeList();
    html += "<p>" + processInline(escapeHtml(line)) + "</p>\n";
    i++;
  }

  closeList();
  return html;
}
