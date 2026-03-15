export type HtmlTokenKind =
  | "plain"
  | "comment"
  | "doctype"
  | "tagBracket"
  | "tagName"
  | "attrName"
  | "attrValue"
  | "entity";

export interface HtmlHighlightToken {
  end: number;
  kind: HtmlTokenKind;
  start: number;
  text: string;
}

export const htmlTokenClassMap: Record<Exclude<HtmlTokenKind, "plain">, string> = {
  attrName: "html-source-attr-name",
  attrValue: "html-source-attr-value",
  comment: "html-source-comment",
  doctype: "html-source-doctype",
  entity: "html-source-entity",
  tagBracket: "html-source-tag-bracket",
  tagName: "html-source-tag-name",
};

const ENTITY_PATTERN = /&(?:#\d+|#x[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]+);/g;

const pushToken = (
  tokens: HtmlHighlightToken[],
  kind: HtmlTokenKind,
  text: string,
  start: number,
) => {
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

const pushTextWithEntities = (
  tokens: HtmlHighlightToken[],
  text: string,
  start: number,
  baseKind: Extract<HtmlTokenKind, "plain" | "attrValue"> = "plain",
) => {
  if (!text) {
    return;
  }

  ENTITY_PATTERN.lastIndex = 0;
  let cursor = 0;
  let match = ENTITY_PATTERN.exec(text);

  while (match) {
    if (match.index > cursor) {
      pushToken(tokens, baseKind, text.slice(cursor, match.index), start + cursor);
    }

    pushToken(tokens, "entity", match[0], start + match.index);
    cursor = match.index + match[0].length;
    match = ENTITY_PATTERN.exec(text);
  }

  if (cursor < text.length) {
    pushToken(tokens, baseKind, text.slice(cursor), start + cursor);
  }
};

const readUntil = (source: string, startIndex: number, terminator: string) => {
  const endIndex = source.indexOf(terminator, startIndex);
  return endIndex === -1 ? source.length : endIndex + terminator.length;
};

const readTagName = (source: string, startIndex: number) => {
  let index = startIndex;

  while (index < source.length && /[^\s/>=]/.test(source[index])) {
    index += 1;
  }

  return source.slice(startIndex, index);
};

const pushAttributeValue = (tokens: HtmlHighlightToken[], source: string, startIndex: number) => {
  const quote = source[startIndex];

  if (quote === "\"" || quote === "'") {
    pushToken(tokens, "attrValue", quote, startIndex);
    let index = startIndex + 1;

    while (index < source.length) {
      const char = source[index];

      if (quote === "\"" && char === "\\") {
        index += Math.min(2, source.length - index);
        continue;
      }

      if (char === quote) {
        break;
      }

      index += 1;
    }

    const valueEnd = index < source.length && source[index] === quote ? index : source.length;
    pushTextWithEntities(tokens, source.slice(startIndex + 1, valueEnd), startIndex + 1, "attrValue");

    if (valueEnd < source.length && source[valueEnd] === quote) {
      pushToken(tokens, "attrValue", quote, valueEnd);
      return valueEnd + 1;
    }

    return valueEnd;
  }

  let index = startIndex;

  while (index < source.length && !/[\s>]/.test(source[index])) {
    if (source[index] === "/" && source[index + 1] === ">") {
      break;
    }
    index += 1;
  }

  pushTextWithEntities(tokens, source.slice(startIndex, index), startIndex, "attrValue");
  return index;
};

const tokenizeTag = (source: string, startIndex: number, tokens: HtmlHighlightToken[]) => {
  let index = startIndex;

  if (source.startsWith("</", index)) {
    pushToken(tokens, "tagBracket", "</", index);
    index += 2;
  } else {
    pushToken(tokens, "tagBracket", "<", index);
    index += 1;
  }

  const tagName = readTagName(source, index);
  if (!tagName) {
    return index;
  }

  pushToken(tokens, "tagName", tagName, index);
  index += tagName.length;

  while (index < source.length) {
    if (source.startsWith("/>", index)) {
      pushToken(tokens, "tagBracket", "/>", index);
      return index + 2;
    }

    const char = source[index];

    if (char === ">") {
      pushToken(tokens, "tagBracket", ">", index);
      return index + 1;
    }

    if (/\s/.test(char)) {
      const whitespaceStart = index;
      while (index < source.length && /\s/.test(source[index])) {
        index += 1;
      }
      pushToken(tokens, "plain", source.slice(whitespaceStart, index), whitespaceStart);
      continue;
    }

    if (char === "/") {
      pushToken(tokens, "tagBracket", "/", index);
      index += 1;
      continue;
    }

    const attrName = readTagName(source, index);
    if (!attrName) {
      pushToken(tokens, "plain", char, index);
      index += 1;
      continue;
    }

    pushToken(tokens, "attrName", attrName, index);
    index += attrName.length;

    const whitespaceStart = index;
    while (index < source.length && /\s/.test(source[index])) {
      index += 1;
    }
    pushToken(tokens, "plain", source.slice(whitespaceStart, index), whitespaceStart);

    if (source[index] !== "=") {
      continue;
    }

    pushToken(tokens, "tagBracket", "=", index);
    index += 1;

    const valueWhitespaceStart = index;
    while (index < source.length && /\s/.test(source[index])) {
      index += 1;
    }
    pushToken(tokens, "plain", source.slice(valueWhitespaceStart, index), valueWhitespaceStart);

    index = pushAttributeValue(tokens, source, index);
  }

  return index;
};

export const tokenizeHtml = (source: string) => {
  const tokens: HtmlHighlightToken[] = [];
  let index = 0;

  while (index < source.length) {
    if (source.startsWith("<!--", index)) {
      const commentEnd = readUntil(source, index + 4, "-->");
      pushToken(tokens, "comment", source.slice(index, commentEnd), index);
      index = commentEnd;
      continue;
    }

    if (/^<!doctype/i.test(source.slice(index))) {
      pushToken(tokens, "tagBracket", "<!", index);
      const doctypeEnd = source.indexOf(">", index + 2);
      const contentEnd = doctypeEnd === -1 ? source.length : doctypeEnd;
      pushToken(tokens, "doctype", source.slice(index + 2, contentEnd), index + 2);

      if (doctypeEnd !== -1) {
        pushToken(tokens, "tagBracket", ">", doctypeEnd);
        index = doctypeEnd + 1;
      } else {
        index = contentEnd;
      }
      continue;
    }

    if (source[index] === "<") {
      const nextIndex = tokenizeTag(source, index, tokens);
      if (nextIndex > index) {
        index = nextIndex;
        continue;
      }
    }

    const nextTagIndex = source.indexOf("<", index + 1);
    const textEnd = nextTagIndex === -1 ? source.length : nextTagIndex;
    pushTextWithEntities(tokens, source.slice(index, textEnd), index);
    index = textEnd;
  }

  return tokens;
};
