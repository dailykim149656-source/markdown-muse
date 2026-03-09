/**
 * Converts LaTeX source code directly to Typst source code.
 * Handles: document structure, sections, formatting, math, tables,
 * figures, lists, bibliography, and common LaTeX commands.
 */

export function latexToTypst(latex: string): string {
  let s = latex;

  // Remove comments
  s = s.replace(/%[^\n]*/g, "");

  // Extract document class and convert to Typst set rules
  let preamble = "";
  const docClassMatch = s.match(/\\documentclass(?:\[([^\]]*)\])?\{([^}]*)\}/);
  if (docClassMatch) {
    const opts = docClassMatch[1] || "";
    const fontSizeMatch = opts.match(/(\d+)pt/);
    if (fontSizeMatch) {
      preamble += `#set text(size: ${fontSizeMatch[1]}pt)\n`;
    }
    const paperMatch = opts.match(/(a4paper|letterpaper)/);
    if (paperMatch) {
      const paper = paperMatch[1] === "a4paper" ? "a4" : "us-letter";
      preamble += `#set page(paper: "${paper}")\n`;
    }
  }

  // Extract title, author, date from preamble
  const titleMatch = s.match(/\\title\{([^}]*)\}/);
  const authorMatch = s.match(/\\author\{([^}]*)\}/);
  const dateMatch = s.match(/\\date\{([^}]*)\}/);

  if (titleMatch || authorMatch) {
    preamble += `#set document(${titleMatch ? `title: "${cleanText(titleMatch[1])}"` : ""}${titleMatch && authorMatch ? ", " : ""}${authorMatch ? `author: "${cleanText(authorMatch[1])}"` : ""})\n`;
  }

  // Remove preamble (everything before \begin{document})
  s = s.replace(/[\s\S]*?\\begin\{document\}/, "");
  s = s.replace(/\\end\{document\}[\s\S]*/, "");

  // \maketitle → title block
  if (s.includes("\\maketitle")) {
    let titleBlock = "";
    if (titleMatch) titleBlock += `#align(center, text(size: 24pt, weight: "bold")[${cleanText(titleMatch[1])}])\n`;
    if (authorMatch) titleBlock += `#align(center, text(size: 14pt)[${cleanText(authorMatch[1])}])\n`;
    if (dateMatch) titleBlock += `#align(center, text(size: 12pt)[${cleanText(dateMatch[1])}])\n`;
    if (titleBlock) titleBlock += "\n";
    s = s.replace(/\\maketitle/, titleBlock);
  }

  // \tableofcontents
  s = s.replace(/\\tableofcontents/g, "#outline()");

  // Abstract
  s = s.replace(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/g, (_, content) => {
    return `#align(center)[*Abstract*]\n#block(inset: (left: 2em, right: 2em))[${convertInline(content.trim())}]\n`;
  });

  // Sections
  s = s.replace(/\\section\*?\{([^}]*)\}/g, (_, title) => `= ${convertInline(title)}`);
  s = s.replace(/\\subsection\*?\{([^}]*)\}/g, (_, title) => `== ${convertInline(title)}`);
  s = s.replace(/\\subsubsection\*?\{([^}]*)\}/g, (_, title) => `=== ${convertInline(title)}`);
  s = s.replace(/\\paragraph\*?\{([^}]*)\}/g, (_, title) => `==== ${convertInline(title)}`);

  // Figures
  s = s.replace(/\\begin\{figure\}(?:\[[^\]]*\])?([\s\S]*?)\\end\{figure\}/g, (_, content) => {
    const imgMatch = content.match(/\\includegraphics(?:\[[^\]]*\])?\{([^}]*)\}/);
    const capMatch = content.match(/\\caption\{([^}]*)\}/);
    const lblMatch = content.match(/\\label\{([^}]*)\}/);
    let result = "#figure(\n";
    result += `  image("${imgMatch ? imgMatch[1] : "image.png"}"),\n`;
    result += `  caption: [${capMatch ? convertInline(capMatch[1]) : ""}],\n`;
    result += ")";
    if (lblMatch) result += ` <${lblMatch[1]}>`;
    return result;
  });

  // Tables
  s = s.replace(/\\begin\{table\}(?:\[[^\]]*\])?([\s\S]*?)\\end\{table\}/g, (_, content) => {
    return convertTable(content);
  });

  // Standalone tabular (not inside table env)
  s = s.replace(/\\begin\{tabular\}\{([^}]*)\}([\s\S]*?)\\end\{tabular\}/g, (_, colSpec, content) => {
    return convertTabular(colSpec, content);
  });

  // Environments: equation, align, gather
  s = s.replace(/\\begin\{equation\*?\}([\s\S]*?)\\end\{equation\*?\}/g, (_, math) => {
    const lblMatch = math.match(/\\label\{([^}]*)\}/);
    const clean = math.replace(/\\label\{[^}]*\}/g, "").trim();
    let result = `$ ${convertMath(clean)} $`;
    if (lblMatch) result += ` <${lblMatch[1]}>`;
    return result;
  });

  s = s.replace(/\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}/g, (_, math) => {
    const lines = math.split("\\\\").map((l: string) => convertMath(l.replace(/&/g, "").trim())).filter(Boolean);
    return `$ ${lines.join(" \\\n  ")} $`;
  });

  s = s.replace(/\\begin\{gather\*?\}([\s\S]*?)\\end\{gather\*?\}/g, (_, math) => {
    const lines = math.split("\\\\").map((l: string) => convertMath(l.trim())).filter(Boolean);
    return `$ ${lines.join(" \\\n  ")} $`;
  });

  // Display math $$ ... $$
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => `$ ${convertMath(math.trim())} $`);

  // Inline math $ ... $ (careful not to match $$)
  s = s.replace(/(?<!\$)\$(?!\$)([^$]+?)\$(?!\$)/g, (_, math) => `$${convertMath(math)}$`);

  // \[ ... \] display math
  s = s.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `$ ${convertMath(math.trim())} $`);

  // Itemize
  s = s.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g, (_, content) => {
    return convertList(content, "-");
  });

  // Enumerate
  s = s.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g, (_, content) => {
    return convertList(content, "+");
  });

  // Description list
  s = s.replace(/\\begin\{description\}([\s\S]*?)\\end\{description\}/g, (_, content) => {
    return content.replace(/\\item\[([^\]]*)\]\s*([\s\S]*?)(?=\\item|$)/g,
      (_: string, term: string, desc: string) => `/ ${convertInline(term)}: ${convertInline(desc.trim())}\n`);
  });

  // Verbatim / lstlisting
  s = s.replace(/\\begin\{verbatim\}([\s\S]*?)\\end\{verbatim\}/g, (_, code) => {
    return "```\n" + code.trim() + "\n```";
  });
  s = s.replace(/\\begin\{lstlisting\}(?:\[[^\]]*\])?([\s\S]*?)\\end\{lstlisting\}/g, (_, code) => {
    return "```\n" + code.trim() + "\n```";
  });
  s = s.replace(/\\begin\{minted\}\{([^}]*)\}([\s\S]*?)\\end\{minted\}/g, (_, lang, code) => {
    return "```" + lang + "\n" + code.trim() + "\n```";
  });

  // Quote / quotation
  s = s.replace(/\\begin\{quote\}([\s\S]*?)\\end\{quote\}/g, (_, content) => {
    return `#quote(block: true)[${convertInline(content.trim())}]`;
  });
  s = s.replace(/\\begin\{quotation\}([\s\S]*?)\\end\{quotation\}/g, (_, content) => {
    return `#quote(block: true)[${convertInline(content.trim())}]`;
  });

  // Theorem-like environments
  const theoremEnvs = ["theorem", "lemma", "proposition", "corollary", "definition", "example", "remark", "proof"];
  for (const env of theoremEnvs) {
    const regex = new RegExp(`\\\\begin\\{${env}\\}(?:\\[([^\\]]*)\\])?([\\\s\\\S]*?)\\\\end\\{${env}\\}`, "g");
    s = s.replace(regex, (_, title: string | undefined, content: string) => {
      const label = env.charAt(0).toUpperCase() + env.slice(1);
      const titlePart = title ? ` (${convertInline(title)})` : "";
      return `*${label}${titlePart}.* ${convertInline(content.trim())}`;
    });
  }

  // Bibliography
  s = s.replace(/\\begin\{thebibliography\}\{[^}]*\}([\s\S]*?)\\end\{thebibliography\}/g, (_, content) => {
    let result = "= 참고문헌\n\n";
    const items = content.match(/\\bibitem(?:\[[^\]]*\])?\{[^}]*\}[\s\S]*?(?=\\bibitem|$)/g) || [];
    items.forEach((item: string, i: number) => {
      const lblMatch = item.match(/\\bibitem(?:\[[^\]]*\])?\{([^}]*)\}/);
      const text = item.replace(/\\bibitem(?:\[[^\]]*\])?\{[^}]*\}/, "").trim();
      result += `+ ${convertInline(text)}\n`;
    });
    return result;
  });

  // Inline formatting
  s = convertInline(s);

  // References
  s = s.replace(/\\ref\{([^}]*)\}/g, (_, label) => `@${label}`);
  s = s.replace(/\\eqref\{([^}]*)\}/g, (_, label) => `@${label}`);
  s = s.replace(/\\cite\{([^}]*)\}/g, (_, keys) => {
    return keys.split(",").map((k: string) => `@${k.trim()}`).join(" ");
  });
  s = s.replace(/\\autoref\{([^}]*)\}/g, (_, label) => `@${label}`);

  // Labels (standalone)
  s = s.replace(/\\label\{([^}]*)\}/g, (_, label) => `<${label}>`);

  // Remaining LaTeX commands
  s = s.replace(/\\footnote\{([^}]*)\}/g, (_, note) => `#footnote[${convertInline(note)}]`);
  s = s.replace(/\\url\{([^}]*)\}/g, (_, url) => `#link("${url}")`);
  s = s.replace(/\\href\{([^}]*)\}\{([^}]*)\}/g, (_, url, text) => `#link("${url}")[${convertInline(text)}]`);

  // Remove remaining LaTeX commands that have no Typst equivalent
  s = s.replace(/\\(?:usepackage|bibliographystyle|newcommand|renewcommand|setlength|pagestyle|thispagestyle|clearpage|newpage|vspace|hspace|vfill|hfill|noindent|bigskip|medskip|smallskip|par)\b(?:\[[^\]]*\])?\{[^}]*\}/g, "");
  s = s.replace(/\\(?:clearpage|newpage|vfill|hfill|noindent|bigskip|medskip|smallskip|par)\b/g, "");

  // Clean up
  s = s.replace(/\n{3,}/g, "\n\n").trim();

  return preamble + (preamble ? "\n" : "") + s + "\n";
}

function readBalancedArgument(source: string, startIndex: number): { endIndex: number; value: string } | null {
  if (source[startIndex] !== "{") {
    return null;
  }

  let depth = 0;
  let valueStart = startIndex + 1;

  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index];

    if (char === "\\") {
      index += 1;
      continue;
    }

    if (char === "{") {
      depth += 1;
      if (depth === 1) {
        valueStart = index + 1;
      }
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return {
          endIndex: index + 1,
          value: source.slice(valueStart, index),
        };
      }
    }
  }

  return null;
}

function replaceLatexCommandOnce(
  source: string,
  commandName: string,
  argCount: number,
  render: (args: string[]) => string,
): { changed: boolean; output: string } {
  const commandToken = `\\${commandName}`;
  let changed = false;
  let result = "";
  let index = 0;

  while (index < source.length) {
    const commandIndex = source.indexOf(commandToken, index);
    if (commandIndex === -1) {
      result += source.slice(index);
      break;
    }

    result += source.slice(index, commandIndex);

    const nextChar = source[commandIndex + commandToken.length];
    if (nextChar && nextChar !== "{" && !/\s/.test(nextChar)) {
      result += commandToken;
      index = commandIndex + commandToken.length;
      continue;
    }

    let cursor = commandIndex + commandToken.length;
    while (cursor < source.length && /\s/.test(source[cursor])) {
      cursor += 1;
    }

    const args: string[] = [];
    let failed = false;

    for (let argIndex = 0; argIndex < argCount; argIndex += 1) {
      const parsed = readBalancedArgument(source, cursor);
      if (!parsed) {
        failed = true;
        break;
      }

      args.push(parsed.value);
      cursor = parsed.endIndex;
      while (cursor < source.length && /\s/.test(source[cursor])) {
        cursor += 1;
      }
    }

    if (failed) {
      result += commandToken;
      index = commandIndex + commandToken.length;
      continue;
    }

    result += render(args);
    index = cursor;
    changed = true;
  }

  return { changed, output: result };
}

function replaceLatexCommandRepeated(
  source: string,
  commandName: string,
  argCount: number,
  render: (args: string[]) => string,
): string {
  let current = source;

  for (let iteration = 0; iteration < 50; iteration += 1) {
    const { changed, output } = replaceLatexCommandOnce(current, commandName, argCount, render);
    current = output;
    if (!changed) {
      break;
    }
  }

  return current;
}

function escapeTypstString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function cssSizeToTypst(size: string): string {
  const normalized = size.trim().toLowerCase();
  const pxMatch = normalized.match(/^(\d+(?:\.\d+)?)px$/);
  if (pxMatch) {
    return `${Number((Number(pxMatch[1]) * 0.75).toFixed(2)).toString()}pt`;
  }

  return size.trim();
}

function convertInline(s: string): string {
  s = replaceLatexCommandRepeated(s, "docsyfontfamily", 2, ([fontFamily, content]) => (
    `#text(font: "${escapeTypstString(fontFamily.trim())}")[${content}]`
  ));
  s = replaceLatexCommandRepeated(s, "docsyfontsize", 3, ([fontSize, _ptSize, content]) => (
    `#text(size: ${cssSizeToTypst(fontSize)})[${content}]`
  ));

  // Bold
  s = s.replace(/\\textbf\{([^}]*)\}/g, (_, c) => `*${c}*`);
  s = s.replace(/\{\\bf\s+([^}]*)\}/g, (_, c) => `*${c}*`);
  s = s.replace(/\{\\bfseries\s+([^}]*)\}/g, (_, c) => `*${c}*`);

  // Italic
  s = s.replace(/\\textit\{([^}]*)\}/g, (_, c) => `_${c}_`);
  s = s.replace(/\\emph\{([^}]*)\}/g, (_, c) => `_${c}_`);
  s = s.replace(/\{\\it\s+([^}]*)\}/g, (_, c) => `_${c}_`);
  s = s.replace(/\{\\itshape\s+([^}]*)\}/g, (_, c) => `_${c}_`);

  // Underline
  s = s.replace(/\\underline\{([^}]*)\}/g, (_, c) => `#underline[${c}]`);

  // Strikethrough (requires soul or ulem package)
  s = s.replace(/\\st\{([^}]*)\}/g, (_, c) => `#strike[${c}]`);
  s = s.replace(/\\sout\{([^}]*)\}/g, (_, c) => `#strike[${c}]`);

  // Monospace / typewriter
  s = s.replace(/\\texttt\{([^}]*)\}/g, (_, c) => `\`${c}\``);
  s = s.replace(/\\verb\|([^|]*)\|/g, (_, c) => `\`${c}\``);
  s = s.replace(/\\verb\+([^+]*)\+/g, (_, c) => `\`${c}\``);

  // Small caps
  s = s.replace(/\\textsc\{([^}]*)\}/g, (_, c) => `#smallcaps[${c}]`);

  // Text color
  s = s.replace(/\\textcolor\{([^}]*)\}\{([^}]*)\}/g, (_, color, text) => `#text(fill: ${convertColor(color)})[${text}]`);
  s = s.replace(/\\color\{([^}]*)\}/g, ""); // standalone \color removed

  // Font size commands
  s = s.replace(/\{\\(tiny|scriptsize|footnotesize|small|normalsize|large|Large|LARGE|huge|Huge)\s+([^}]*)\}/g,
    (_, size, text) => `#text(size: ${latexSizeToTypst(size)})[${text}]`);

  // Superscript / subscript (text mode)
  s = s.replace(/\\textsuperscript\{([^}]*)\}/g, (_, c) => `#super[${c}]`);
  s = s.replace(/\\textsubscript\{([^}]*)\}/g, (_, c) => `#sub[${c}]`);

  // Special characters
  s = s.replace(/\\&/g, "&");
  s = s.replace(/\\%/g, "%");
  s = s.replace(/\\\$/g, "\\$");
  s = s.replace(/\\#/g, "#");
  s = s.replace(/\\_/g, "_");
  s = s.replace(/\\{/g, "{");
  s = s.replace(/\\}/g, "}");
  s = s.replace(/~/g, "~"); // non-breaking space
  s = s.replace(/``/g, '"');
  s = s.replace(/''/g, '"');
  s = s.replace(/---/g, "—");
  s = s.replace(/--/g, "–");
  s = s.replace(/\\ldots/g, "…");
  s = s.replace(/\\dots/g, "…");
  s = s.replace(/\\textendash/g, "–");
  s = s.replace(/\\textemdash/g, "—");
  s = s.replace(/\\\\/g, " \\\n");

  return s;
}

function convertMath(s: string): string {
  // Convert common LaTeX math commands to Typst equivalents
  s = s.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, (_, n, d) => `(${n}) / (${d})`);
  s = s.replace(/\\sqrt\[([^\]]*)\]\{([^}]*)\}/g, (_, n, c) => `root(${n}, ${c})`);
  s = s.replace(/\\sqrt\{([^}]*)\}/g, (_, c) => `sqrt(${c})`);
  s = s.replace(/\\sum_\{([^}]*)\}\^\{([^}]*)\}/g, (_, low, high) => `sum_(${low})^(${high})`);
  s = s.replace(/\\prod_\{([^}]*)\}\^\{([^}]*)\}/g, (_, low, high) => `product_(${low})^(${high})`);
  s = s.replace(/\\int_\{([^}]*)\}\^\{([^}]*)\}/g, (_, low, high) => `integral_(${low})^(${high})`);
  s = s.replace(/\\lim_\{([^}]*)\}/g, (_, sub) => `lim_(${sub})`);

  // Greek letters (already valid in Typst math mode mostly)
  // Operators
  s = s.replace(/\\(sin|cos|tan|log|ln|exp|min|max|inf|sup|det|dim|ker|deg|gcd)\b/g, "$1");
  s = s.replace(/\\(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)\b/g, "$1");
  s = s.replace(/\\(Alpha|Beta|Gamma|Delta|Epsilon|Zeta|Eta|Theta|Iota|Kappa|Lambda|Mu|Nu|Xi|Pi|Rho|Sigma|Tau|Upsilon|Phi|Chi|Psi|Omega)\b/g, "$1");

  // Common symbols
  s = s.replace(/\\infty/g, "infinity");
  s = s.replace(/\\partial/g, "diff");
  s = s.replace(/\\nabla/g, "nabla");
  s = s.replace(/\\cdot/g, "dot");
  s = s.replace(/\\times/g, "times");
  s = s.replace(/\\pm/g, "plus.minus");
  s = s.replace(/\\mp/g, "minus.plus");
  s = s.replace(/\\leq/g, "<=");
  s = s.replace(/\\geq/g, ">=");
  s = s.replace(/\\neq/g, "!=");
  s = s.replace(/\\approx/g, "approx");
  s = s.replace(/\\equiv/g, "equiv");
  s = s.replace(/\\forall/g, "forall");
  s = s.replace(/\\exists/g, "exists");
  s = s.replace(/\\in/g, "in");
  s = s.replace(/\\notin/g, "in.not");
  s = s.replace(/\\subset/g, "subset");
  s = s.replace(/\\supset/g, "supset");
  s = s.replace(/\\cup/g, "union");
  s = s.replace(/\\cap/g, "sect");
  s = s.replace(/\\emptyset/g, "emptyset");
  s = s.replace(/\\rightarrow/g, "arrow.r");
  s = s.replace(/\\leftarrow/g, "arrow.l");
  s = s.replace(/\\Rightarrow/g, "arrow.r.double");
  s = s.replace(/\\Leftarrow/g, "arrow.l.double");
  s = s.replace(/\\leftrightarrow/g, "arrow.l.r");
  s = s.replace(/\\to/g, "arrow.r");
  s = s.replace(/\\mapsto/g, "arrow.r.bar");

  // Brackets
  s = s.replace(/\\left\(/g, "(");
  s = s.replace(/\\right\)/g, ")");
  s = s.replace(/\\left\[/g, "[");
  s = s.replace(/\\right\]/g, "]");
  s = s.replace(/\\left\\\{/g, "{");
  s = s.replace(/\\right\\\}/g, "}");
  s = s.replace(/\\left\|/g, "|");
  s = s.replace(/\\right\|/g, "|");
  s = s.replace(/\\left\./g, "");
  s = s.replace(/\\right\./g, "");

  // Matrices
  s = s.replace(/\\begin\{(?:p|b|B|v|V)?matrix\}([\s\S]*?)\\end\{(?:p|b|v|V)?matrix\}/g, (_, content) => {
    const rows = content.split("\\\\").map((r: string) =>
      r.split("&").map((c: string) => c.trim()).join(", ")
    ).filter(Boolean);
    return `mat(${rows.join("; ")})`;
  });

  // Overline, hat, tilde, bar, vec, dot
  s = s.replace(/\\overline\{([^}]*)\}/g, (_, c) => `overline(${c})`);
  s = s.replace(/\\hat\{([^}]*)\}/g, (_, c) => `hat(${c})`);
  s = s.replace(/\\tilde\{([^}]*)\}/g, (_, c) => `tilde(${c})`);
  s = s.replace(/\\bar\{([^}]*)\}/g, (_, c) => `macron(${c})`);
  s = s.replace(/\\vec\{([^}]*)\}/g, (_, c) => `arrow(${c})`);
  s = s.replace(/\\dot\{([^}]*)\}/g, (_, c) => `dot(${c})`);
  s = s.replace(/\\ddot\{([^}]*)\}/g, (_, c) => `dot.double(${c})`);

  // Text in math
  s = s.replace(/\\text\{([^}]*)\}/g, (_, c) => `"${c}"`);
  s = s.replace(/\\mathrm\{([^}]*)\}/g, (_, c) => `upright(${c})`);
  s = s.replace(/\\mathbf\{([^}]*)\}/g, (_, c) => `bold(${c})`);
  s = s.replace(/\\mathbb\{([^}]*)\}/g, (_, c) => `bb(${c})`);
  s = s.replace(/\\mathcal\{([^}]*)\}/g, (_, c) => `cal(${c})`);

  // Subscript/superscript with braces
  s = s.replace(/_\{([^}]*)\}/g, (_, c) => `_(${c})`);
  s = s.replace(/\^\{([^}]*)\}/g, (_, c) => `^(${c})`);

  return s;
}

function convertList(content: string, marker: string): string {
  const items = content.match(/\\item\s*([\s\S]*?)(?=\\item|$)/g) || [];
  return items.map((item: string) => {
    const text = item.replace(/\\item\s*/, "").trim();
    return `${marker} ${convertInline(text)}`;
  }).join("\n") + "\n";
}

function convertTable(content: string): string {
  const capMatch = content.match(/\\caption\{([^}]*)\}/);
  const lblMatch = content.match(/\\label\{([^}]*)\}/);
  const tabularMatch = content.match(/\\begin\{tabular\}\{([^}]*)\}([\s\S]*?)\\end\{tabular\}/);

  if (!tabularMatch) return convertInline(content);

  const tableContent = convertTabular(tabularMatch[1], tabularMatch[2]);

  if (capMatch) {
    let result = `#figure(\n  ${tableContent},\n  caption: [${convertInline(capMatch[1])}],\n)`;
    if (lblMatch) result += ` <${lblMatch[1]}>`;
    return result;
  }
  return tableContent;
}

function convertTabular(colSpec: string, content: string): string {
  // Parse column spec
  const cols = colSpec.replace(/[|@{[^}]*}]/g, "").split("").filter(c => /[lcr]/.test(c));
  const colAligns = cols.map(c => c === "l" ? "left" : c === "r" ? "right" : "center");

  // Remove \hline, \toprule, \midrule, \bottomrule
  let cleaned = content.replace(/\\(?:hline|toprule|midrule|bottomrule|cline\{[^}]*\})/g, "");

  const rows = cleaned.split("\\\\").map(r => r.trim()).filter(Boolean);

  let result = `table(\n  columns: ${cols.length},\n  align: (${colAligns.join(", ")}),\n`;

  for (const row of rows) {
    const cells = row.split("&").map(c => `[${convertInline(c.trim())}]`);
    result += `  ${cells.join(", ")},\n`;
  }

  result += ")";
  return result;
}

function convertColor(color: string): string {
  const namedColors: Record<string, string> = {
    red: "red", blue: "blue", green: "green", black: "black",
    white: "white", yellow: "yellow", cyan: "aqua", magenta: "fuchsia",
    gray: "gray", orange: "orange", purple: "purple",
  };
  return namedColors[color.toLowerCase()] || `rgb("${color}")`;
}

function latexSizeToTypst(size: string): string {
  const map: Record<string, string> = {
    tiny: "6pt", scriptsize: "7pt", footnotesize: "8pt", small: "9pt",
    normalsize: "10pt", large: "12pt", Large: "14pt", LARGE: "17pt",
    huge: "20pt", Huge: "25pt",
  };
  return map[size] || "10pt";
}

function cleanText(s: string): string {
  return s.replace(/\\\\/g, " ").replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
}
