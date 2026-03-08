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
  const beginDoc = latex.indexOf("\\begin{document}");
  const endDoc = latex.indexOf("\\end{document}");
  if (beginDoc !== -1) {
    body = latex.substring(beginDoc + "\\begin{document}".length, endDoc !== -1 ? endDoc : undefined);
  }

  body = body.replace(/\\maketitle/g, "");

  // Sections
  body = body.replace(/\\section\{([^}]*)\}/g, "<h1>$1</h1>");
  body = body.replace(/\\subsection\{([^}]*)\}/g, "<h2>$1</h2>");
  body = body.replace(/\\subsubsection\{([^}]*)\}/g, "<h3>$1</h3>");
  body = body.replace(/\\paragraph\{([^}]*)\}/g, "<h4>$1</h4>");
  body = body.replace(/\\subparagraph\{([^}]*)\}/g, "<h5>$1</h5>");

  // Text formatting
  body = body.replace(/\\textbf\{([^}]*)\}/g, "<strong>$1</strong>");
  body = body.replace(/\\textit\{([^}]*)\}/g, "<em>$1</em>");
  body = body.replace(/\\underline\{([^}]*)\}/g, "<u>$1</u>");
  body = body.replace(/\\emph\{([^}]*)\}/g, "<em>$1</em>");
  body = body.replace(/\\texttt\{([^}]*)\}/g, "<code>$1</code>");
  body = body.replace(/\\sout\{([^}]*)\}/g, "<s>$1</s>");

  // Footnotes → inline marker
  body = body.replace(/\\footnote\{([^}]*)\}/g, '<sup class="footnote-ref">[$1]</sup>');

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

  // lstlisting → pre/code
  body = body.replace(/\\begin\{lstlisting\}(?:\[.*?\])?([\s\S]*?)\\end\{lstlisting\}/g,
    '<pre><code>$1</code></pre>');

  // tcolorbox admonition
  body = body.replace(/\\begin\{admonitionbox\}\[([^\]]*)\]\{[^}]*\}([\s\S]*?)\\end\{admonitionbox\}/g,
    '<div data-type="admonition" data-admonition-type="note"><strong>$1</strong>$2</div>');

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

  // Figures
  body = body.replace(/\\begin\{figure\}[\s\S]*?\\includegraphics(?:\[.*?\])?\{([^}]*)\}[\s\S]*?(?:\\caption\{([^}]*)\})?[\s\S]*?\\end\{figure\}/g,
    '<img src="$1" alt="$2" />');

  // Tables (simplified)
  body = body.replace(/\\begin\{table\}[\s\S]*?\\end\{table\}/g, "% [표]");

  // Links
  body = body.replace(/\\href\{([^}]*)\}\{([^}]*)\}/g, '<a href="$1">$2</a>');

  // Line breaks
  body = body.replace(/\\\\/g, "<br/>");

  // Rules
  body = body.replace(/\\noindent\\rule\{\\textwidth\}\{[^}]*\}/g, "<hr/>");
  body = body.replace(/\\hrulefill/g, "<hr/>");

  // Labels and refs (strip for HTML)
  body = body.replace(/\\label\{[^}]*\}/g, "");
  body = body.replace(/\\ref\{[^}]*\}/g, "[ref]");

  // Paragraphs
  body = body.replace(/\n\n+/g, "</p><p>");

  // Clean remaining commands
  body = body.replace(/\\[a-zA-Z]+\{[^}]*\}/g, "");
  body = body.replace(/\\[a-zA-Z]+/g, "");

  return `<p>${body}</p>`;
}
