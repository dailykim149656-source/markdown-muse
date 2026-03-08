export type StructuredDataMode = "json" | "yaml";
export type TokenKind = "plain" | "key" | "string" | "number" | "boolean" | "null" | "comment" | "punctuation" | "reference";

export interface HighlightToken {
  end: number;
  kind: TokenKind;
  start: number;
  text: string;
}

export interface MatchRange {
  from: number;
  to: number;
}

const isWhitespace = (char: string | undefined) => Boolean(char && /\s/.test(char));

const pushToken = (tokens: HighlightToken[], kind: TokenKind, text: string, start: number) => {
  if (!text) {
    return;
  }

  tokens.push({
    end: start + text.length,
    kind,
    start,
    text,
  });
};

const readQuotedString = (source: string, startIndex: number) => {
  const quote = source[startIndex];
  let index = startIndex + 1;
  let escaped = false;

  while (index < source.length) {
    const char = source[index];

    if (quote === "\"" && char === "\\" && !escaped) {
      escaped = true;
      index += 1;
      continue;
    }

    if (char === quote && (!escaped || quote === "'")) {
      index += 1;
      break;
    }

    escaped = false;
    index += 1;
  }

  return source.slice(startIndex, index);
};

const readWhile = (source: string, startIndex: number, predicate: (char: string) => boolean) => {
  let index = startIndex;

  while (index < source.length && predicate(source[index])) {
    index += 1;
  }

  return source.slice(startIndex, index);
};

const readNumber = (source: string, startIndex: number) => {
  const match = source.slice(startIndex).match(/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/);
  return match?.[0] ?? "";
};

const readReference = (source: string, startIndex: number) => {
  if (source[startIndex] === "!") {
    const match = source.slice(startIndex).match(/^!{1,2}[A-Za-z0-9_.:-]+/);
    return match?.[0] ?? source[startIndex];
  }

  const match = source.slice(startIndex).match(/^[&*][A-Za-z0-9_.-]+/);
  return match?.[0] ?? source[startIndex];
};

const isJsonKey = (source: string, endIndex: number) => {
  let index = endIndex;

  while (index < source.length && /\s/.test(source[index])) {
    index += 1;
  }

  return source[index] === ":";
};

export const normalizeMatchIndex = (index: number, totalMatches: number) => {
  if (totalMatches === 0) {
    return 0;
  }

  return Math.min(Math.max(index, 0), totalMatches - 1);
};

export const getPlainTextMatches = (text: string, searchText: string) => {
  if (!searchText.trim()) {
    return [] as MatchRange[];
  }

  const lowerText = text.toLowerCase();
  const lowerSearch = searchText.toLowerCase();
  const matches: MatchRange[] = [];
  let startIndex = 0;

  while (startIndex < lowerText.length) {
    const matchIndex = lowerText.indexOf(lowerSearch, startIndex);

    if (matchIndex === -1) {
      break;
    }

    matches.push({
      from: matchIndex,
      to: matchIndex + searchText.length,
    });
    startIndex = matchIndex + Math.max(searchText.length, 1);
  }

  return matches;
};

export const tokenizeJson = (source: string) => {
  const tokens: HighlightToken[] = [];
  let index = 0;

  while (index < source.length) {
    const char = source[index];

    if (char === "\"" || char === "'") {
      const value = readQuotedString(source, index);
      pushToken(tokens, char === "\"" && isJsonKey(source, index + value.length) ? "key" : "string", value, index);
      index += value.length;
      continue;
    }

    if ("{}[],:".includes(char)) {
      pushToken(tokens, "punctuation", char, index);
      index += 1;
      continue;
    }

    if ((char === "-" || /\d/.test(char)) && readNumber(source, index)) {
      const value = readNumber(source, index);
      pushToken(tokens, "number", value, index);
      index += value.length;
      continue;
    }

    if (source.startsWith("true", index) && !/[A-Za-z0-9_]/.test(source[index + 4] ?? "")) {
      pushToken(tokens, "boolean", "true", index);
      index += 4;
      continue;
    }

    if (source.startsWith("false", index) && !/[A-Za-z0-9_]/.test(source[index + 5] ?? "")) {
      pushToken(tokens, "boolean", "false", index);
      index += 5;
      continue;
    }

    if (source.startsWith("null", index) && !/[A-Za-z0-9_]/.test(source[index + 4] ?? "")) {
      pushToken(tokens, "null", "null", index);
      index += 4;
      continue;
    }

    const nextTokenIndex = source.slice(index).search(/["'{}\[\],:-]|\btrue\b|\bfalse\b|\bnull\b|\d/);
    const endIndex = nextTokenIndex === -1 ? source.length : index + Math.max(nextTokenIndex, 1);
    pushToken(tokens, "plain", source.slice(index, endIndex), index);
    index = endIndex;
  }

  return tokens;
};

const findYamlCommentStart = (line: string) => {
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (inDoubleQuote && char === "\\" && !escaped) {
      escaped = true;
      continue;
    }

    if (char === "\"" && !inSingleQuote && !escaped) {
      inDoubleQuote = !inDoubleQuote;
    } else if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
    } else if (char === "#" && !inSingleQuote && !inDoubleQuote && (index === 0 || isWhitespace(line[index - 1]))) {
      return index;
    }

    escaped = false;
  }

  return -1;
};

const findYamlKeySeparator = (source: string) => {
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;
  let flowDepth = 0;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (inDoubleQuote && char === "\\" && !escaped) {
      escaped = true;
      continue;
    }

    if (char === "\"" && !inSingleQuote && !escaped) {
      inDoubleQuote = !inDoubleQuote;
      escaped = false;
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (inSingleQuote || inDoubleQuote) {
      escaped = false;
      continue;
    }

    if (char === "{" || char === "[") {
      flowDepth += 1;
      continue;
    }

    if ((char === "}" || char === "]") && flowDepth > 0) {
      flowDepth -= 1;
      continue;
    }

    if (char === ":" && flowDepth === 0) {
      const nextChar = source[index + 1];
      if (!nextChar || isWhitespace(nextChar) || nextChar === "#" || nextChar === "|" || nextChar === ">" || nextChar === "{" || nextChar === "[" || nextChar === "\"" || nextChar === "'" || nextChar === "!" || nextChar === "&" || nextChar === "*") {
        return index;
      }
    }

    escaped = false;
  }

  return -1;
};

const tokenizeYamlValue = (source: string, startOffset: number) => {
  const tokens: HighlightToken[] = [];
  let index = 0;
  let flowDepth = 0;

  while (index < source.length) {
    const char = source[index];

    if (/\s/.test(char)) {
      const value = readWhile(source, index, (currentChar) => /\s/.test(currentChar));
      pushToken(tokens, "plain", value, startOffset + index);
      index += value.length;
      continue;
    }

    if (char === "\"" || char === "'") {
      const value = readQuotedString(source, index);
      pushToken(tokens, "string", value, startOffset + index);
      index += value.length;
      continue;
    }

    if (char === "&" || char === "*" || char === "!") {
      const value = readReference(source, index);
      pushToken(tokens, "reference", value, startOffset + index);
      index += value.length;
      continue;
    }

    if (char === "|" || char === ">") {
      const indicator = source.slice(index).match(/^[|>][+-]?\d*/)?.[0] ?? char;
      pushToken(tokens, "punctuation", indicator, startOffset + index);
      index += indicator.length;
      continue;
    }

    if ("{}[],".includes(char)) {
      pushToken(tokens, "punctuation", char, startOffset + index);
      if (char === "{" || char === "[") {
        flowDepth += 1;
      } else if (flowDepth > 0) {
        flowDepth -= 1;
      }
      index += 1;
      continue;
    }

    if (char === ":" && flowDepth > 0) {
      pushToken(tokens, "punctuation", char, startOffset + index);
      index += 1;
      continue;
    }

    if ((char === "-" || /\d/.test(char)) && readNumber(source, index)) {
      const value = readNumber(source, index);
      const previousChar = source[index - 1];
      const nextChar = source[index + value.length];
      const isNumberBoundary = !previousChar || /[\s[\]{},:]/.test(previousChar);
      const hasValidEnd = !nextChar || /[\s,\]}#]/.test(nextChar);

      if (isNumberBoundary && hasValidEnd) {
        pushToken(tokens, "number", value, startOffset + index);
        index += value.length;
        continue;
      }
    }

    const bareWord = readWhile(source, index, (currentChar) => !/[\s[\]{},#"'>]/.test(currentChar));

    if (/^(true|false|yes|no|on|off)$/i.test(bareWord)) {
      pushToken(tokens, "boolean", bareWord, startOffset + index);
    } else if (/^(null|~)$/i.test(bareWord)) {
      pushToken(tokens, "null", bareWord, startOffset + index);
    } else {
      pushToken(tokens, "plain", bareWord || char, startOffset + index);
    }

    index += Math.max(bareWord.length, 1);
  }

  return tokens;
};

export const tokenizeYaml = (source: string) => {
  const lines = source.split("\n");
  const tokens: HighlightToken[] = [];
  let lineOffset = 0;

  lines.forEach((line, index) => {
    const commentStart = findYamlCommentStart(line);
    const mainPart = commentStart >= 0 ? line.slice(0, commentStart) : line;
    const commentPart = commentStart >= 0 ? line.slice(commentStart) : "";

    const indent = line.match(/^\s*/)?.[0] ?? "";
    let cursor = indent.length;

    pushToken(tokens, "plain", indent, lineOffset);

    if (line[cursor] === "-" && isWhitespace(line[cursor + 1])) {
      pushToken(tokens, "punctuation", "-", lineOffset + cursor);
      cursor += 1;
      const listGap = line.slice(cursor, mainPart.length).match(/^\s+/)?.[0] ?? "";
      pushToken(tokens, "plain", listGap, lineOffset + cursor);
      cursor += listGap.length;
    }

    const body = mainPart.slice(cursor);
    const separatorIndex = findYamlKeySeparator(body);

    if (separatorIndex >= 0) {
      const rawKey = body.slice(0, separatorIndex);
      const trimmedKey = rawKey.replace(/\s+$/, "");
      const trailingWhitespace = rawKey.slice(trimmedKey.length);

      pushToken(tokens, "key", trimmedKey, lineOffset + cursor);
      pushToken(tokens, "plain", trailingWhitespace, lineOffset + cursor + trimmedKey.length);
      pushToken(tokens, "punctuation", ":", lineOffset + cursor + separatorIndex);

      const valueStart = cursor + separatorIndex + 1;
      tokens.push(...tokenizeYamlValue(mainPart.slice(valueStart), lineOffset + valueStart));
    } else {
      tokens.push(...tokenizeYamlValue(body, lineOffset + cursor));
    }

    if (commentPart) {
      pushToken(tokens, "comment", commentPart, lineOffset + commentStart);
    }

    if (index < lines.length - 1) {
      pushToken(tokens, "plain", "\n", lineOffset + line.length);
    }

    lineOffset += line.length + 1;
  });

  return tokens;
};

export const tokenizeStructuredData = (mode: StructuredDataMode, source: string) => {
  return mode === "json" ? tokenizeJson(source) : tokenizeYaml(source);
};
