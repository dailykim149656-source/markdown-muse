import type {
  BlockNode,
  DocumentAst,
  FootnoteItemNode,
  InlineNode,
  Mark,
  TableCellNode,
  TableNode,
} from "@/types/documentAst";

export interface AstLatexRenderOptions {
  author?: string;
  date?: string;
  documentClass?: string;
  extraPackages?: string[];
  includeMetadata?: boolean;
  fontSize?: string;
  includeWrapper?: boolean;
  title?: string;
}

interface RenderContext {
  footnotes: Map<string, FootnoteItemNode>;
  options: Required<AstLatexRenderOptions>;
  usedFeatures: Set<string>;
}

const DEFAULT_OPTIONS: Required<AstLatexRenderOptions> = {
  author: "Docsy",
  date: "\\today",
  documentClass: "article",
  extraPackages: [],
  includeMetadata: false,
  fontSize: "11pt",
  includeWrapper: false,
  title: "Untitled",
};

const buildFontEnginePreamble = (usedFeatures: Set<string>) => {
  if (!usedFeatures.has("docsy-font-family")) {
    return "";
  }

  return [
    "% !TeX program = xelatex",
    "% Compile with XeLaTeX for Docsy font support.",
    "\\usepackage{fontspec}",
    "\\usepackage{xeCJK}",
    "\\usepackage{etoolbox}",
    "\\defaultfontfeatures{Ligatures=TeX,Scale=MatchLowercase}",
    "\\IfFontExistsTF{Inter}{\\setmainfont{Inter}\\setsansfont{Inter}}{",
    "  \\IfFontExistsTF{Noto Sans KR}{\\setmainfont{Noto Sans KR}\\setsansfont{Noto Sans KR}}{}",
    "}",
    "\\IfFontExistsTF{Noto Sans KR}{\\setCJKmainfont{Noto Sans KR}\\setCJKsansfont{Noto Sans KR}}{",
    "  \\IfFontExistsTF{NanumGothic}{\\setCJKmainfont{NanumGothic}\\setCJKsansfont{NanumGothic}}{}",
    "}",
    "\\IfFontExistsTF{Fira Code}{\\setmonofont{Fira Code}}{",
    "  \\IfFontExistsTF{JetBrains Mono}{\\setmonofont{JetBrains Mono}}{",
    "    \\IfFontExistsTF{D2Coding}{\\setmonofont{D2Coding}}{}",
    "  }",
    "}",
    "\\IfFontExistsTF{D2Coding}{\\setCJKmonofont{D2Coding}}{",
    "  \\IfFontExistsTF{NanumGothicCoding}{\\setCJKmonofont{NanumGothicCoding}}{}",
    "}",
  ].join("\n");
};

const ADMONITION_COLOR_MAP: Record<string, string> = {
  blue: "blue",
  gray: "gray",
  green: "green!70!black",
  orange: "orange",
  purple: "violet",
  red: "red",
  teal: "teal",
  yellow: "yellow!80!black",
};

const escapeLatex = (text: string) =>
  text
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/[&%$#_{}]/g, (match) => `\\${match}`)
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");

const escapeLatexUrl = (text: string) =>
  text
    .replace(/\\/g, "/")
    .replace(/([%#{}])/g, "\\$1");

const cssColorToLatex = (value: string) => {
  if (!value.trim()) {
    return "black";
  }

  const normalized = value.trim().toLowerCase();
  const namedColors: Record<string, string> = {
    black: "black",
    blue: "blue",
    green: "green",
    orange: "orange",
    purple: "purple",
    red: "red",
    white: "white",
    yellow: "yellow",
  };

  if (namedColors[normalized]) {
    return namedColors[normalized];
  }

  const hexMatch = normalized.match(/^#([0-9a-f]{6})$/i);

  if (hexMatch) {
    return `[HTML]{${hexMatch[1].toUpperCase()}}`;
  }

  const rgbMatch = normalized.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);

  if (rgbMatch) {
    return `[RGB]{${rgbMatch[1]},${rgbMatch[2]},${rgbMatch[3]}}`;
  }

  return "black";
};

const sanitizeStyleArg = (value: string) => value.replace(/[{}\\]/g, "").trim();

const normalizeFontFamily = (value: string) => {
  const firstFamily = value.split(",")[0]?.trim() || "";
  return firstFamily.replace(/^['"]+|['"]+$/g, "").trim();
};

const formatPt = (value: number) => `${Number(value.toFixed(2)).toString()}pt`;

const cssFontSizeToLatexPt = (value: string) => {
  const normalized = value.trim().toLowerCase();
  const pxMatch = normalized.match(/^(\d+(?:\.\d+)?)px$/);
  if (pxMatch) {
    return formatPt(Number(pxMatch[1]) * 0.75);
  }

  const ptMatch = normalized.match(/^(\d+(?:\.\d+)?)pt$/);
  if (ptMatch) {
    return formatPt(Number(ptMatch[1]));
  }

  return sanitizeStyleArg(value);
};

const collectFootnotes = (blocks: BlockNode[], footnotes: Map<string, FootnoteItemNode>) => {
  for (const block of blocks) {
    switch (block.type) {
      case "footnote_item":
        footnotes.set(block.footnoteId, block);
        break;
      case "blockquote":
      case "list_item":
      case "task_list_item":
      case "admonition":
        collectFootnotes(block.blocks, footnotes);
        break;
      case "bullet_list":
      case "ordered_list":
      case "task_list":
        collectFootnotes(block.items, footnotes);
        break;
      case "table":
        for (const row of block.rows) {
          for (const cell of row.cells) {
            collectFootnotes(cell.blocks, footnotes);
          }
        }
        break;
      default:
        break;
    }
  }
};

const wrapWithMarks = (content: string, marks: Mark[] | undefined, context: RenderContext) => {
  if (!marks?.length) {
    return content;
  }

  return marks.reduce((accumulator, mark) => {
    switch (mark.type) {
      case "bold":
        return `\\textbf{${accumulator}}`;
      case "italic":
        return `\\textit{${accumulator}}`;
      case "underline":
        context.usedFeatures.add("underline");
        return `\\underline{${accumulator}}`;
      case "strike":
        context.usedFeatures.add("strike");
        return `\\sout{${accumulator}}`;
      case "code":
        return `\\texttt{${accumulator}}`;
      case "highlight":
        context.usedFeatures.add("highlight");
        return `\\hl{${accumulator}}`;
      case "subscript":
        return `\\textsubscript{${accumulator}}`;
      case "superscript":
        return `\\textsuperscript{${accumulator}}`;
      case "link":
        context.usedFeatures.add("hyperref");
        return `\\href{${escapeLatexUrl(mark.href)}}{${accumulator}}`;
      case "text_style": {
        let styled = accumulator;

        if (mark.color) {
          context.usedFeatures.add("xcolor");
          styled = `\\textcolor{${cssColorToLatex(mark.color)}}{${styled}}`;
        }

        if (mark.fontSize) {
          context.usedFeatures.add("docsy-font-size");
          styled = `\\docsyfontsize{${sanitizeStyleArg(mark.fontSize)}}{${sanitizeStyleArg(cssFontSizeToLatexPt(mark.fontSize))}}{${styled}}`;
        }

        if (mark.fontFamily) {
          const fontFamily = normalizeFontFamily(mark.fontFamily);
          if (fontFamily) {
            context.usedFeatures.add("docsy-font-family");
            styled = `\\docsyfontfamily{${sanitizeStyleArg(fontFamily)}}{${styled}}`;
          }
        }

        return styled;
      }
      default:
        return accumulator;
    }
  }, content);
};

const renderInlineNodes = (nodes: InlineNode[], context: RenderContext): string =>
  nodes.map((node) => renderInlineNode(node, context)).join("");

const renderInlineNode = (node: InlineNode, context: RenderContext): string => {
  switch (node.type) {
    case "text":
      return wrapWithMarks(escapeLatex(node.text), node.marks, context);
    case "hard_break":
      return "\\\\\n";
    case "math_inline":
      return `$${node.latex}$`;
    case "cross_reference": {
      const label = node.targetLabel || node.targetNodeId || "unknown";

      if (node.referenceKind === "figure") {
        return `Figure~\\ref{${escapeLatex(label)}}`;
      }

      if (node.referenceKind === "table") {
        return `Table~\\ref{${escapeLatex(label)}}`;
      }

      if (node.referenceKind === "section") {
        return `Section~\\ref{${escapeLatex(label)}}`;
      }

      return `\\ref{${escapeLatex(label)}}`;
    }
    case "footnote_ref": {
      const footnote = context.footnotes.get(node.footnoteId);

      if (!footnote) {
        return `\\textsuperscript{[${escapeLatex(node.footnoteId)}]}`;
      }

      return `\\footnote{${renderInlineNodes(footnote.children, context)}}`;
    }
    default:
      return "";
  }
};

const indentLines = (value: string, prefix: string) =>
  value
    .split("\n")
    .map((line) => `${prefix}${line}`.trimEnd())
    .join("\n");

const renderBlocks = (blocks: BlockNode[], context: RenderContext, depth = 0): string => {
  const result: string[] = [];

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    const nextBlock = blocks[index + 1];

    if (block.type === "image" && nextBlock?.type === "figure_caption" && nextBlock.captionType === "figure") {
      context.usedFeatures.add("figure");
      const widthRatio = block.width ? Math.max(0.2, Math.min(1, block.width / 600)) : 0.8;
      const captionText = renderInlineNodes(nextBlock.children, context) || escapeLatex(block.alt || "");
      const label = nextBlock.label || block.nodeId;

      result.push(
        [
          "\\begin{figure}[H]",
          "  \\centering",
          `  \\includegraphics[width=${widthRatio.toFixed(2)}\\textwidth]{${escapeLatexUrl(block.src)}}`,
          captionText ? `  \\caption{${captionText}}` : "",
          label ? `  \\label{${escapeLatex(label)}}` : "",
          "\\end{figure}",
        ].filter(Boolean).join("\n"),
      );
      index += 1;
      continue;
    }

    if (block.type === "table" && nextBlock?.type === "figure_caption" && nextBlock.captionType === "table") {
      context.usedFeatures.add("table");
      const label = nextBlock.label || block.nodeId;
      const captionText = renderInlineNodes(nextBlock.children, context);

      result.push(
        [
          "\\begin{table}[H]",
          "  \\centering",
          indentLines(renderTable(block, context), "  "),
          captionText ? `  \\caption{${captionText}}` : "",
          label ? `  \\label{${escapeLatex(label)}}` : "",
          "\\end{table}",
        ].filter(Boolean).join("\n"),
      );
      index += 1;
      continue;
    }

    const rendered = renderBlockNode(block, context, depth);

    if (rendered.trim().length > 0) {
      result.push(rendered);
    }
  }

  return result.join("\n\n");
};

const renderTableCell = (cell: TableCellNode, context: RenderContext) =>
  cell.blocks
    .map((block) => renderBlockNode(block, context).replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ");

const renderTable = (node: TableNode, context: RenderContext) => {
  context.usedFeatures.add("table");
  context.usedFeatures.add("float");
  const columnCount = node.rows[0]?.cells.length || 1;
  const columnSpec = Array.from({ length: columnCount }, () => "l").join(" | ");
  const lines = node.rows.map((row) => `${row.cells.map((cell) => renderTableCell(cell, context)).join(" & ")} \\\\ \\hline`);

  return [
    `\\begin{tabular}{| ${columnSpec} |}`,
    "\\hline",
    ...lines,
    "\\end{tabular}",
  ].join("\n");
};

const renderList = (
  blocks: BlockNode[],
  context: RenderContext,
  prefix: string,
  depth: number,
) =>
  blocks
    .map((block) => indentLines(renderBlockNode(block, context, depth + 1), prefix))
    .join("\n\n");

const renderBlockNode = (node: BlockNode, context: RenderContext, depth = 0): string => {
  switch (node.type) {
    case "heading":
      if (node.level === 1) {
        return `\\section{${renderInlineNodes(node.children, context)}}`;
      }
      if (node.level === 2) {
        return `\\subsection{${renderInlineNodes(node.children, context)}}`;
      }
      return `\\subsubsection{${renderInlineNodes(node.children, context)}}`;
    case "paragraph":
      return renderInlineNodes(node.children, context);
    case "blockquote":
      return `\\begin{quote}\n${renderBlocks(node.blocks, context, depth + 1)}\n\\end{quote}`;
    case "code_block":
      context.usedFeatures.add("code");
      return node.language
        ? `\\begin{lstlisting}[language=${node.language}]\n${node.code}\n\\end{lstlisting}`
        : `\\begin{lstlisting}\n${node.code}\n\\end{lstlisting}`;
    case "bullet_list":
      return `\\begin{itemize}\n${node.items.map((item) => `  \\item ${renderBlocks(item.blocks, context, depth + 1).replace(/\n+/g, "\n    ")}`).join("\n")}\n\\end{itemize}`;
    case "ordered_list":
      return `\\begin{enumerate}\n${node.items.map((item) => `  \\item ${renderBlocks(item.blocks, context, depth + 1).replace(/\n+/g, "\n    ")}`).join("\n")}\n\\end{enumerate}`;
    case "task_list":
      context.usedFeatures.add("enumitem");
      return `\\begin{itemize}\n${node.items.map((item) => `  \\item[${item.checked ? "$\\\\boxtimes$" : "$\\\\square$"}] ${renderBlocks(item.blocks, context, depth + 1).replace(/\n+/g, "\n    ")}`).join("\n")}\n\\end{itemize}`;
    case "list_item":
    case "task_list_item":
      return renderList(node.blocks, context, `${"  ".repeat(depth)}`, depth);
    case "horizontal_rule":
      return "\\noindent\\rule{\\textwidth}{0.4pt}";
    case "image":
      context.usedFeatures.add("figure");
      return [
        "\\begin{figure}[H]",
        blockAlignment(node.align),
        `  \\includegraphics[width=${(node.width ? Math.max(0.2, Math.min(1, node.width / 600)) : 0.8).toFixed(2)}\\textwidth]{${escapeLatexUrl(node.src)}}`,
        node.alt ? `  \\caption{${escapeLatex(node.alt)}}` : "",
        `  \\label{${escapeLatex(node.nodeId)}}`,
        "\\end{figure}",
      ].filter(Boolean).join("\n");
    case "figure_caption": {
      const prefix = node.captionType === "table" ? "Table" : "Figure";
      const text = renderInlineNodes(node.children, context);
      const label = node.label ? `\\label{${escapeLatex(node.label)}}` : "";
      return `${prefix}: ${text}${label ? ` ${label}` : ""}`;
    }
    case "table":
      return renderTable(node, context);
    case "math_block":
      return `\\[\n${node.latex}\n\\]`;
    case "mermaid_block":
      return `% begin-mermaid\n${node.code.split("\n").map((line) => `% mermaid: ${line}`).join("\n")}\n% end-mermaid`;
    case "admonition": {
      context.usedFeatures.add("admonition");
      const boxTitle = escapeLatex(node.title || capitalize(node.admonitionType));
      const color = ADMONITION_COLOR_MAP[node.color || ""] || ADMONITION_COLOR_MAP[node.admonitionType] || "blue";

      return [
        `% admonition-meta: type=${node.admonitionType}${node.color ? ` color=${node.color}` : ""}${node.icon ? ` icon=${node.icon}` : ""}`,
        `\\begin{admonitionbox}[${boxTitle}]{${color}}`,
        renderBlocks(node.blocks, context, depth + 1),
        "\\end{admonitionbox}",
      ].join("\n");
    }
    case "opaque_latex_block":
      return node.rawLatex;
    case "resume_header": {
      const leftPrimary = node.primaryLinkUrl
        ? `\\textbf{\\href{${escapeLatexUrl(node.primaryLinkUrl)}}{\\Large ${escapeLatex(node.name)}}}`
        : `\\textbf{\\Large ${escapeLatex(node.name)}}`;
      const leftSecondary = node.secondaryLinkUrl
        ? `\\href{${escapeLatexUrl(node.secondaryLinkUrl)}}{${escapeLatex(node.secondaryLinkLabel || node.secondaryLinkUrl)}}`
        : "{}";
      const rightPrimary = escapeLatex(node.rightPrimary || "");
      const rightSecondary = node.email
        ? `Email : \\href{mailto:${escapeLatexUrl(node.email)}}{${escapeLatex(node.email)}}`
        : "";
      const rightTertiary = escapeLatex(node.tertiaryRight || (node.phone ? `Mobile : ${node.phone}` : ""));
      return [
        "\\begin{tabular*}{\\textwidth}{l@{\\extracolsep{\\fill}}r}",
        `  ${leftPrimary} & ${rightPrimary} \\\\`,
        `  ${leftSecondary} & ${rightSecondary} \\\\`,
        `  {} & ${rightTertiary}`,
        "\\end{tabular*}",
      ].join("\n");
    }
    case "resume_summary":
      return `\\resumeSummary{${escapeLatex(node.summary).replace(/\n+/g, " \\\\\n")}}`;
    case "resume_entry": {
      const details = node.details.length
        ? `\n\\resumeItemListStart\n${node.details.map((detail) => `  \\resumeItem{${escapeLatex(detail)}}`).join("\n")}\n\\resumeItemListEnd`
        : "";
      switch (node.commandName) {
        case "resumeEmployment":
          return `\\resumeEmploymentListStart\n\\resumeEmployment{${escapeLatex(node.title)}}{${escapeLatex(node.trailingText || "")}}{${escapeLatex(node.subtitle || "")}}{${escapeLatex(node.tertiaryText || "")}}${details}\n\\resumeEmploymentListEnd`;
        case "resumeCommunity":
          return `\\resumeSubHeadingListStart\n\\resumeCommunity{${escapeLatex(node.title)}}{${escapeLatex(node.trailingText || "")}}{${escapeLatex(node.subtitle || "")}}${details}\n\\resumeSubHeadingListEnd`;
        case "resumeSubheading":
          return `\\resumeSubHeadingListStart\n\\resumeSubheading{${escapeLatex(node.title)}}{${escapeLatex(node.trailingText || "")}}{${escapeLatex(node.subtitle || "")}}{${escapeLatex(node.tertiaryText || "")}}${details}\n\\resumeSubHeadingListEnd`;
        case "resumeProject":
          return `\\resumeSubHeadingListStart\n\\resumeProject{${escapeLatex(node.title)}}{${escapeLatex(node.description || "")}}${details}\n\\resumeSubHeadingListEnd`;
        case "resumeResearch":
          return `\\resumeSubHeadingListStart\n\\resumeResearch{${escapeLatex(node.title)}}{${escapeLatex(node.trailingText || "")}}{${escapeLatex(node.subtitle || "")}}{${escapeLatex(node.description || "")}}{${escapeLatex(node.tertiaryText || "")}}${details}\n\\resumeSubHeadingListEnd`;
        case "resumeTalk":
          return `\\resumeSubHeadingListStart\n\\resumeTalk{${escapeLatex(node.title)}}{${escapeLatex(node.trailingText || "")}}${details}\n\\resumeSubHeadingListEnd`;
        default:
          return "";
      }
    }
    case "resume_skill_row":
      return `\\resumeSubHeadingListStart\n\\resumeSkills{${escapeLatex(node.rawText)}}\n\\resumeSubHeadingListEnd`;
    case "latex_title_block":
      return "\\maketitle";
    case "latex_abstract":
      return `\\begin{abstract}\n${escapeLatex(node.content)}\n\\end{abstract}`;
    case "table_of_contents":
      return "\\tableofcontents";
    case "footnote_item":
      return "";
    default:
      return "";
  }
};

const blockAlignment = (align?: string) => {
  if (align === "left") {
    return "  \\raggedright";
  }
  if (align === "right") {
    return "  \\raggedleft";
  }
  return "  \\centering";
};

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const buildPreamble = (context: RenderContext) => {
  const packages = [
    "\\usepackage{amsmath}",
    "\\usepackage{amssymb}",
    "\\usepackage{graphicx}",
    "\\usepackage[hidelinks]{hyperref}",
    "\\usepackage{xcolor}",
  ];

  if (!context.usedFeatures.has("docsy-font-family")) {
    packages.unshift("\\usepackage[utf8]{inputenc}");
  }

  if (context.usedFeatures.has("highlight")) {
    packages.push("\\usepackage{soul}");
  }

  if (context.usedFeatures.has("strike") || context.usedFeatures.has("underline")) {
    packages.push("\\usepackage{ulem}");
  }

  if (context.usedFeatures.has("code")) {
    packages.push("\\usepackage{listings}");
  }

  if (context.usedFeatures.has("table")) {
    packages.push("\\usepackage{array}");
    packages.push("\\usepackage{booktabs}");
  }

  if (context.usedFeatures.has("float") || context.usedFeatures.has("figure")) {
    packages.push("\\usepackage{float}");
  }

  if (context.usedFeatures.has("enumitem")) {
    packages.push("\\usepackage{enumitem}");
  }

  if (context.usedFeatures.has("admonition")) {
    packages.push("\\usepackage[most]{tcolorbox}");
  }

  for (const extraPackage of context.options.extraPackages) {
    packages.push(`\\usepackage{${extraPackage}}`);
  }

  const uniquePackages = Array.from(new Set(packages));
  const listingConfig = context.usedFeatures.has("code")
    ? [
      "\\lstset{",
      "  basicstyle=\\ttfamily\\small,",
      "  breaklines=true,",
      "  frame=single,",
      "  backgroundcolor=\\color{gray!5},",
      "}",
    ].join("\n")
    : "";
  const admonitionConfig = context.usedFeatures.has("admonition")
    ? [
      "\\newtcolorbox{admonitionbox}[2][]{",
      "  colback=#2!5!white,",
      "  colframe=#2!75!black,",
      "  fonttitle=\\bfseries,",
      "  title={#1},",
      "  sharp corners,",
      "  boxrule=0.8pt,",
      "  left=6pt,",
      "  right=6pt,",
      "  top=4pt,",
      "  bottom=4pt",
      "}",
    ].join("\n")
    : "";
  const docsyFontSizeConfig = context.usedFeatures.has("docsy-font-size")
    ? [
      "\\newcommand{\\docsyfontsize}[3]{{",
      "  \\fontsize{#2}{\\dimexpr #2 + 2pt\\relax}\\selectfont #3",
      "}}",
    ].join("\n")
    : "";
  const docsyFontFamilyConfig = context.usedFeatures.has("docsy-font-family")
    ? [
      "\\newcommand{\\docsyfontfamily}[2]{{",
      "  \\def\\docsyresolvedfont{#1}",
      "  \\ifdefstrequal{#1}{Nanum Gothic}{\\def\\docsyresolvedfont{NanumGothic}}{}",
      "  \\ifdefstrequal{#1}{Nanum Myeongjo}{\\def\\docsyresolvedfont{NanumMyeongjo}}{}",
      "  \\ifdefstrequal{#1}{Nanum Gothic Coding}{\\def\\docsyresolvedfont{NanumGothicCoding}}{}",
      "  \\IfFontExistsTF{\\docsyresolvedfont}{\\fontspec{\\docsyresolvedfont}}{}#2",
      "}}",
    ].join("\n")
    : "";
  const fontEnginePreamble = buildFontEnginePreamble(context.usedFeatures);

  return [
    fontEnginePreamble,
    `\\documentclass[${context.options.fontSize}]{${context.options.documentClass}}`,
    ...uniquePackages,
    listingConfig,
    admonitionConfig,
    docsyFontSizeConfig,
    docsyFontFamilyConfig,
    ...(
      context.options.includeMetadata === true
        ? [
          `\\title{${escapeLatex(context.options.title)}}`,
          `\\author{${escapeLatex(context.options.author)}}`,
          `\\date{${context.options.date}}`,
          "",
          "\\begin{document}",
          "",
          "\\maketitle",
          "",
        ]
        : ["\\begin{document}"]
    ),
  ].filter(Boolean).join("\n");
};

export const renderAstToLatex = (document: DocumentAst, options: AstLatexRenderOptions = {}) => {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const footnotes = new Map<string, FootnoteItemNode>();
  collectFootnotes(document.blocks, footnotes);

  const context: RenderContext = {
    footnotes,
    options: mergedOptions,
    usedFeatures: new Set<string>(),
  };
  const body = `${renderBlocks(document.blocks, context).trim()}\n`;

  if (!mergedOptions.includeWrapper) {
    return body;
  }

  return `${buildPreamble(context)}${body}\n\\end{document}`;
};
