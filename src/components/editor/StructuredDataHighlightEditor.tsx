import { useMemo, useRef, useCallback, type ChangeEvent, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import {
  getPlainTextMatches,
  normalizeMatchIndex,
  tokenizeStructuredData,
  type HighlightToken,
  type TokenKind,
} from "./utils/structuredDataHighlight";

const syntaxClassMap: Record<Exclude<TokenKind, "plain">, string> = {
  boolean: "structured-data-boolean",
  comment: "structured-data-comment",
  key: "structured-data-key",
  null: "structured-data-null",
  number: "structured-data-number",
  punctuation: "structured-data-punctuation",
  reference: "structured-data-reference",
  string: "structured-data-string",
};

interface StructuredDataHighlightEditorProps {
  currentMatchIndex?: number;
  mode: "json" | "yaml";
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  searchText?: string;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  value: string;
}

const StructuredDataHighlightEditor = ({
  currentMatchIndex = 0,
  mode,
  onChange,
  onKeyDown,
  placeholder,
  searchText = "",
  textareaRef,
  value,
}: StructuredDataHighlightEditorProps) => {
  const internalTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const highlightRef = useRef<HTMLPreElement | null>(null);
  const textareaElementRef = textareaRef ?? internalTextareaRef;

  const tokens = useMemo(() => tokenizeStructuredData(mode, value), [mode, value]);
  const matches = useMemo(() => getPlainTextMatches(value, searchText), [searchText, value]);
  const resolvedCurrentMatchIndex = useMemo(
    () => normalizeMatchIndex(currentMatchIndex, matches.length),
    [currentMatchIndex, matches.length]
  );

  const highlightedContent = useMemo<ReactNode[]>(() => {
    const nodes: ReactNode[] = [];
    let matchCursor = 0;

    const renderPart = (
      token: HighlightToken,
      from: number,
      to: number,
      key: string,
      matchIndex?: number
    ) => {
      const text = token.text.slice(from - token.start, to - token.start);
      const classNames = [
        token.kind === "plain" ? undefined : syntaxClassMap[token.kind],
        typeof matchIndex === "number"
          ? matchIndex === resolvedCurrentMatchIndex
            ? "find-highlight-current"
            : "find-highlight"
          : undefined,
      ].filter(Boolean).join(" ");

      nodes.push(
        <span key={key} className={classNames || undefined}>
          {text}
        </span>
      );
    };

    tokens.forEach((token, tokenIndex) => {
      while (matchCursor < matches.length && matches[matchCursor].to <= token.start) {
        matchCursor += 1;
      }

      let tokenCursor = token.start;
      let localMatchCursor = matchCursor;

      while (localMatchCursor < matches.length && matches[localMatchCursor].from < token.end) {
        const match = matches[localMatchCursor];
        const highlightStart = Math.max(match.from, token.start);
        const highlightEnd = Math.min(match.to, token.end);

        if (highlightStart > tokenCursor) {
          renderPart(token, tokenCursor, highlightStart, `${tokenIndex}-${tokenCursor}-${highlightStart}`);
        }

        if (highlightEnd > highlightStart) {
          renderPart(token, highlightStart, highlightEnd, `${tokenIndex}-${highlightStart}-${highlightEnd}`, localMatchCursor);
        }

        tokenCursor = highlightEnd;

        if (match.to <= token.end) {
          localMatchCursor += 1;
        } else {
          break;
        }
      }

      if (tokenCursor < token.end) {
        renderPart(token, tokenCursor, token.end, `${tokenIndex}-${tokenCursor}-${token.end}`);
      }

      matchCursor = localMatchCursor;
    });

    return nodes;
  }, [matches, resolvedCurrentMatchIndex, tokens]);

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
    <div className="flex-1 relative overflow-hidden bg-background">
      {value.length === 0 && placeholder && (
        <div
          aria-hidden="true"
          className="absolute inset-0 p-4 font-mono text-xs leading-relaxed pointer-events-none text-muted-foreground/60 whitespace-pre-wrap"
        >
          {placeholder}
        </div>
      )}
      <pre
        ref={highlightRef}
        aria-hidden="true"
        className="absolute inset-0 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words pointer-events-none overflow-hidden m-0 structured-data-highlight-pre"
      >
        {highlightedContent.length > 0 ? highlightedContent : " "}
        {"\n"}
      </pre>
      <textarea
        ref={textareaElementRef}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onScroll={syncScroll}
        spellCheck={false}
        className="absolute inset-0 w-full h-full p-4 font-mono text-xs leading-relaxed resize-none outline-none bg-transparent text-transparent caret-foreground structured-data-textarea"
      />
    </div>
  );
};

export default StructuredDataHighlightEditor;
