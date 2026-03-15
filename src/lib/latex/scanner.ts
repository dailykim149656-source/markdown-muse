export interface LatexDocumentParts {
  body: string;
  postamble: string;
  preamble: string;
}

const BEGIN_DOCUMENT = "\\begin{document}";
const END_DOCUMENT = "\\end{document}";

export const splitLatexDocument = (source: string): LatexDocumentParts => {
  const beginIndex = source.indexOf(BEGIN_DOCUMENT);
  const endIndex = source.lastIndexOf(END_DOCUMENT);

  if (beginIndex === -1 || endIndex === -1 || endIndex < beginIndex) {
    return {
      body: source,
      postamble: "",
      preamble: "",
    };
  }

  return {
    body: source.slice(beginIndex + BEGIN_DOCUMENT.length, endIndex),
    postamble: source.slice(endIndex),
    preamble: source.slice(0, beginIndex + BEGIN_DOCUMENT.length),
  };
};

export const skipWhitespaceAndComments = (source: string, startIndex: number) => {
  let index = startIndex;

  while (index < source.length) {
    const current = source[index];

    if (/\s/.test(current)) {
      index += 1;
      continue;
    }

    if (current === "%") {
      while (index < source.length && source[index] !== "\n") {
        index += 1;
      }
      continue;
    }

    break;
  }

  return index;
};

export const readBalanced = (source: string, startIndex: number, openChar = "{", closeChar = "}") => {
  if (source[startIndex] !== openChar) {
    return null;
  }

  let depth = 0;
  let valueStart = startIndex + 1;

  for (let index = startIndex; index < source.length; index += 1) {
    const current = source[index];

    if (current === "\\") {
      index += 1;
      continue;
    }

    if (current === openChar) {
      depth += 1;
      if (depth === 1) {
        valueStart = index + 1;
      }
      continue;
    }

    if (current === closeChar) {
      depth -= 1;

      if (depth === 0) {
        return {
          endIndex: index + 1,
          raw: source.slice(startIndex, index + 1),
          value: source.slice(valueStart, index),
        };
      }
    }
  }

  return null;
};

export const readCommandName = (source: string, startIndex: number) => {
  if (source[startIndex] !== "\\") {
    return null;
  }

  let index = startIndex + 1;

  while (index < source.length && /[a-zA-Z*@]/.test(source[index])) {
    index += 1;
  }

  if (index === startIndex + 1) {
    return null;
  }

  return {
    endIndex: index,
    name: source.slice(startIndex + 1, index),
  };
};

export const readCommandArguments = (source: string, startIndex: number, count: number) => {
  const command = readCommandName(source, startIndex);
  if (!command) {
    return null;
  }

  const args: string[] = [];
  let index = skipWhitespaceAndComments(source, command.endIndex);

  for (let argIndex = 0; argIndex < count; argIndex += 1) {
    const balanced = readBalanced(source, index);
    if (!balanced) {
      return null;
    }
    args.push(balanced.value);
    index = skipWhitespaceAndComments(source, balanced.endIndex);
  }

  return {
    args,
    commandName: command.name,
    endIndex: index,
    raw: source.slice(startIndex, index),
  };
};

export const readEnvironment = (source: string, startIndex: number, envName: string) => {
  const beginToken = `\\begin{${envName}}`;
  const endToken = `\\end{${envName}}`;

  if (!source.startsWith(beginToken, startIndex)) {
    return null;
  }

  let searchIndex = startIndex + beginToken.length;
  let depth = 1;

  while (searchIndex < source.length) {
    const nextBegin = source.indexOf(beginToken, searchIndex);
    const nextEnd = source.indexOf(endToken, searchIndex);

    if (nextEnd === -1) {
      return null;
    }

    if (nextBegin !== -1 && nextBegin < nextEnd) {
      depth += 1;
      searchIndex = nextBegin + beginToken.length;
      continue;
    }

    depth -= 1;
    searchIndex = nextEnd + endToken.length;

    if (depth === 0) {
      return {
        endIndex: searchIndex,
        raw: source.slice(startIndex, searchIndex),
      };
    }
  }

  return null;
};
