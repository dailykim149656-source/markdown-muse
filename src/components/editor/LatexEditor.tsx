import { useState, useCallback, useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

const DEFAULT_TEMPLATE = `\\documentclass{article}
\\usepackage{amsmath}
\\usepackage{amssymb}

\\title{제목을 입력하세요}
\\author{저자}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{소개}
여기에 내용을 작성하세요.

\\subsection{수식 예시}
아인슈타인의 질량-에너지 등가:
\\[ E = mc^2 \\]

이차 방정식의 근의 공식:
\\[ x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} \\]

\\section{결론}
결론을 작성하세요.

\\end{document}`;

interface LatexEditorProps {
  initialContent?: string;
  onContentChange?: (content: string) => void;
}

// Parse LaTeX and render math expressions
function renderLatexPreview(source: string): string {
  // Remove preamble (everything before \begin{document})
  let body = source;
  const beginDoc = source.indexOf("\\begin{document}");
  const endDoc = source.indexOf("\\end{document}");
  if (beginDoc !== -1) {
    body = source.substring(beginDoc + "\\begin{document}".length, endDoc !== -1 ? endDoc : undefined);
  }

  // Extract title, author, date from preamble
  const titleMatch = source.match(/\\title\{([^}]*)\}/);
  const authorMatch = source.match(/\\author\{([^}]*)\}/);

  let html = "";
  
  // Add title block if present
  if (titleMatch) {
    html += `<div style="text-align:center;margin-bottom:2em;">`;
    html += `<h1 style="font-size:1.8em;margin-bottom:0.3em;">${titleMatch[1]}</h1>`;
    if (authorMatch) html += `<p style="color:#666;">${authorMatch[1]}</p>`;
    html += `</div>`;
  }

  // Process \maketitle
  body = body.replace(/\\maketitle/g, "");

  // Process sections
  body = body.replace(/\\section\{([^}]*)\}/g, '<h2 style="font-size:1.4em;font-weight:600;margin:1.2em 0 0.4em;border-bottom:1px solid #eee;padding-bottom:0.2em;">$1</h2>');
  body = body.replace(/\\subsection\{([^}]*)\}/g, '<h3 style="font-size:1.15em;font-weight:600;margin:1em 0 0.3em;">$1</h3>');
  body = body.replace(/\\subsubsection\{([^}]*)\}/g, '<h4 style="font-size:1em;font-weight:600;margin:0.8em 0 0.2em;">$1</h4>');

  // Process display math \[ ... \] and $$ ... $$
  body = body.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => {
    try {
      return `<div style="text-align:center;margin:1em 0;">${katex.renderToString(math.trim(), { displayMode: true, throwOnError: false })}</div>`;
    } catch { return `<pre>${math}</pre>`; }
  });
  body = body.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
    try {
      return `<div style="text-align:center;margin:1em 0;">${katex.renderToString(math.trim(), { displayMode: true, throwOnError: false })}</div>`;
    } catch { return `<pre>${math}</pre>`; }
  });

  // Process inline math $ ... $
  body = body.replace(/\$([^$\n]+?)\$/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
    } catch { return `<code>${math}</code>`; }
  });

  // Process environments
  body = body.replace(/\\begin\{equation\}([\s\S]*?)\\end\{equation\}/g, (_, math) => {
    try {
      return `<div style="text-align:center;margin:1em 0;">${katex.renderToString(math.trim(), { displayMode: true, throwOnError: false })}</div>`;
    } catch { return `<pre>${math}</pre>`; }
  });
  body = body.replace(/\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}/g, (_, math) => {
    try {
      return `<div style="text-align:center;margin:1em 0;">${katex.renderToString("\\begin{aligned}" + math.trim() + "\\end{aligned}", { displayMode: true, throwOnError: false })}</div>`;
    } catch { return `<pre>${math}</pre>`; }
  });

  // Process itemize/enumerate
  body = body.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g, (_, items) => {
    const lis = items.replace(/\\item\s*/g, "</li><li>").replace(/^<\/li>/, "");
    return `<ul style="padding-left:1.5em;margin:0.5em 0;">${lis}</li></ul>`;
  });
  body = body.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g, (_, items) => {
    const lis = items.replace(/\\item\s*/g, "</li><li>").replace(/^<\/li>/, "");
    return `<ol style="padding-left:1.5em;margin:0.5em 0;">${lis}</li></ol>`;
  });

  // Process text formatting
  body = body.replace(/\\textbf\{([^}]*)\}/g, "<strong>$1</strong>");
  body = body.replace(/\\textit\{([^}]*)\}/g, "<em>$1</em>");
  body = body.replace(/\\underline\{([^}]*)\}/g, "<u>$1</u>");
  body = body.replace(/\\texttt\{([^}]*)\}/g, "<code>$1</code>");
  body = body.replace(/\\emph\{([^}]*)\}/g, "<em>$1</em>");

  // Process line breaks
  body = body.replace(/\\\\/g, "<br/>");
  
  // Process paragraphs (double newlines)
  body = body.replace(/\n\n+/g, "</p><p>");

  // Clean up remaining commands
  body = body.replace(/\\[a-zA-Z]+\{[^}]*\}/g, ""); // remove unknown commands
  body = body.replace(/\\[a-zA-Z]+/g, ""); // remove remaining commands

  html += `<p>${body}</p>`;

  return html;
}

const LatexEditor = ({ initialContent, onContentChange }: LatexEditorProps) => {
  const [source, setSource] = useState(initialContent || DEFAULT_TEMPLATE);
  const [preview, setPreview] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setPreview(renderLatexPreview(source));
    onContentChange?.(source);
  }, [source, onContentChange]);

  const handleTab = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newValue = source.substring(0, start) + "  " + source.substring(end);
      setSource(newValue);
      setTimeout(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      }, 0);
    }
  }, [source]);

  return (
    <div className="flex h-full">
      {/* Code editor */}
      <div className="flex-1 flex flex-col border-r border-border">
        <div className="h-8 flex items-center px-3 bg-toolbar border-b border-toolbar-border">
          <span className="text-xs font-medium text-muted-foreground">LaTeX 소스</span>
        </div>
        <textarea
          ref={textareaRef}
          value={source}
          onChange={(e) => setSource(e.target.value)}
          onKeyDown={handleTab}
          className="flex-1 w-full bg-background text-foreground font-mono text-sm p-4 outline-none resize-none leading-relaxed"
          spellCheck={false}
        />
      </div>
      {/* Preview */}
      <div className="flex-1 flex flex-col">
        <div className="h-8 flex items-center px-3 bg-toolbar border-b border-toolbar-border">
          <span className="text-xs font-medium text-muted-foreground">미리보기</span>
        </div>
        <div className="flex-1 overflow-y-auto p-8 max-w-3xl mx-auto w-full">
          <div
            className="prose prose-neutral dark:prose-invert max-w-none text-sm leading-7"
            dangerouslySetInnerHTML={{ __html: preview }}
          />
        </div>
      </div>
    </div>
  );
};

export default LatexEditor;
