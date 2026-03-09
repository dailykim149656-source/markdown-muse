export interface MarkdownTabIndentResult {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

export interface MarkdownTabIndentOptions {
  tabSize?: number;
  shiftKey?: boolean;
}

export const DEFAULT_MARKDOWN_TAB_SIZE = 4;

const getLineStart = (text: string, index: number): number => {
  if (index <= 0) {
    return 0;
  }

  const searchFrom = Math.min(Math.max(index - 1, 0), text.length - 1);
  const previousNewLine = text.lastIndexOf("\n", searchFrom);
  return previousNewLine < 0 ? 0 : previousNewLine + 1;
};

const indentLine = (line: string, tabSize: number): string =>
  " ".repeat(tabSize) + line;

const unindentLine = (line: string, tabSize: number): string => {
  if (!line) {
    return line;
  }

  if (line.startsWith("\t")) {
    return line.slice(1);
  }

  let removed = 0;
  while (removed < tabSize && removed < line.length && line[removed] === " ") {
    removed += 1;
  }

  return line.slice(removed);
};

export const applyMarkdownTabIndent = (
  value: string,
  selectionStart: number,
  selectionEnd: number,
  options: MarkdownTabIndentOptions = {}
): MarkdownTabIndentResult => {
  const tabSize = options.tabSize ?? DEFAULT_MARKDOWN_TAB_SIZE;
  const shift = options.shiftKey ?? false;

  const isRange = selectionStart !== selectionEnd;
  const startLineStart = getLineStart(value, selectionStart);
  const endLineStart = getLineStart(value, Math.max(selectionEnd - 1, 0));

  const lines: {
    start: number;
    lineEnd: number;
    breakText: string;
    originalLine: string;
    transformedLine: string;
    delta: number;
    fullEnd: number;
  }[] = [];

  let cursor = startLineStart;
  while (cursor <= endLineStart && cursor <= value.length) {
    const newlineIndex = value.indexOf("\n", cursor);
    const lineEnd = newlineIndex === -1 ? value.length : newlineIndex;
    const breakText = newlineIndex === -1 ? "" : value.slice(lineEnd, lineEnd + 1);
    const originalLine = value.slice(cursor, lineEnd);
    const transformedLine = shift
      ? unindentLine(originalLine, tabSize)
      : indentLine(originalLine, tabSize);
    const delta = transformedLine.length - originalLine.length;
    const fullEnd = lineEnd + breakText.length;

    lines.push({
      start: cursor,
      lineEnd,
      breakText,
      originalLine,
      transformedLine,
      delta,
      fullEnd,
    });

    cursor = lineEnd + breakText.length;
    if (lineEnd === value.length) {
      break;
    }
  }

  const totalDelta = lines.reduce((sum, line) => sum + line.delta, 0);
  const lastFullEnd = lines.length > 0 ? lines[lines.length - 1].fullEnd : startLineStart;
  const prefix = value.slice(0, startLineStart);
  const suffix = value.slice(lastFullEnd);
  const transformedMiddle = lines
    .map((line) => line.transformedLine + line.breakText)
    .join("");
  const nextValue = prefix + transformedMiddle + suffix;

  const mapSelectionOffset = (offset: number): number => {
    if (offset <= startLineStart) {
      return offset;
    }

    if (offset >= lastFullEnd) {
      return offset + totalDelta;
    }

    let cumulativeDelta = 0;
    for (const line of lines) {
      if (offset <= line.fullEnd) {
        return offset + cumulativeDelta + line.delta;
      }

      cumulativeDelta += line.delta;
    }

    return offset + totalDelta;
  };

  if (!isRange && !shift && totalDelta === 0) {
    const indentation = " ".repeat(tabSize);
    const next = `${value.slice(0, selectionStart)}${indentation}${value.slice(selectionEnd)}`;
    const selection = selectionStart + tabSize;
    return {
      value: next,
      selectionStart: selection,
      selectionEnd: selection,
    };
  }

  if (!isRange && shift && totalDelta === 0) {
    return {
      value,
      selectionStart,
      selectionEnd: selectionEnd,
    };
  }

  const nextSelectionStart = mapSelectionOffset(selectionStart);
  const nextSelectionEnd = mapSelectionOffset(selectionEnd);

  return {
    value: nextValue,
    selectionStart: Math.min(nextSelectionStart, nextValue.length),
    selectionEnd: Math.min(nextSelectionEnd, nextValue.length),
  };
};

