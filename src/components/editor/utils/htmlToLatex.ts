/**
 * Converts Tiptap HTML output to LaTeX source code.
 */

const PREAMBLE = `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{ulem}
\\usepackage{xcolor}
\\usepackage{soul}

\\title{문서 제목}
\\author{저자}
\\date{\\today}

\\begin{document}

\\maketitle

`;

const POSTAMBLE = `
\\end{document}`;

function escapeLatex(text: string): string {
  return text
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/[&%$#_{}]/g, (m) => `\\${m}`)
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

function processNode(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeLatex(node.textContent || "");
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const children = Array.from(el.childNodes).map(processNode).join("");

  switch (tag) {
    case "h1":
      return `\\section{${children}}\n\n`;
    case "h2":
      return `\\subsection{${children}}\n\n`;
    case "h3":
      return `\\subsubsection{${children}}\n\n`;
    case "p": {
      if (el.style.textAlign === "center") return `\\begin{center}\n${children}\n\\end{center}\n\n`;
      if (el.style.textAlign === "right") return `\\begin{flushright}\n${children}\n\\end{flushright}\n\n`;
      return `${children}\n\n`;
    }
    case "strong":
    case "b":
      return `\\textbf{${children}}`;
    case "em":
    case "i":
      return `\\textit{${children}}`;
    case "u":
      return `\\underline{${children}}`;
    case "s":
    case "del":
      return `\\sout{${children}}`;
    case "code":
      return `\\texttt{${children}}`;
    case "pre":
      return `\\begin{verbatim}\n${el.textContent || ""}\n\\end{verbatim}\n\n`;
    case "blockquote":
      return `\\begin{quote}\n${children}\n\\end{quote}\n\n`;
    case "ul": {
      // Check if task list
      if (el.getAttribute("data-type") === "taskList") {
        const items = Array.from(el.children).map((li) => {
          const checked = li.querySelector('input[type="checkbox"]') as HTMLInputElement;
          const isChecked = checked?.checked;
          const content = Array.from(li.childNodes)
            .filter((n) => !(n as HTMLElement).querySelector?.('input[type="checkbox"]') && (n as HTMLElement).tagName !== "LABEL")
            .map(processNode)
            .join("");
          return `  \\item[${isChecked ? "$\\boxtimes$" : "$\\square$"}] ${content.trim()}`;
        });
        return `\\begin{itemize}\n${items.join("\n")}\n\\end{itemize}\n\n`;
      }
      const items = Array.from(el.children).map((li) => `  \\item ${processNode(li).trim()}`);
      return `\\begin{itemize}\n${items.join("\n")}\n\\end{itemize}\n\n`;
    }
    case "ol": {
      const items = Array.from(el.children).map((li) => `  \\item ${processNode(li).trim()}`);
      return `\\begin{enumerate}\n${items.join("\n")}\n\\end{enumerate}\n\n`;
    }
    case "li":
      return children;
    case "hr":
      return `\\hrulefill\n\n`;
    case "br":
      return `\\\\\n`;
    case "a": {
      const href = el.getAttribute("href") || "";
      return `\\href{${href}}{${children}}`;
    }
    case "img": {
      const src = el.getAttribute("src") || "";
      const alt = el.getAttribute("alt") || "";
      if (src.startsWith("data:")) {
        return `% [이미지: ${alt || "embedded image"}]\n`;
      }
      return `\\begin{figure}[h]\n  \\centering\n  \\includegraphics[width=0.8\\textwidth]{${src}}\n  ${alt ? `\\caption{${escapeLatex(alt)}}` : ""}\n\\end{figure}\n\n`;
    }
    case "table": {
      return processTable(el);
    }
    case "mark":
      return `\\hl{${children}}`;
    case "sub":
      return `\\textsubscript{${children}}`;
    case "sup":
      return `\\textsuperscript{${children}}`;
    case "span": {
      // Check for math nodes
      if (el.getAttribute("data-type") === "mathInline") {
        const latex = el.getAttribute("data-latex") || el.textContent || "";
        return `$${latex}$`;
      }
      // Font color
      const color = el.style.color;
      if (color) {
        return `\\textcolor{${cssColorToLatex(color)}}{${children}}`;
      }
      return children;
    }
    case "div": {
      // Math block
      if (el.getAttribute("data-type") === "mathBlock") {
        const latex = el.getAttribute("data-latex") || el.textContent || "";
        return `\\[\n${latex}\n\\]\n\n`;
      }
      return children;
    }
    default:
      return children;
  }
}

function processTable(el: HTMLElement): string {
  const rows = el.querySelectorAll("tr");
  if (rows.length === 0) return "";

  const firstRow = rows[0];
  const colCount = firstRow.querySelectorAll("th, td").length;
  const colSpec = Array(colCount).fill("l").join(" | ");

  let latex = `\\begin{tabular}{| ${colSpec} |}\n\\hline\n`;

  rows.forEach((row, rowIdx) => {
    const cells = row.querySelectorAll("th, td");
    const cellTexts = Array.from(cells).map((cell) =>
      Array.from(cell.childNodes).map(processNode).join("").trim()
    );
    latex += cellTexts.join(" & ") + " \\\\\n\\hline\n";
    if (rowIdx === 0 && row.querySelector("th")) {
      // Already added hline
    }
  });

  latex += `\\end{tabular}\n\n`;
  return latex;
}

function cssColorToLatex(color: string): string {
  // Simple color mapping
  if (color.includes("rgb")) {
    const match = color.match(/\d+/g);
    if (match && match.length >= 3) {
      const [r, g, b] = match.map(Number);
      return `[RGB]{${r},${g},${b}}`;
    }
  }
  const colorMap: Record<string, string> = {
    red: "red", blue: "blue", green: "green", black: "black",
    white: "white", yellow: "yellow", orange: "orange", purple: "purple",
  };
  return colorMap[color] || "black";
}

export function htmlToLatex(html: string, includeWrapper = true): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const body = doc.body;
  const content = Array.from(body.childNodes).map(processNode).join("");

  // Clean up multiple blank lines
  const cleaned = content.replace(/\n{3,}/g, "\n\n").trim();

  if (includeWrapper) {
    return PREAMBLE + cleaned + POSTAMBLE;
  }
  return cleaned;
}

export function latexToHtml(latex: string): string {
  // Reuse the existing parser from LatexEditor
  let body = latex;
  const beginDoc = latex.indexOf("\\begin{document}");
  const endDoc = latex.indexOf("\\end{document}");
  if (beginDoc !== -1) {
    body = latex.substring(beginDoc + "\\begin{document}".length, endDoc !== -1 ? endDoc : undefined);
  }

  // Remove \maketitle
  body = body.replace(/\\maketitle/g, "");

  // Sections
  body = body.replace(/\\section\{([^}]*)\}/g, "<h1>$1</h1>");
  body = body.replace(/\\subsection\{([^}]*)\}/g, "<h2>$1</h2>");
  body = body.replace(/\\subsubsection\{([^}]*)\}/g, "<h3>$1</h3>");

  // Text formatting
  body = body.replace(/\\textbf\{([^}]*)\}/g, "<strong>$1</strong>");
  body = body.replace(/\\textit\{([^}]*)\}/g, "<em>$1</em>");
  body = body.replace(/\\underline\{([^}]*)\}/g, "<u>$1</u>");
  body = body.replace(/\\emph\{([^}]*)\}/g, "<em>$1</em>");
  body = body.replace(/\\texttt\{([^}]*)\}/g, "<code>$1</code>");
  body = body.replace(/\\sout\{([^}]*)\}/g, "<s>$1</s>");

  // Display math
  body = body.replace(/\\\[([\s\S]*?)\\\]/g, '<div data-type="mathBlock" data-latex="$1">$$$$1$$</div>');
  body = body.replace(/\$\$([\s\S]*?)\$\$/g, '<div data-type="mathBlock" data-latex="$1">$$$$1$$</div>');

  // Inline math
  body = body.replace(/\$([^$\n]+?)\$/g, '<span data-type="mathInline" data-latex="$1">$$$1$</span>');

  // Environments
  body = body.replace(/\\begin\{equation\}([\s\S]*?)\\end\{equation\}/g,
    '<div data-type="mathBlock" data-latex="$1">$$$$1$$</div>');
  body = body.replace(/\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}/g,
    '<div data-type="mathBlock" data-latex="\\begin{aligned}$1\\end{aligned}">$$\\begin{aligned}$1\\end{aligned}$$</div>');

  // Lists
  body = body.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g, (_, items) => {
    const lis = items.replace(/\\item\s*/g, "</li><li>").replace(/^<\/li>/, "");
    return `<ul>${lis}</li></ul>`;
  });
  body = body.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g, (_, items) => {
    const lis = items.replace(/\\item\s*/g, "</li><li>").replace(/^<\/li>/, "");
    return `<ol>${lis}</li></ol>`;
  });

  // Quotes
  body = body.replace(/\\begin\{quote\}([\s\S]*?)\\end\{quote\}/g, "<blockquote>$1</blockquote>");

  // Verbatim
  body = body.replace(/\\begin\{verbatim\}([\s\S]*?)\\end\{verbatim\}/g, "<pre><code>$1</code></pre>");

  // Links
  body = body.replace(/\\href\{([^}]*)\}\{([^}]*)\}/g, '<a href="$1">$2</a>');

  // Line breaks
  body = body.replace(/\\\\/g, "<br/>");

  // Paragraphs
  body = body.replace(/\n\n+/g, "</p><p>");

  // Clean remaining commands
  body = body.replace(/\\[a-zA-Z]+\{[^}]*\}/g, "");
  body = body.replace(/\\[a-zA-Z]+/g, "");

  return `<p>${body}</p>`;
}
