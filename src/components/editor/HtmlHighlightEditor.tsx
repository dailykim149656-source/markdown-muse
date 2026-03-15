import { useCallback, useMemo, useRef, type ChangeEvent, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { htmlTokenClassMap, tokenizeHtml } from "./utils/htmlHighlight";

interface HtmlHighlightEditorProps {
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onKeyDownCapture?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  value: string;
}

const HtmlHighlightEditor = ({
  onChange,
  onKeyDown,
  onKeyDownCapture,
  placeholder,
  textareaRef,
  value,
}: HtmlHighlightEditorProps) => {
  const internalTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const highlightRef = useRef<HTMLPreElement | null>(null);
  const textareaElementRef = textareaRef ?? internalTextareaRef;

  const highlightedContent = useMemo<ReactNode[]>(() => (
    tokenizeHtml(value).map((token, index) => {
      const className = token.kind === "plain" ? undefined : htmlTokenClassMap[token.kind];

      return (
        <span key={`${token.start}-${token.end}-${index}`} className={className}>
          {token.text}
        </span>
      );
    })
  ), [value]);

  const syncScroll = useCallback(() => {
    const textarea = textareaElementRef.current;
    const highlight = highlightRef.current;

    if (!textarea || !highlight) {
      return;
    }

    highlight.scrollTop = textarea.scrollTop;
    highlight.scrollLeft = textarea.scrollLeft;
  }, [textareaElementRef]);

  return (
    <div className="relative flex-1 overflow-hidden bg-background">
      {value.length === 0 && placeholder && (
        <div
          aria-hidden="true"
          className="absolute inset-0 whitespace-pre-wrap p-4 font-mono text-xs leading-relaxed text-muted-foreground/60 pointer-events-none"
        >
          {placeholder}
        </div>
      )}
      <pre
        ref={highlightRef}
        aria-hidden="true"
        className="absolute inset-0 m-0 overflow-hidden whitespace-pre-wrap break-words p-4 font-mono text-xs leading-relaxed pointer-events-none html-highlight-pre"
      >
        {highlightedContent.length > 0 ? highlightedContent : " "}
        {"\n"}
      </pre>
      <textarea
        ref={textareaElementRef}
        value={value}
        onChange={onChange}
        onKeyDownCapture={onKeyDownCapture}
        onKeyDown={onKeyDown}
        onScroll={syncScroll}
        spellCheck={false}
        className="absolute inset-0 h-full w-full resize-none bg-transparent p-4 font-mono text-xs leading-relaxed text-transparent caret-foreground outline-none html-textarea"
      />
    </div>
  );
};

export default HtmlHighlightEditor;
