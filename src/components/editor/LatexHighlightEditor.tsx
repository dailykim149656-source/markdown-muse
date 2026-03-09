import { useMemo, useRef, useCallback, useEffect, useState } from "react";

/**
 * Lightweight LaTeX syntax highlighter.
 * Returns HTML string with colored spans.
 */
function highlightLatex(source: string): string {
  // Escape HTML first
  let html = source
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Order matters: comments first, then math, then commands

  // Line comments: % ...
  html = html.replace(/(%.*)$/gm, '<span class="latex-comment">$1</span>');

  // Display math: \[ ... \] and $$ ... $$
  html = html.replace(/(\\\[[\s\S]*?\\\])/g, '<span class="latex-math">$1</span>');
  html = html.replace(/(\$\$[\s\S]*?\$\$)/g, '<span class="latex-math">$1</span>');

  // Inline math: $ ... $ (non-greedy, single line)
  html = html.replace(/(\$[^$\n]+?\$)/g, '<span class="latex-math">$1</span>');

  // \begin{...} and \end{...}
  html = html.replace(/(\\(?:begin|end))\{([^}]*)\}/g,
    '<span class="latex-keyword">$1</span>{<span class="latex-env">$2</span>}');

  // Commands with arguments: \command{arg}
  html = html.replace(/(\\[a-zA-Z@]+)(\{)([^}]*?)(\})/g,
    '<span class="latex-command">$1</span>$2<span class="latex-arg">$3</span>$4');

  // Standalone commands: \command (not already highlighted)
  html = html.replace(/(\\[a-zA-Z@]+)/g, '<span class="latex-command">$1</span>');

  // Braces
  html = html.replace(/([{}])/g, '<span class="latex-brace">$1</span>');

  return html;
}

interface LatexHighlightEditorProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement> | null;
  placeholder?: string;
}

const LatexHighlightEditor = ({ value, onChange, onKeyDown, textareaRef, placeholder }: LatexHighlightEditorProps) => {
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resolvedTextareaRef = textareaRef ?? internalRef;

  const highlighted = useMemo(() => highlightLatex(value), [value]);

  // Sync scroll
  const syncScroll = useCallback(() => {
    if (resolvedTextareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = resolvedTextareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = resolvedTextareaRef.current.scrollLeft;
    }
  }, []);

  return (
    <div ref={containerRef} className="flex-1 relative overflow-hidden">
      {/* Highlighted overlay (visual only) */}
      <pre
        ref={highlightRef}
        className="absolute inset-0 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words pointer-events-none overflow-hidden m-0 latex-highlight-pre"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: highlighted + "\n" }}
      />
      {/* Actual textarea (transparent text, handles input) */}
      <textarea
        ref={resolvedTextareaRef}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onScroll={syncScroll}
        className="absolute inset-0 w-full h-full p-4 font-mono text-xs leading-relaxed resize-none outline-none bg-transparent text-transparent caret-foreground latex-textarea"
        spellCheck={false}
        placeholder={placeholder}
      />
    </div>
  );
};

export default LatexHighlightEditor;
