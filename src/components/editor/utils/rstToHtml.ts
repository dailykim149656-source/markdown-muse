/**
 * Converts reStructuredText (.rst) source to HTML.
 * Supports: headings, inline formatting, lists, code blocks, directives,
 * math, images, links, tables, admonitions, and basic roles.
 */

export function rstToHtml(rst: string): string {
  let lines = rst.split("\n");
  let html = "";
  let i = 0;

  const headingChars: Record<string, number> = {};
  let headingLevel = 0;

  const getHeadingLevel = (ch: string, hasOverline: boolean): number => {
    const key = hasOverline ? `over_${ch}` : ch;
    if (!(key in headingChars)) {
      headingLevel++;
      headingChars[key] = headingLevel;
    }
    return headingChars[key];
  };

  const isAdornmentLine = (line: string): string | null => {
    if (line.length < 2) return null;
    const ch = line[0];
    if (/^[=\-~^"+`:#'.*_!$%&,;?@\\|/<>(){}\[\]]+$/.test(line) && line.split("").every(c => c === ch)) {
      return ch;
    }
    return null;
  };

  const processInline = (text: string): string => {
    // Bold
    text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    // Italic
    text = text.replace(/\*(.+?)\*/g, "<em>$1</em>");
    // Inline literal
    text = text.replace(/``(.+?)``/g, "<code>$1</code>");
    // Interpreted text with role :role:`text`
    text = text.replace(/:math:`([^`]+)`/g, '<span class="math">\\($1\\)</span>');
    text = text.replace(/:sub:`([^`]+)`/g, "<sub>$1</sub>");
    text = text.replace(/:sup:`([^`]+)`/g, "<sup>$1</sup>");
    text = text.replace(/:emphasis:`([^`]+)`/g, "<em>$1</em>");
    text = text.replace(/:strong:`([^`]+)`/g, "<strong>$1</strong>");
    text = text.replace(/:title-reference:`([^`]+)`/g, "<cite>$1</cite>");
    text = text.replace(/:abbr:`([^`]+)`/g, "<abbr>$1</abbr>");
    // Reference links `text <url>`_
    text = text.replace(/`([^<]+?)\s*<([^>]+)>`_/g, '<a href="$2">$1</a>');
    // Simple reference `text`_
    text = text.replace(/`([^`]+)`_/g, '<a href="#">$1</a>');
    // Anonymous reference `text`__
    text = text.replace(/`([^`]+)`__/g, '<a href="#">$1</a>');
    // Standalone URLs
    text = text.replace(/(^|[^"=])(https?:\/\/[^\s<>]+)/g, '$1<a href="$2">$2</a>');
    return text;
  };

  const collectIndentedBlock = (startIdx: number, minIndent = 3): { block: string; endIdx: number } => {
    const blockLines: string[] = [];
    let j = startIdx;
    while (j < lines.length) {
      const line = lines[j];
      if (line.trim() === "") {
        blockLines.push("");
        j++;
        continue;
      }
      const indent = line.match(/^(\s*)/)?.[1]?.length || 0;
      if (indent >= minIndent) {
        blockLines.push(line.slice(minIndent));
        j++;
      } else {
        break;
      }
    }
    // Trim trailing empty lines
    while (blockLines.length && blockLines[blockLines.length - 1].trim() === "") blockLines.pop();
    return { block: blockLines.join("\n"), endIdx: j };
  };

  while (i < lines.length) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : "";
    const prevLine = i > 0 ? lines[i - 1] : "";

    // --- Heading detection (underline style) ---
    if (i + 1 < lines.length && line.trim() !== "" && !isAdornmentLine(line)) {
      const adorn = isAdornmentLine(nextLine);
      if (adorn && nextLine.length >= line.trim().length) {
        // Check if previous line is also adornment (overline)
        let hasOverline = false;
        if (i > 0 && isAdornmentLine(prevLine) === adorn) {
          hasOverline = true;
        }
        const level = Math.min(getHeadingLevel(adorn, hasOverline), 6);
        html += `<h${level}>${processInline(line.trim())}</h${level}>\n`;
        i += 2; // skip title + underline
        continue;
      }
    }

    // Overline heading: adornment, text, adornment
    if (isAdornmentLine(line) && i + 2 < lines.length) {
      const titleLine = lines[i + 1];
      const underline = lines[i + 2];
      if (isAdornmentLine(underline) === isAdornmentLine(line) && titleLine.trim() !== "") {
        const level = Math.min(getHeadingLevel(isAdornmentLine(line)!, true), 6);
        html += `<h${level}>${processInline(titleLine.trim())}</h${level}>\n`;
        i += 3;
        continue;
      }
    }

    // --- Directives ---
    const directiveMatch = line.match(/^\.\.\s+(\w[\w-]*)::(?:\s+(.*))?$/);
    if (directiveMatch) {
      const directive = directiveMatch[1].toLowerCase();
      const argument = directiveMatch[2]?.trim() || "";
      i++;

      // Skip options (lines starting with :option:)
      while (i < lines.length && /^\s+:[\w-]+:/.test(lines[i])) i++;
      // Skip blank line after options
      if (i < lines.length && lines[i].trim() === "") i++;

      const { block, endIdx } = collectIndentedBlock(i);
      i = endIdx;

      if (directive === "code-block" || directive === "code" || directive === "sourcecode") {
        const lang = argument || "";
        html += `<pre><code${lang ? ` class="language-${lang}"` : ""}>${block.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>\n`;
      } else if (directive === "math") {
        html += `<div class="math">\\[${block}\\]</div>\n`;
      } else if (directive === "image" || directive === "figure") {
        html += `<img src="${argument}" alt="${argument}" />\n`;
        if (block.trim()) {
          html += `<p>${processInline(block.trim())}</p>\n`;
        }
      } else if (directive === "contents") {
        html += `<div data-type="toc"><p>목차</p></div>\n`;
      } else if (["note", "warning", "tip", "important", "caution", "danger", "error", "hint", "attention", "admonition"].includes(directive)) {
        const colorMap: Record<string, string> = {
          note: "blue", tip: "green", hint: "green",
          warning: "yellow", caution: "yellow", attention: "yellow",
          important: "purple", danger: "red", error: "red",
        };
        const color = colorMap[directive] || "blue";
        const title = argument || directive.charAt(0).toUpperCase() + directive.slice(1);
        html += `<div data-type="admonition" data-admonition-color="${color}"><p><strong>${title}</strong></p><p>${processInline(block)}</p></div>\n`;
      } else {
        // Unknown directive - render as blockquote
        if (block.trim()) {
          html += `<blockquote><p>${processInline(block)}</p></blockquote>\n`;
        }
      }
      continue;
    }

    // --- Comment (.. without directive) ---
    if (/^\.\.\s*$/.test(line) || /^\.\.\s+[^:]/.test(line) && !directiveMatch) {
      // Skip comments
      i++;
      while (i < lines.length && (lines[i].trim() === "" || /^\s+/.test(lines[i]))) i++;
      continue;
    }

    // --- Block math (starts with .. math::, already handled above) ---

    // --- Bullet list ---
    if (/^(\s*)[-*+]\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^(\s*)[-*+]\s+/.test(lines[i])) {
        listItems.push(processInline(lines[i].replace(/^\s*[-*+]\s+/, "")));
        i++;
        // Collect continuation lines
        while (i < lines.length && /^\s{2,}/.test(lines[i]) && !/^(\s*)[-*+]\s+/.test(lines[i])) {
          listItems[listItems.length - 1] += " " + processInline(lines[i].trim());
          i++;
        }
      }
      html += "<ul>\n" + listItems.map(li => `<li>${li}</li>`).join("\n") + "\n</ul>\n";
      continue;
    }

    // --- Enumerated list ---
    if (/^\s*\d+[\.\)]\s+/.test(line) || /^\s*#[\.\)]\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && (/^\s*\d+[\.\)]\s+/.test(lines[i]) || /^\s*#[\.\)]\s+/.test(lines[i]))) {
        listItems.push(processInline(lines[i].replace(/^\s*[\d#]+[\.\)]\s+/, "")));
        i++;
      }
      html += "<ol>\n" + listItems.map(li => `<li>${li}</li>`).join("\n") + "\n</ol>\n";
      continue;
    }

    // --- Line block (|) ---
    if (/^\|(\s+|$)/.test(line)) {
      const blockLines: string[] = [];
      while (i < lines.length && /^\|(\s+|$)/.test(lines[i])) {
        blockLines.push(processInline(lines[i].replace(/^\|\s*/, "")));
        i++;
      }
      html += blockLines.map(l => `<p>${l}</p>`).join("\n") + "\n";
      continue;
    }

    // --- Block quote (indented text) ---
    if (/^\s{2,}\S/.test(line) && prevLine.trim() === "") {
      const quoteLines: string[] = [];
      while (i < lines.length && (/^\s{2,}/.test(lines[i]) || lines[i].trim() === "")) {
        if (lines[i].trim() === "" && i + 1 < lines.length && !/^\s{2,}/.test(lines[i + 1])) break;
        quoteLines.push(lines[i].trim());
        i++;
      }
      html += `<blockquote><p>${processInline(quoteLines.join(" "))}</p></blockquote>\n`;
      continue;
    }

    // --- Grid/Simple table ---
    if (/^\+[-=+]+\+\s*$/.test(line) || /^=+(\s+=+)+\s*$/.test(line)) {
      // Collect table lines
      const tableLines: string[] = [];
      while (i < lines.length && (lines[i].startsWith("+") || lines[i].startsWith("|") || /^=+/.test(lines[i]))) {
        tableLines.push(lines[i]);
        i++;
      }
      html += parseRstTable(tableLines);
      continue;
    }

    // --- Horizontal rule (4+ of same char on its own) ---
    if (isAdornmentLine(line) && line.length >= 4 && (prevLine.trim() === "" || i === 0)) {
      html += "<hr />\n";
      i++;
      continue;
    }

    // --- Blank line ---
    if (line.trim() === "") {
      i++;
      continue;
    }

    // --- Paragraph ---
    const paraLines: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() !== "" && !isAdornmentLine(lines[i]) &&
      !/^\.\.\s+/.test(lines[i]) && !/^(\s*)[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+[\.\)]\s+/.test(lines[i]) && !/^\+[-=+]+\+/.test(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    html += `<p>${processInline(paraLines.join(" "))}</p>\n`;
  }

  return html;
}

function parseRstTable(tableLines: string[]): string {
  // Simple grid table parser
  const rows: string[][] = [];
  let isHeader = false;
  let currentRow: string[] = [];

  for (const line of tableLines) {
    if (/^\+[=+]+\+\s*$/.test(line)) {
      // Header separator
      if (currentRow.length) {
        rows.push(currentRow);
        isHeader = true;
      }
      currentRow = [];
    } else if (/^\+[-+]+\+\s*$/.test(line)) {
      // Row separator
      if (currentRow.length) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else if (line.startsWith("|")) {
      const cells = line.split("|").slice(1, -1).map(c => c.trim());
      if (currentRow.length === 0) {
        currentRow = cells;
      } else {
        // Multi-line cell - append
        cells.forEach((c, idx) => {
          if (idx < currentRow.length && c) {
            currentRow[idx] += " " + c;
          }
        });
      }
    }
  }
  if (currentRow.length) rows.push(currentRow);

  if (rows.length === 0) return "";

  let html = "<table>\n";
  rows.forEach((row, idx) => {
    const tag = (isHeader && idx === 0) ? "th" : "td";
    if (isHeader && idx === 0) html += "<thead>\n";
    html += "<tr>\n";
    row.forEach(cell => {
      html += `<${tag}>${cell.trim()}</${tag}>\n`;
    });
    html += "</tr>\n";
    if (isHeader && idx === 0) html += "</thead>\n<tbody>\n";
  });
  if (isHeader) html += "</tbody>\n";
  html += "</table>\n";
  return html;
}
