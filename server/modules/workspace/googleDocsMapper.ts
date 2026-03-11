import type { CreateDocumentOptions } from "../../../src/types/document";
import type { WorkspaceBinding } from "../../../src/types/workspace";
import type { WorkspaceDriveFile } from "./googleDriveClient";

const GOOGLE_DOC_SOURCE_ID_PREFIX = "google-doc";

const createWorkspaceDocumentId = (fileId: string) => `google-doc:${fileId}`;

type NamedStyleType = "HEADING_1" | "HEADING_2" | "HEADING_3";

interface InlineStyleState {
  bold?: boolean;
  italic?: boolean;
  linkUrl?: string;
  strikethrough?: boolean;
  underline?: boolean;
}

interface InlineRun extends InlineStyleState {
  text: string;
}

interface MarkdownBlock {
  kind: "bullet" | "heading" | "ordered" | "paragraph";
  level?: 1 | 2 | 3;
  runs: InlineRun[];
}

interface BlockRange {
  endIndex: number;
  kind: MarkdownBlock["kind"];
  namedStyleType?: NamedStyleType;
  startIndex: number;
}

interface GoogleDocsSyncBuildResult {
  requests: unknown[];
  warnings: string[];
}

const extractHtmlBody = (html: string) => {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

  if (bodyMatch?.[1]) {
    return bodyMatch[1].trim();
  }

  return html.trim();
};

const stripGoogleMeta = (html: string) =>
  html
    .replace(/<meta[\s\S]*?>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .trim();

const mergeInlineRuns = (runs: InlineRun[]) => {
  const merged: InlineRun[] = [];

  for (const run of runs) {
    if (!run.text) {
      continue;
    }

    const previous = merged[merged.length - 1];

    if (
      previous
      && previous.bold === run.bold
      && previous.italic === run.italic
      && previous.underline === run.underline
      && previous.strikethrough === run.strikethrough
      && previous.linkUrl === run.linkUrl
    ) {
      previous.text += run.text;
      continue;
    }

    merged.push({ ...run });
  }

  return merged;
};

const pushTextRun = (runs: InlineRun[], text: string, styles: InlineStyleState) => {
  if (!text) {
    return;
  }

  runs.push({
    ...styles,
    text,
  });
};

const findClosingToken = (text: string, token: string, startIndex: number) => {
  for (let index = startIndex; index < text.length; index += 1) {
    if (text[index] === "\\") {
      index += 1;
      continue;
    }

    if (text.startsWith(token, index)) {
      return index;
    }
  }

  return -1;
};

const findClosingItalic = (text: string, startIndex: number) => {
  for (let index = startIndex; index < text.length; index += 1) {
    if (text[index] === "\\") {
      index += 1;
      continue;
    }

    if (text[index] === "*" && text[index + 1] !== "*") {
      return index;
    }
  }

  return -1;
};

const parseInlineRuns = (text: string, styles: InlineStyleState = {}): InlineRun[] => {
  const runs: InlineRun[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    if (text[cursor] === "\\" && cursor + 1 < text.length) {
      pushTextRun(runs, text[cursor + 1], styles);
      cursor += 2;
      continue;
    }

    if (text.startsWith("**", cursor)) {
      const closingIndex = findClosingToken(text, "**", cursor + 2);

      if (closingIndex > cursor + 2) {
        runs.push(...parseInlineRuns(text.slice(cursor + 2, closingIndex), { ...styles, bold: true }));
        cursor = closingIndex + 2;
        continue;
      }
    }

    if (text.startsWith("~~", cursor)) {
      const closingIndex = findClosingToken(text, "~~", cursor + 2);

      if (closingIndex > cursor + 2) {
        runs.push(...parseInlineRuns(text.slice(cursor + 2, closingIndex), { ...styles, strikethrough: true }));
        cursor = closingIndex + 2;
        continue;
      }
    }

    if (text.startsWith("<u>", cursor)) {
      const closingIndex = text.indexOf("</u>", cursor + 3);

      if (closingIndex > cursor + 3) {
        runs.push(...parseInlineRuns(text.slice(cursor + 3, closingIndex), { ...styles, underline: true }));
        cursor = closingIndex + 4;
        continue;
      }
    }

    if (text[cursor] === "*") {
      const closingIndex = findClosingItalic(text, cursor + 1);

      if (closingIndex > cursor + 1) {
        runs.push(...parseInlineRuns(text.slice(cursor + 1, closingIndex), { ...styles, italic: true }));
        cursor = closingIndex + 1;
        continue;
      }
    }

    if (text[cursor] === "[") {
      const labelEndIndex = text.indexOf("]", cursor + 1);
      const urlStartIndex = labelEndIndex >= 0 && text[labelEndIndex + 1] === "(" ? labelEndIndex + 2 : -1;
      const urlEndIndex = urlStartIndex >= 0 ? text.indexOf(")", urlStartIndex) : -1;

      if (labelEndIndex > cursor + 1 && urlStartIndex > 0 && urlEndIndex > urlStartIndex) {
        const label = text.slice(cursor + 1, labelEndIndex);
        const url = text.slice(urlStartIndex, urlEndIndex);
        runs.push(...parseInlineRuns(label, { ...styles, linkUrl: url }));
        cursor = urlEndIndex + 1;
        continue;
      }
    }

    let nextSpecialIndex = cursor + 1;

    while (nextSpecialIndex < text.length) {
      if (
        text[nextSpecialIndex] === "\\"
        || text[nextSpecialIndex] === "["
        || text[nextSpecialIndex] === "*"
        || text.startsWith("**", nextSpecialIndex)
        || text.startsWith("~~", nextSpecialIndex)
        || text.startsWith("<u>", nextSpecialIndex)
      ) {
        break;
      }

      nextSpecialIndex += 1;
    }

    pushTextRun(runs, text.slice(cursor, nextSpecialIndex), styles);
    cursor = nextSpecialIndex;
  }

  return mergeInlineRuns(runs);
};

const getUnsupportedMarkdownWarnings = (markdown: string) => {
  const warnings: string[] = [];

  if (/```/.test(markdown)) {
    warnings.push("Code fences are not preserved in Google Docs sync.");
  }

  if (/\$\$/.test(markdown)) {
    warnings.push("Math blocks are not preserved in Google Docs sync.");
  }

  if (/!\[[^\]]*\]\([^)]+\)/.test(markdown)) {
    warnings.push("Images are not preserved in Google Docs sync.");
  }

  if (/^\|.+\|$/m.test(markdown)) {
    warnings.push("Markdown tables are not preserved in Google Docs sync.");
  }

  if (/^\s*>\s+/m.test(markdown)) {
    warnings.push("Block quotes and admonitions are flattened during Google Docs sync.");
  }

  if (/\[\[toc\]\]/i.test(markdown)) {
    warnings.push("TOC placeholders are not preserved in Google Docs sync.");
  }

  if (/\[\^[^\]]+\]/.test(markdown)) {
    warnings.push("Footnotes are not preserved in Google Docs sync.");
  }

  if (/\[@[^\]]+\]/.test(markdown)) {
    warnings.push("Cross-references are flattened during Google Docs sync.");
  }

  if (/<sub>|<sup>|==|`/.test(markdown)) {
    warnings.push("Some inline formatting is reduced during Google Docs sync.");
  }

  return Array.from(new Set(warnings));
};

const parseMarkdownBlocks = (markdown: string): MarkdownBlock[] => {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) {
      return;
    }

    const text = paragraphLines.join(" ").trim();

    if (text) {
      blocks.push({
        kind: "paragraph",
        runs: parseInlineRuns(text),
      });
    }

    paragraphLines = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      flushParagraph();
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);

    if (headingMatch) {
      flushParagraph();
      blocks.push({
        kind: "heading",
        level: headingMatch[1].length as 1 | 2 | 3,
        runs: parseInlineRuns(headingMatch[2].trim()),
      });
      continue;
    }

    const bulletMatch = line.match(/^\s*[-*]\s+(.*)$/);

    if (bulletMatch) {
      flushParagraph();
      blocks.push({
        kind: "bullet",
        runs: parseInlineRuns(bulletMatch[1].trim()),
      });
      continue;
    }

    const orderedMatch = line.match(/^\s*\d+\.\s+(.*)$/);

    if (orderedMatch) {
      flushParagraph();
      blocks.push({
        kind: "ordered",
        runs: parseInlineRuns(orderedMatch[1].trim()),
      });
      continue;
    }

    paragraphLines.push(line.trim());
  }

  flushParagraph();

  if (blocks.length === 0) {
    blocks.push({
      kind: "paragraph",
      runs: [{ text: "" }],
    });
  }

  return blocks;
};

const getHeadingStyleType = (level: 1 | 2 | 3): NamedStyleType =>
  level === 1 ? "HEADING_1" : level === 2 ? "HEADING_2" : "HEADING_3";

const getGoogleDocumentContentEndIndex = (document: unknown) => {
  const bodyContent = (document as { body?: { content?: Array<{ endIndex?: number }> } })?.body?.content || [];
  const lastElement = bodyContent[bodyContent.length - 1];
  return lastElement?.endIndex || 2;
};

const getGoogleDocumentRevisionId = (document: unknown) =>
  (document as { revisionId?: string })?.revisionId;

const buildTextStyleFields = (run: InlineRun) => {
  const fields = [
    run.bold ? "bold" : null,
    run.italic ? "italic" : null,
    run.underline ? "underline" : null,
    run.strikethrough ? "strikethrough" : null,
    run.linkUrl ? "link" : null,
  ].filter(Boolean);

  return fields.join(",");
};

const buildGoogleDocsSyncRequests = (currentDocument: unknown, markdown: string): GoogleDocsSyncBuildResult => {
  const blocks = parseMarkdownBlocks(markdown);
  const warnings = getUnsupportedMarkdownWarnings(markdown);
  const plainTextParts: string[] = [];
  const blockRanges: BlockRange[] = [];
  const textStyleRequests: unknown[] = [];
  let currentIndex = 1;

  for (const block of blocks) {
    const blockStartIndex = currentIndex;
    let blockText = "";

    for (const run of block.runs) {
      const runStartIndex = currentIndex;
      blockText += run.text;
      currentIndex += run.text.length;

      const fields = buildTextStyleFields(run);

      if (fields && run.text.length > 0) {
        textStyleRequests.push({
          updateTextStyle: {
            fields,
            range: {
              endIndex: currentIndex,
              startIndex: runStartIndex,
            },
            textStyle: {
              bold: run.bold || undefined,
              italic: run.italic || undefined,
              link: run.linkUrl ? { url: run.linkUrl } : undefined,
              strikethrough: run.strikethrough || undefined,
              underline: run.underline || undefined,
            },
          },
        });
      }
    }

    plainTextParts.push(blockText);
    plainTextParts.push("\n");
    currentIndex += 1;

    blockRanges.push({
      endIndex: currentIndex,
      kind: block.kind,
      namedStyleType: block.kind === "heading" && block.level ? getHeadingStyleType(block.level) : undefined,
      startIndex: blockStartIndex,
    });
  }

  const paragraphRequests = blockRanges
    .filter((range) => Boolean(range.namedStyleType))
    .map((range) => ({
      updateParagraphStyle: {
        fields: "namedStyleType",
        paragraphStyle: {
          namedStyleType: range.namedStyleType,
        },
        range: {
          endIndex: range.endIndex,
          startIndex: range.startIndex,
        },
      },
    }));

  const bulletRequests: unknown[] = [];

  for (let index = 0; index < blockRanges.length; index += 1) {
    const range = blockRanges[index];

    if (range.kind !== "bullet" && range.kind !== "ordered") {
      continue;
    }

    const preset = range.kind === "bullet"
      ? "BULLET_DISC_CIRCLE_SQUARE"
      : "NUMBERED_DECIMAL_ALPHA_ROMAN";
    let endIndex = range.endIndex;

    while (
      index + 1 < blockRanges.length
      && blockRanges[index + 1]?.kind === range.kind
    ) {
      index += 1;
      endIndex = blockRanges[index].endIndex;
    }

    bulletRequests.push({
      createParagraphBullets: {
        bulletPreset: preset,
        range: {
          endIndex,
          startIndex: range.startIndex,
        },
      },
    });
  }

  const replaceRequests: unknown[] = [];
  const currentDocumentEndIndex = getGoogleDocumentContentEndIndex(currentDocument);
  const deleteEndIndex = currentDocumentEndIndex - 1;

  if (deleteEndIndex > 1) {
    replaceRequests.push({
      deleteContentRange: {
        range: {
          endIndex: deleteEndIndex,
          startIndex: 1,
        },
      },
    });
  }

  const plainText = plainTextParts.join("") || "\n";

  replaceRequests.push({
    insertText: {
      location: {
        index: 1,
      },
      text: plainText,
    },
  });

  return {
    requests: [
      ...replaceRequests,
      ...paragraphRequests,
      ...bulletRequests,
      ...textStyleRequests,
    ],
    warnings,
  };
};

export const buildWorkspaceBinding = (
  file: WorkspaceDriveFile,
  importedAt: number,
): WorkspaceBinding => ({
  documentKind: "google_docs",
  driveModifiedTime: file.modifiedTime,
  fileId: file.fileId,
  importedAt,
  mimeType: file.mimeType,
  provider: "google_drive",
  revisionId: file.revisionId,
  syncStatus: "imported",
});

export const buildImportedGoogleDocument = ({
  docsRevisionId,
  exportedHtml,
  file,
  importedAt,
}: {
  docsRevisionId?: string;
  exportedHtml: string;
  file: WorkspaceDriveFile;
  importedAt: number;
}): CreateDocumentOptions => {
  const content = stripGoogleMeta(extractHtmlBody(exportedHtml));

  return {
    content,
    createdAt: importedAt,
    id: createWorkspaceDocumentId(file.fileId),
    metadata: {
      sourceFiles: [{
        fileName: file.name,
        importedAt,
        sourceFormat: "html",
        sourceId: `${GOOGLE_DOC_SOURCE_ID_PREFIX}:${file.fileId}`,
      }],
      title: file.name,
    },
    mode: "html",
    name: file.name,
    sourceSnapshots: {
      html: content,
    },
    storageKind: "docsy",
    updatedAt: importedAt,
    workspaceBinding: {
      ...buildWorkspaceBinding(file, importedAt),
      revisionId: docsRevisionId || file.revisionId,
    },
  };
};

export const getRevisionIdFromGoogleDocument = (document: unknown) =>
  getGoogleDocumentRevisionId(document);

export const buildGoogleDocsBatchUpdateFromMarkdown = (currentDocument: unknown, markdown: string) =>
  buildGoogleDocsSyncRequests(currentDocument, markdown);
