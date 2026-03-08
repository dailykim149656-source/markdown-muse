/**
 * Converts Tiptap HTML output to LaTeX source code.
 * Supports: admonitions, footnotes, TOC, figure captions, cross-references,
 * code blocks with language, task lists, colored text, highlights, tables, math.
 */

// ─── Preamble builder ───
interface LatexExportOptions {
  title?: string;
  author?: string;
  date?: string;
  documentClass?: string;
  fontSize?: string;
  includeWrapper?: boolean;
  /** Extra packages to include */
  extraPackages?: string[];
}

const DEFAULT_OPTIONS: LatexExportOptions = {
  title: "문서 제목",
  author: "저자",
  date: "\\today",
  documentClass: "article",
  fontSize: "11pt",
  includeWrapper: true,
};

function buildPreamble(opts: LatexExportOptions, usedFeatures: Set<string>): string {
  const packages = [
    "[utf8]{inputenc}",
    "{amsmath}",
    "{amssymb}",
    "{graphicx}",
    "[hidelinks]{hyperref}",
    "{ulem}",
    "{xcolor}",
    "{soul}",
  ];

  if (usedFeatures.has("table")) packages.push("{array}", "{booktabs}");
  if (usedFeatures.has("code")) packages.push("{listings}", "{xcolor}");
  if (usedFeatures.has("admonition")) packages.push("[most]{tcolorbox}");
  if (usedFeatures.has("enumitem")) packages.push("{enumitem}");
  if (usedFeatures.has("float")) packages.push("{float}");
  if (usedFeatures.has("caption")) packages.push("{caption}");
  if (opts.extraPackages) {
    opts.extraPackages.forEach(p => packages.push(`{${p}}`));
  }

  let preamble = `\\documentclass[${opts.fontSize || "11pt"}]{${opts.documentClass || "article"}}\n`;
  packages.forEach(p => {
    preamble += `\\usepackage${p}\n`;
  });

  // Listing style for code blocks
  if (usedFeatures.has("code")) {
    preamble += `\n\\lstset{
  basicstyle=\\ttfamily\\small,
  breaklines=true,
  frame=single,
  backgroundcolor=\\color{gray!5},
  numbers=left,
  numberstyle=\\tiny\\color{gray},
  keywordstyle=\\color{blue},
  commentstyle=\\color{green!60!black},
  stringstyle=\\color{red!70!black},
}\n`;
  }

  // Admonition tcolorbox styles
  if (usedFeatures.has("admonition")) {
    preamble += `
\\newtcolorbox{admonitionbox}[2][]{
  colback=#2!5!white, colframe=#2!75!black,
  fonttitle=\\bfseries, title={#1},
  sharp corners, boxrule=0.8pt, left=6pt, right=6pt, top=4pt, bottom=4pt
}\n`;
  }

  preamble += `\n\\title{${escapeLatex(opts.title || "문서 제목")}}`;
  preamble += `\n\\author{${escapeLatex(opts.author || "저자")}}`;
  preamble += `\n\\date{${opts.date || "\\today"}}`;
  preamble += `\n\n\\begin{document}\n\n\\maketitle\n\n`;

  return preamble;
}

const POSTAMBLE = `\n\\end{document}`;

// ─── Escape helpers ───

function escapeLatex(text: string): string {
  return text
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/[&%$#_{}]/g, (m) => `\\${m}`)
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

// Don't escape inside verbatim / math
function escapeLatexLight(text: string): string {
  return text
    .replace(/[&%$#_{}]/g, (m) => `\\${m}`)
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

// ─── Color mapping ───

const ADMONITION_COLOR_MAP: Record<string, string> = {
  blue: "blue",
  green: "green!70!black",
  yellow: "yellow!80!black",
  red: "red",
  purple: "violet",
  orange: "orange",
  teal: "teal",
  gray: "gray",
};

function cssColorToLatex(color: string): string {
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

// ─── Footnote tracking ───

interface ConversionState {
  footnotes: { id: string; text: string; num: number }[];
  footnoteRefCount: number;
  usedFeatures: Set<string>;
  figureCount: number;
  tableCount: number;
}

// ─── Node processor ───

function processNode(node: ChildNode, state: ConversionState): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeLatex(node.textContent || "");
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const children = () => Array.from(el.childNodes).map(n => processNode(n, state)).join("");

  switch (tag) {
    // ─── Headings ───
    case "h1":
      return `\\section{${children()}}\n\n`;
    case "h2":
      return `\\subsection{${children()}}\n\n`;
    case "h3":
      return `\\subsubsection{${children()}}\n\n`;
    case "h4":
      return `\\paragraph{${children()}}\n\n`;
    case "h5":
    case "h6":
      return `\\subparagraph{${children()}}\n\n`;

    // ─── Paragraphs ───
    case "p": {
      const align = el.style.textAlign;
      const content = children();
      if (!content.trim()) return "\n";
      if (align === "center") return `\\begin{center}\n${content}\n\\end{center}\n\n`;
      if (align === "right") return `\\begin{flushright}\n${content}\n\\end{flushright}\n\n`;
      return `${content}\n\n`;
    }

    // ─── Inline formatting ───
    case "strong":
    case "b":
      return `\\textbf{${children()}}`;
    case "em":
    case "i":
      return `\\textit{${children()}}`;
    case "u":
      return `\\underline{${children()}}`;
    case "s":
    case "del":
      return `\\sout{${children()}}`;
    case "code":
      return `\\texttt{${children()}}`;
    case "mark":
      return `\\hl{${children()}}`;
    case "sub":
      return `\\textsubscript{${children()}}`;
    case "sup":
      return `\\textsuperscript{${children()}}`;

    // ─── Code blocks ───
    case "pre": {
      state.usedFeatures.add("code");
      const codeEl = el.querySelector("code");
      const rawText = codeEl?.textContent || el.textContent || "";
      // Detect language from class (e.g. language-javascript)
      const langClass = codeEl?.className?.match(/language-(\w+)/);
      const language = langClass ? langClass[1] : "";
      if (language) {
        return `\\begin{lstlisting}[language=${language}]\n${rawText}\n\\end{lstlisting}\n\n`;
      }
      return `\\begin{lstlisting}\n${rawText}\n\\end{lstlisting}\n\n`;
    }

    // ─── Blockquote ───
    case "blockquote":
      return `\\begin{quote}\n${children()}\n\\end{quote}\n\n`;

    // ─── Lists ───
    case "ul": {
      // Task list
      if (el.getAttribute("data-type") === "taskList") {
        state.usedFeatures.add("enumitem");
        const items = Array.from(el.children).map((li) => {
          const checked = li.querySelector('input[type="checkbox"]') as HTMLInputElement;
          const isChecked = checked?.checked;
          const content = Array.from(li.childNodes)
            .filter((n) => !(n as HTMLElement).querySelector?.('input[type="checkbox"]') && (n as HTMLElement).tagName !== "LABEL")
            .map(n => processNode(n, state))
            .join("");
          return `  \\item[${isChecked ? "$\\boxtimes$" : "$\\square$"}] ${content.trim()}`;
        });
        return `\\begin{itemize}\n${items.join("\n")}\n\\end{itemize}\n\n`;
      }
      const items = Array.from(el.children).map((li) => `  \\item ${processNode(li, state).trim()}`);
      return `\\begin{itemize}\n${items.join("\n")}\n\\end{itemize}\n\n`;
    }
    case "ol": {
      const items = Array.from(el.children).map((li) => `  \\item ${processNode(li, state).trim()}`);
      return `\\begin{enumerate}\n${items.join("\n")}\n\\end{enumerate}\n\n`;
    }
    case "li":
      return children();

    // ─── Horizontal rule ───
    case "hr":
      return `\\noindent\\rule{\\textwidth}{0.4pt}\n\n`;

    case "br":
      return `\\\\\n`;

    // ─── Links ───
    case "a": {
      const href = el.getAttribute("href") || "";
      return `\\href{${href}}{${children()}}`;
    }

    // ─── Images / Figures ───
    case "img": {
      state.usedFeatures.add("float");
      state.usedFeatures.add("caption");
      const src = el.getAttribute("src") || "";
      const alt = el.getAttribute("alt") || "";
      if (src.startsWith("data:")) {
        return `% [이미지: ${alt || "embedded image"}]\n`;
      }
      state.figureCount++;
      const label = `fig:figure${state.figureCount}`;
      return `\\begin{figure}[H]\n  \\centering\n  \\includegraphics[width=0.8\\textwidth]{${src}}\n  ${alt ? `\\caption{${escapeLatex(alt)}}` : ""}\n  \\label{${label}}\n\\end{figure}\n\n`;
    }

    // ─── Tables ───
    case "table": {
      state.usedFeatures.add("table");
      state.usedFeatures.add("caption");
      state.tableCount++;
      return processTable(el, state);
    }

    // ─── Span (math, color, footnote-ref) ───
    case "span": {
      const dataType = el.getAttribute("data-type");

      // Math inline
      if (dataType === "mathInline") {
        const latex = el.getAttribute("data-latex") || el.textContent || "";
        return `$${latex}$`;
      }

      // Footnote reference
      if (dataType === "footnote-ref") {
        const fnId = el.getAttribute("data-footnote-id") || "";
        state.footnoteRefCount++;
        const num = state.footnoteRefCount;
        // Find the matching footnote item if already collected
        const existing = state.footnotes.find(f => f.id === fnId);
        if (existing) {
          existing.num = num;
          return `\\footnote{${escapeLatex(existing.text)}}`;
        }
        // Mark placeholder — will be resolved after full pass
        return `%%FOOTNOTE_REF:${fnId}:${num}%%`;
      }

      // Font color
      const color = el.style.color;
      if (color) {
        return `\\textcolor{${cssColorToLatex(color)}}{${children()}}`;
      }

      return children();
    }

    // ─── Div (math block, admonition, footnote-item, mermaid) ───
    case "div": {
      const dataType = el.getAttribute("data-type");

      // Math block
      if (dataType === "mathBlock") {
        const latex = el.getAttribute("data-latex") || el.textContent || "";
        return `\\[\n${latex}\n\\]\n\n`;
      }

      // Admonition
      if (dataType === "admonition") {
        state.usedFeatures.add("admonition");
        const type = el.getAttribute("data-admonition-type") || "note";
        const colorKey = el.getAttribute("data-admonition-color") || "blue";
        const latexColor = ADMONITION_COLOR_MAP[colorKey] || "blue";

        const titleMap: Record<string, string> = {
          note: "노트", warning: "경고", tip: "팁", danger: "위험"
        };
        const title = titleMap[type] || type;
        const content = children();

        return `\\begin{admonitionbox}[${escapeLatex(title)}]{${latexColor}}\n${content.trim()}\n\\end{admonitionbox}\n\n`;
      }

      // Footnote item — collect for later
      if (dataType === "footnote-item") {
        const fnId = el.getAttribute("data-footnote-id") || "";
        const text = el.textContent?.trim() || "";
        state.footnotes.push({ id: fnId, text, num: 0 });
        return ""; // Don't output here — will be inlined via \footnote{}
      }

      // Mermaid — comment out
      if (dataType === "mermaidBlock") {
        return `% [Mermaid 다이어그램 — LaTeX에서 지원되지 않음]\n`;
      }

      return children();
    }

    default:
      return children();
  }
}

// ─── Table processor ───

function processTable(el: HTMLElement, state: ConversionState): string {
  const rows = el.querySelectorAll("tr");
  if (rows.length === 0) return "";

  const firstRow = rows[0];
  const colCount = firstRow.querySelectorAll("th, td").length;
  const colSpec = Array(colCount).fill("l").join(" ");

  const label = `tab:table${state.tableCount}`;
  let hasHeader = !!firstRow.querySelector("th");

  let latex = `\\begin{table}[H]\n  \\centering\n  \\begin{tabular}{${colSpec}}\n  \\toprule\n`;

  rows.forEach((row, rowIdx) => {
    const cells = row.querySelectorAll("th, td");
    const cellTexts = Array.from(cells).map((cell) =>
      Array.from(cell.childNodes).map(n => processNode(n, state)).join("").trim()
    );
    latex += `  ${cellTexts.join(" & ")} \\\\\n`;
    if (rowIdx === 0 && hasHeader) {
      latex += `  \\midrule\n`;
    }
  });

  latex += `  \\bottomrule\n  \\end{tabular}\n  \\caption{표 ${state.tableCount}}\n  \\label{${label}}\n\\end{table}\n\n`;
  return latex;
}

// ─── Post-process: resolve footnote placeholders ───

function resolveFootnotePlaceholders(latex: string, state: ConversionState): string {
  return latex.replace(/%%FOOTNOTE_REF:([^:]+):(\d+)%%/g, (_match, fnId) => {
    const fn = state.footnotes.find(f => f.id === fnId);
    if (fn) {
      return `\\footnote{${escapeLatex(fn.text)}}`;
    }
    return `\\footnote{[각주]}`;
  });
}

// ─── Main export functions ───

export function htmlToLatex(html: string, includeWrapper = true, options?: Partial<LatexExportOptions>): string {
  const opts = { ...DEFAULT_OPTIONS, ...options, includeWrapper };

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const state: ConversionState = {
    footnotes: [],
    footnoteRefCount: 0,
    usedFeatures: new Set(),
    figureCount: 0,
    tableCount: 0,
  };

  // First pass: collect footnote items
  doc.body.querySelectorAll('[data-type="footnote-item"]').forEach(fnEl => {
    const fnId = fnEl.getAttribute("data-footnote-id") || "";
    const text = fnEl.textContent?.trim() || "";
    state.footnotes.push({ id: fnId, text, num: 0 });
  });

  const body = doc.body;
  let content = Array.from(body.childNodes).map(n => processNode(n, state)).join("");

  // Resolve footnote placeholders
  content = resolveFootnotePlaceholders(content, state);

  // Clean up multiple blank lines
  const cleaned = content.replace(/\n{3,}/g, "\n\n").trim();

  if (opts.includeWrapper) {
    return buildPreamble(opts, state.usedFeatures) + cleaned + POSTAMBLE;
  }
  return cleaned;
}

export function latexToHtml(latex: string): string {
  let body = latex;
  let titleHtml = "";

  // Extract title/author/date from preamble before stripping it
  const titleMatch = latex.match(/\\title\{([^}]*)\}/);
  const authorMatch = latex.match(/\\author\{([^}]*)\}/);
  const dateMatch = latex.match(/\\date\{([^}]*)\}/);

  // Extract body from document environment
  const beginDoc = latex.indexOf("\\begin{document}");
  const endDoc = latex.indexOf("\\end{document}");
  if (beginDoc !== -1) {
    body = latex.substring(beginDoc + "\\begin{document}".length, endDoc !== -1 ? endDoc : undefined);
  }

  // Build title block HTML if \maketitle is present and title/author exist
  const hasMaketitle = body.includes("\\maketitle");
  if (hasMaketitle && (titleMatch || authorMatch)) {
    const title = titleMatch ? titleMatch[1] : "";
    const author = authorMatch ? authorMatch[1].replace(/\\\\/g, "<br/>") : "";
    const date = dateMatch ? (dateMatch[1] === "\\today" ? new Date().toLocaleDateString("ko-KR") : dateMatch[1]) : "";
    titleHtml = `<div style="text-align:center;margin-bottom:1.5em">`;
    if (title) titleHtml += `<h1 style="margin-bottom:0.3em">${title}</h1>`;
    if (author) titleHtml += `<p style="font-size:1.1em">${author}</p>`;
    if (date) titleHtml += `<p style="color:#666">${date}</p>`;
    titleHtml += `</div>`;
  }

  // Strip preamble-only commands
  body = body.replace(/\\maketitle/g, "");
  body = body.replace(/\\pagestyle\{[^}]*\}/g, "");
  body = body.replace(/\\thispagestyle\{[^}]*\}/g, "");
  body = body.replace(/\\setlength\{[^}]*\}\{[^}]*\}/g, "");
  body = body.replace(/\\newcommand\{[^}]*\}(?:\[\d+\])?\{[^}]*\}/g, "");

  // Process environments FIRST (before inline replacements)

  // Abstract
  body = body.replace(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/g,
    '<blockquote><em>Abstract:</em> $1</blockquote>');

  // Center environment
  body = body.replace(/\\begin\{center\}([\s\S]*?)\\end\{center\}/g,
    '<div style="text-align:center">$1</div>');

  // Flushleft / flushright
  body = body.replace(/\\begin\{flushright\}([\s\S]*?)\\end\{flushright\}/g,
    '<div style="text-align:right">$1</div>');
  body = body.replace(/\\begin\{flushleft\}([\s\S]*?)\\end\{flushleft\}/g,
    '<div style="text-align:left">$1</div>');

  // Display math environments (before inline processing)
  body = body.replace(/\\begin\{equation\*?\}([\s\S]*?)\\end\{equation\*?\}/g,
    '<div data-type="mathBlock" data-latex="$1">$$$$$1$$$$</div>');
  body = body.replace(/\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}/g,
    '<div data-type="mathBlock" data-latex="\\begin{aligned}$1\\end{aligned}">$$\\begin{aligned}$1\\end{aligned}$$</div>');

  // Display math delimiters
  body = body.replace(/\\\[([\s\S]*?)\\\]/g, '<div data-type="mathBlock" data-latex="$1">$$$$$1$$$$</div>');
  body = body.replace(/\$\$([\s\S]*?)\$\$/g, '<div data-type="mathBlock" data-latex="$1">$$$$$1$$$$</div>');

  // Inline math
  body = body.replace(/\$([^$\n]+?)\$/g, '<span data-type="mathInline" data-latex="$1">$$$1$$</span>');

  // Code blocks
  body = body.replace(/\\begin\{lstlisting\}(?:\[[^\]]*\])?([\s\S]*?)\\end\{lstlisting\}/g,
    '<pre><code>$1</code></pre>');
  body = body.replace(/\\begin\{verbatim\}([\s\S]*?)\\end\{verbatim\}/g,
    '<pre><code>$1</code></pre>');

  // Admonition tcolorbox
  body = body.replace(/\\begin\{admonitionbox\}\[([^\]]*)\]\{[^}]*\}([\s\S]*?)\\end\{admonitionbox\}/g,
    '<div data-type="admonition" data-admonition-type="note"><strong>$1</strong>$2</div>');

  // Lists (handle optional arguments like [leftmargin=...])
  body = body.replace(/\\begin\{itemize\}(?:\[[^\]]*\])?([\s\S]*?)\\end\{itemize\}/g, (_, items) => {
    const lis = items
      .split(/\\item(?:\[[^\]]*\])?\s*/)
      .filter((s: string) => s.trim())
      .map((s: string) => `<li>${s.trim()}</li>`)
      .join("\n");
    return `<ul>\n${lis}\n</ul>`;
  });
  body = body.replace(/\\begin\{enumerate\}(?:\[[^\]]*\])?([\s\S]*?)\\end\{enumerate\}/g, (_, items) => {
    const lis = items
      .split(/\\item(?:\[[^\]]*\])?\s*/)
      .filter((s: string) => s.trim())
      .map((s: string) => `<li>${s.trim()}</li>`)
      .join("\n");
    return `<ol>\n${lis}\n</ol>`;
  });

  // Bibliography
  body = body.replace(/\\begin\{thebibliography\}\{[^}]*\}([\s\S]*?)\\end\{thebibliography\}/g, (_, items) => {
    const entries = items
      .split(/\\bibitem\{[^}]*\}\s*/)
      .filter((s: string) => s.trim())
      .map((s: string) => `<li>${s.trim()}</li>`)
      .join("\n");
    return `<h2>참고문헌</h2>\n<ol>\n${entries}\n</ol>`;
  });

  // Letter environment
  body = body.replace(/\\begin\{letter\}\{([^}]*)\}/g, '<p><strong>수신:</strong> $1</p>');
  body = body.replace(/\\end\{letter\}/g, '');
  body = body.replace(/\\opening\{([^}]*)\}/g, '<p>$1</p>');
  body = body.replace(/\\closing\{([^}]*)\}/g, '<p>$1</p>');
  body = body.replace(/\\signature\{([^}]*)\}/g, '');
  body = body.replace(/\\address\{([^}]*)\}/g, '');

  // Quotes
  body = body.replace(/\\begin\{quote\}([\s\S]*?)\\end\{quote\}/g, "<blockquote>$1</blockquote>");

  // Figures
  body = body.replace(/\\begin\{figure\}[\s\S]*?\\includegraphics(?:\[[^\]]*\])?\{([^}]*)\}[\s\S]*?(?:\\caption\{([^}]*)\})?[\s\S]*?\\end\{figure\}/g,
    '<img src="$1" alt="$2" />');

  // Tables
  body = body.replace(/\\begin\{table\}[\s\S]*?\\begin\{tabular\}\{[^}]*\}([\s\S]*?)\\end\{tabular\}[\s\S]*?\\end\{table\}/g,
    (_, tableContent) => processLatexTable(tableContent));
  // Standalone tabular
  body = body.replace(/\\begin\{tabular\}\{[^}]*\}([\s\S]*?)\\end\{tabular\}/g,
    (_, tableContent) => processLatexTable(tableContent));

  // Sections
  body = body.replace(/\\section\*?\{([^}]*)\}/g, "<h1>$1</h1>");
  body = body.replace(/\\subsection\*?\{([^}]*)\}/g, "<h2>$1</h2>");
  body = body.replace(/\\subsubsection\*?\{([^}]*)\}/g, "<h3>$1</h3>");
  body = body.replace(/\\paragraph\*?\{([^}]*)\}/g, "<h4>$1</h4>");
  body = body.replace(/\\subparagraph\*?\{([^}]*)\}/g, "<h5>$1</h5>");

  // Nested brace groups with size/style commands: {\Huge\bfseries text}
  body = body.replace(/\{\\Huge\\bfseries\s+([^}]*)\}/g, '<span style="font-size:2em;font-weight:bold">$1</span>');
  body = body.replace(/\{\\LARGE\\bfseries\s+([^}]*)\}/g, '<span style="font-size:1.7em;font-weight:bold">$1</span>');
  body = body.replace(/\{\\Large\\bfseries\s+([^}]*)\}/g, '<span style="font-size:1.4em;font-weight:bold">$1</span>');
  body = body.replace(/\{\\large\\bfseries\s+([^}]*)\}/g, '<span style="font-size:1.2em;font-weight:bold">$1</span>');
  body = body.replace(/\{\\large\s+([^}]*)\}/g, '<span style="font-size:1.2em">$1</span>');
  body = body.replace(/\{\\Huge\s+([^}]*)\}/g, '<span style="font-size:2em">$1</span>');
  body = body.replace(/\{\\Large\s+([^}]*)\}/g, '<span style="font-size:1.4em">$1</span>');
  body = body.replace(/\{\\small\s+([^}]*)\}/g, '<span style="font-size:0.85em">$1</span>');

  // Text formatting
  body = body.replace(/\\textbf\{([^}]*)\}/g, "<strong>$1</strong>");
  body = body.replace(/\\textit\{([^}]*)\}/g, "<em>$1</em>");
  body = body.replace(/\\underline\{([^}]*)\}/g, "<u>$1</u>");
  body = body.replace(/\\emph\{([^}]*)\}/g, "<em>$1</em>");
  body = body.replace(/\\texttt\{([^}]*)\}/g, "<code>$1</code>");
  body = body.replace(/\\sout\{([^}]*)\}/g, "<s>$1</s>");
  body = body.replace(/\\textsc\{([^}]*)\}/g, '<span style="font-variant:small-caps">$1</span>');
  body = body.replace(/\\textsuperscript\{([^}]*)\}/g, "<sup>$1</sup>");
  body = body.replace(/\\textsubscript\{([^}]*)\}/g, "<sub>$1</sub>");

  // Footnotes
  body = body.replace(/\\footnote\{([^}]*)\}/g, '<sup class="footnote-ref">[$1]</sup>');

  // Links
  body = body.replace(/\\href\{([^}]*)\}\{([^}]*)\}/g, '<a href="$1">$2</a>');
  body = body.replace(/\\url\{([^}]*)\}/g, '<a href="$1">$1</a>');

  // Horizontal rules
  body = body.replace(/\\rule\{\\textwidth\}\{[^}]*\}/g, "<hr/>");
  body = body.replace(/\\noindent\\rule\{\\textwidth\}\{[^}]*\}/g, "<hr/>");
  body = body.replace(/\\hrulefill/g, "<hr/>");

  // Line breaks: \\ and \\[space]
  body = body.replace(/\\\\(?:\[[^\]]*\])?/g, "<br/>");

  // Spacing commands → whitespace
  body = body.replace(/\\hfill/g, '<span style="float:right">');
  // Fix hfill: find the next <br/> or newline and close the span
  body = body.replace(/<span style="float:right">([^<]*?)(?:<br\/>|\n)/g,
    '<span style="float:right">$1</span><br/>');

  body = body.replace(/\\quad/g, "&emsp;");
  body = body.replace(/\\qquad/g, "&emsp;&emsp;");
  body = body.replace(/\\,/g, "&thinsp;");
  body = body.replace(/\\;/g, "&ensp;");
  body = body.replace(/\\hspace\{[^}]*\}/g, "&emsp;");
  body = body.replace(/\\vspace\{[^}]*\}/g, "");

  // Strip layout commands that don't affect content
  body = body.replace(/\\noindent/g, "");
  body = body.replace(/\\centering/g, "");
  body = body.replace(/\\raggedright/g, "");
  body = body.replace(/\\raggedleft/g, "");
  body = body.replace(/\\clearpage/g, "");
  body = body.replace(/\\newpage/g, "<hr/>");
  body = body.replace(/\\tableofcontents/g, "<p><em>[목차]</em></p>");

  // Labels and refs
  body = body.replace(/\\label\{[^}]*\}/g, "");
  body = body.replace(/\\ref\{([^}]*)\}/g, "[ref:$1]");
  body = body.replace(/\\cite\{([^}]*)\}/g, "[$1]");

  // Caption (standalone)
  body = body.replace(/\\caption\{([^}]*)\}/g, '<p><em>$1</em></p>');

  // Strip remaining unknown environments
  body = body.replace(/\\begin\{[^}]*\}(?:\[[^\]]*\])?/g, "");
  body = body.replace(/\\end\{[^}]*\}/g, "");

  // Strip remaining unknown commands with arguments (be conservative)
  body = body.replace(/\\[a-zA-Z]+\*?\{([^}]*)\}/g, "$1");

  // Strip remaining standalone commands
  body = body.replace(/\\[a-zA-Z]+\*?/g, "");

  // Clean up stray braces
  body = body.replace(/\{([^{}]*)\}/g, "$1");

  // Paragraphs: double newlines → paragraph breaks
  body = body.replace(/\n{2,}/g, "</p><p>");

  // Clean up empty paragraphs and whitespace
  body = body.replace(/<p>\s*<\/p>/g, "");
  body = body.replace(/^\s+|\s+$/g, "");

  if (!body.startsWith("<")) {
    body = `<p>${body}</p>`;
  } else if (!body.startsWith("<p>") && !body.startsWith("<h") && !body.startsWith("<div") && !body.startsWith("<ul") && !body.startsWith("<ol") && !body.startsWith("<blockquote") && !body.startsWith("<pre") && !body.startsWith("<table") && !body.startsWith("<img") && !body.startsWith("<hr")) {
    body = `<p>${body}</p>`;
  }

  return body;
}

// Helper: parse LaTeX tabular content to HTML table
function processLatexTable(content: string): string {
  // Remove \toprule, \midrule, \bottomrule, \hline
  let cleaned = content
    .replace(/\\toprule/g, "")
    .replace(/\\midrule/g, "")
    .replace(/\\bottomrule/g, "")
    .replace(/\\hline/g, "")
    .replace(/\\cline\{[^}]*\}/g, "")
    .trim();

  const rows = cleaned.split("\\\\").filter(r => r.trim());
  if (rows.length === 0) return "";

  let html = "<table>\n";
  rows.forEach((row, i) => {
    const cells = row.split("&").map(c => c.trim());
    const tag = i === 0 ? "th" : "td";
    html += "  <tr>\n";
    cells.forEach(cell => {
      html += `    <${tag}>${cell}</${tag}>\n`;
    });
    html += "  </tr>\n";
  });
  html += "</table>";
  return html;
}
