import yaml from "js-yaml";
import {
  createEmptyIngestionDocument,
  type IngestionChunk,
  type IngestionImage,
  type IngestionMetadata,
  type IngestionRequest,
  type IngestionSection,
  type NormalizedIngestionDocument,
} from "@/lib/ingestion/contracts";

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const MARKDOWN_HEADING_PATTERN = /^(#{1,3})\s+(.+?)\s*$/;
const MARKDOWN_IMAGE_PATTERN = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)/g;
const LATEX_SECTION_PATTERN = /\\(section|subsection|subsubsection)\{([^}]*)\}/g;
const LATEX_IMAGE_PATTERN = /\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/g;
const ASCIIDOC_TITLE_PATTERN = /^=\s+(.+?)\s*$/;
const ASCIIDOC_HEADING_PATTERN = /^(={2,6})\s+(.+?)\s*$/;
const ASCIIDOC_ATTRIBUTE_PATTERN = /^:([\w-]+):\s*(.*?)\s*$/;
const ASCIIDOC_ANCHOR_PATTERN = /^(?:\[\[([^\]]+)\]\]|\[#([^\]]+)\])\s*$/;
const ASCIIDOC_IMAGE_PATTERN = /^image::?([^\[]+)\[([^\]]*)\]\s*$/;
const RST_FIELD_PATTERN = /^:([\w-]+):\s*(.*?)\s*$/;
const RST_LABEL_PATTERN = /^\.\.\s+_([^:]+):\s*$/;
const RST_IMAGE_PATTERN = /^\.\.\s+(?:image|figure)::\s+(.+?)\s*$/;
const MAX_CHUNK_LENGTH = 1200;
const RST_ADORNMENT_CHARACTERS = new Set([
  "=",
  "-",
  "~",
  "^",
  "\"",
  "+",
  "`",
  ":",
  "#",
  "'",
  ".",
  "*",
  "_",
  "!",
  "$",
  "%",
  "&",
  ",",
  ";",
  "?",
  "@",
  "\\",
  "|",
  "/",
  "<",
  ">",
  "(",
  ")",
  "{",
  "}",
  "[",
  "]",
]);

interface SectionDraft {
  level: number;
  path: string[];
  text: string;
  title: string;
}

interface ImageDraft {
  alt?: string;
  caption?: string;
  metadata?: Record<string, string>;
  path?: string[];
  src: string;
  surroundingText?: string;
  title?: string;
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "section";

const cleanInlineText = (value: string | null | undefined) => {
  if (!value) {
    return undefined;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized || undefined;
};

const normalizeAuthors = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/,|;|\band\b|\\and/gi)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return undefined;
};

const normalizeTags = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return undefined;
};

const normalizeLabels = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, String(entry)]),
  );
};

const stripMarkdown = (value: string) =>
  value
    .replace(FRONTMATTER_PATTERN, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/^- \[[ xX]\]\s+/gm, "")
    .replace(/^- /gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const stripHtml = (value: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(value, "text/html");
  return (doc.body.textContent || "").replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
};

const stripLatex = (value: string) =>
  value
    .replace(/%.*$/gm, "")
    .replace(/\\(begin|end)\{[^}]+\}/g, "")
    .replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?\{([^}]*)\}/g, "$1")
    .replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?/g, "")
    .replace(/[{}]/g, "")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const stripAsciidoc = (value: string) =>
  value
    .replace(/^:([\w-]+):\s*(.*?)\s*$/gm, "")
    .replace(/^(?:\[\[[^\]]+\]\]|\[#([^\]]+)\])\s*$/gm, "")
    .replace(/^(={1,6})\s+/gm, "")
    .replace(/^(?:NOTE|TIP|WARNING|IMPORTANT|CAUTION):\s*/gm, "")
    .replace(/^[-*+.]+\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/^----$/gm, "")
    .replace(/^____$/gm, "")
    .replace(/^\|===$/gm, "")
    .replace(/image::([^\[]+)\[([^\]]*)\]/g, "$2")
    .replace(/image:([^\[]+)\[([^\]]*)\]/g, "$2")
    .replace(/(?:link:)?https?:\/\/[^\s\[]+\[([^\]]*)\]/g, "$1")
    .replace(/xref:[^\[]+\[([^\]]*)\]/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const stripRst = (value: string) =>
  value
    .replace(/^:([\w-]+):\s*(.*?)\s*$/gm, "")
    .replace(/^\.\.\s+_[^:]+:\s*$/gm, "")
    .replace(/^([=\-~^"+`:#'.*_!$%&,;?@\\|/<>(){}\[\]])\1+\s*$/gm, "")
    .replace(/^(\s*)[-*+]\s+/gm, "")
    .replace(/^\s*[\d#]+[.)]\s+/gm, "")
    .replace(/``([^`]+)``/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/:math:`([^`]+)`/g, "$1")
    .replace(/:sub:`([^`]+)`/g, "$1")
    .replace(/:sup:`([^`]+)`/g, "$1")
    .replace(/:emphasis:`([^`]+)`/g, "$1")
    .replace(/:strong:`([^`]+)`/g, "$1")
    .replace(/:title-reference:`([^`]+)`/g, "$1")
    .replace(/:abbr:`([^`]+)`/g, "$1")
    .replace(/`([^<`]+?)\s*<([^>]+)>`_/g, "$1")
    .replace(/`([^`]+)`__/g, "$1")
    .replace(/`([^`]+)`_/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const getRstAdornmentChar = (line: string) => {
  const trimmed = line.trim();

  if (trimmed.length < 2) {
    return null;
  }

  const firstCharacter = trimmed[0];

  if (!RST_ADORNMENT_CHARACTERS.has(firstCharacter)) {
    return null;
  }

  return trimmed.split("").every((character) => character === firstCharacter) ? firstCharacter : null;
};

const createSectionId = (draft: SectionDraft, index: number) =>
  `sec-${String(index + 1).padStart(3, "0")}-${slugify(draft.title)}`;

const createImageId = (draft: ImageDraft, index: number) => {
  const baseName = draft.src
    .split(/[\\/]/)
    .pop()
    ?.replace(/\.[^.]+$/, "")
    || draft.alt
    || draft.title
    || "image";

  return `img-${String(index + 1).padStart(3, "0")}-${slugify(baseName)}`;
};

const toSection = (draft: SectionDraft, index: number): IngestionSection => ({
  level: draft.level,
  path: draft.path,
  sectionId: createSectionId(draft, index),
  text: draft.text.trim(),
  title: draft.title,
});

const toImages = (drafts: ImageDraft[], sections: IngestionSection[]): IngestionImage[] => {
  const sectionByPath = new Map(sections.map((section) => [section.path.join("\u0000"), section]));

  return drafts.map((draft, index) => {
    const section = draft.path?.length ? sectionByPath.get(draft.path.join("\u0000")) : undefined;
    const metadata = {
      ...draft.metadata,
      ...(section ? {
        sectionPath: section.path.join(" > "),
        sectionTitle: section.title,
      } : {}),
    };

    return {
      alt: cleanInlineText(draft.alt),
      caption: cleanInlineText(draft.caption),
      imageId: createImageId(draft, index),
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      order: index,
      sectionId: section?.sectionId,
      src: draft.src.trim(),
      surroundingText: cleanInlineText(draft.surroundingText),
      title: cleanInlineText(draft.title),
    };
  });
};

const estimateTokens = (text: string) => Math.max(1, Math.ceil(text.length / 4));

const chunkText = (text: string) => {
  const normalized = text.trim();

  if (!normalized) {
    return [];
  }

  if (normalized.length <= MAX_CHUNK_LENGTH) {
    return [normalized];
  }

  const paragraphs = normalized.split(/\n\s*\n/).map((entry) => entry.trim()).filter(Boolean);
  const chunks: string[] = [];
  let buffer = "";

  for (const paragraph of paragraphs) {
    const candidate = buffer ? `${buffer}\n\n${paragraph}` : paragraph;

    if (candidate.length <= MAX_CHUNK_LENGTH) {
      buffer = candidate;
      continue;
    }

    if (buffer) {
      chunks.push(buffer);
      buffer = "";
    }

    if (paragraph.length <= MAX_CHUNK_LENGTH) {
      buffer = paragraph;
      continue;
    }

    for (let index = 0; index < paragraph.length; index += MAX_CHUNK_LENGTH) {
      chunks.push(paragraph.slice(index, index + MAX_CHUNK_LENGTH).trim());
    }
  }

  if (buffer) {
    chunks.push(buffer);
  }

  return chunks;
};

const buildChunks = (plainText: string, sections: IngestionSection[]): IngestionChunk[] => {
  const chunks: IngestionChunk[] = [];
  let order = 0;

  if (sections.length === 0) {
    return chunkText(plainText).map((text, index) => ({
      chunkId: `chunk-${String(index + 1).padStart(3, "0")}`,
      order: index,
      text,
      tokenEstimate: estimateTokens(text),
    }));
  }

  for (const section of sections) {
    const sectionChunks = chunkText(section.text.length > 0 ? section.text : section.title);

    for (let index = 0; index < sectionChunks.length; index += 1) {
      const text = sectionChunks[index];
      chunks.push({
        chunkId: `${section.sectionId}-chunk-${String(index + 1).padStart(2, "0")}`,
        metadata: {
          sectionPath: section.path.join(" > "),
          sectionTitle: section.title,
        },
        order,
        sectionId: section.sectionId,
        text,
        tokenEstimate: estimateTokens(text),
      });
      order += 1;
    }
  }

  return chunks;
};

const parseAsciidocImageAttributes = (value: string) => {
  const attributes: Record<string, string> = {};
  const positional: string[] = [];

  for (const token of value.split(",").map((entry) => entry.trim()).filter(Boolean)) {
    const separatorIndex = token.indexOf("=");

    if (separatorIndex >= 0) {
      const key = token.slice(0, separatorIndex).trim().toLowerCase();
      const attributeValue = token.slice(separatorIndex + 1).trim().replace(/^"(.*)"$/, "$1");

      if (key) {
        attributes[key] = attributeValue;
      }

      continue;
    }

    positional.push(token.replace(/^"(.*)"$/, "$1"));
  }

  return {
    alt: attributes.alt || positional[0],
    caption: attributes.caption,
    title: attributes.title || attributes.alt,
  };
};

const extractMarkdownImages = (request: IngestionRequest, sections: IngestionSection[]) => {
  const lines = request.rawContent.replace(FRONTMATTER_PATTERN, "").split(/\r?\n/);
  const pathStack: string[] = [];
  const drafts: ImageDraft[] = [];

  for (const line of lines) {
    const headingMatch = line.match(MARKDOWN_HEADING_PATTERN);

    if (headingMatch) {
      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();
      pathStack.splice(level - 1);
      pathStack[level - 1] = title;
      continue;
    }

    for (const match of line.matchAll(MARKDOWN_IMAGE_PATTERN)) {
      drafts.push({
        alt: match[1],
        path: pathStack.length > 0 ? [...pathStack] : undefined,
        src: match[2],
        surroundingText: stripMarkdown(line),
        title: match[3],
      });
    }
  }

  return toImages(drafts, sections);
};

const extractHtmlImages = (request: IngestionRequest, sections: IngestionSection[]) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(request.rawContent, "text/html");
  const pathStack: string[] = [];
  const drafts: ImageDraft[] = [];
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode();

  while (node) {
    const element = node as HTMLElement;
    const tagName = element.tagName.toLowerCase();

    if (/^h[1-3]$/.test(tagName)) {
      const level = Number(tagName.slice(1));
      const title = cleanInlineText(element.textContent);

      if (title) {
        pathStack.splice(level - 1);
        pathStack[level - 1] = title;
      }
    }

    if (tagName === "img") {
      const figure = element.closest("figure");
      const caption = figure?.querySelector("figcaption")?.textContent;
      const surroundingText = (figure || element.parentElement)?.textContent;

      drafts.push({
        alt: element.getAttribute("alt") || undefined,
        caption: caption || undefined,
        path: pathStack.length > 0 ? [...pathStack] : undefined,
        src: element.getAttribute("src") || "",
        surroundingText,
        title: element.getAttribute("title") || undefined,
      });
    }

    node = walker.nextNode();
  }

  return toImages(drafts.filter((draft) => Boolean(draft.src.trim())), sections);
};

const extractLatexImages = (request: IngestionRequest, sections: IngestionSection[]) => {
  const sectionMatches = Array.from(request.rawContent.matchAll(LATEX_SECTION_PATTERN));
  const sectionPaths = sectionMatches.map((match) => {
    const index = sectionMatches.indexOf(match);
    const level = match[1] === "section" ? 1 : match[1] === "subsection" ? 2 : 3;
    const title = stripLatex(match[2]);
    const priorPath = sectionMatches
      .slice(0, index)
      .reduce<string[]>((path, priorMatch) => {
        const priorLevel = priorMatch[1] === "section" ? 1 : priorMatch[1] === "subsection" ? 2 : 3;
        const priorTitle = stripLatex(priorMatch[2]);
        path.splice(priorLevel - 1);
        path[priorLevel - 1] = priorTitle;
        return path;
      }, []);

    priorPath.splice(level - 1);
    priorPath[level - 1] = title;
    return {
      path: [...priorPath],
      start: match.index || 0,
    };
  });
  const drafts: ImageDraft[] = [];

  for (const match of request.rawContent.matchAll(LATEX_IMAGE_PATTERN)) {
    const startIndex = match.index || 0;
    const nearbyText = request.rawContent.slice(Math.max(0, startIndex - 320), Math.min(request.rawContent.length, startIndex + 320));
    const captionMatch = nearbyText.match(/\\caption\{([^}]*)\}/);
    const path = [...sectionPaths]
      .reverse()
      .find((entry) => entry.start <= startIndex)
      ?.path;

    drafts.push({
      caption: captionMatch?.[1],
      path,
      src: match[1],
      surroundingText: stripLatex(nearbyText),
    });
  }

  return toImages(drafts, sections);
};

const extractAsciidocImages = (request: IngestionRequest, sections: IngestionSection[]) => {
  const lines = request.rawContent.split(/\r?\n/);
  const pathStack: string[] = [];
  const drafts: ImageDraft[] = [];

  for (const line of lines) {
    const titleMatch = line.match(ASCIIDOC_TITLE_PATTERN);

    if (titleMatch && !line.startsWith("==")) {
      continue;
    }

    const headingMatch = line.match(ASCIIDOC_HEADING_PATTERN);

    if (headingMatch) {
      const level = headingMatch[1].length - 1;
      const title = stripAsciidoc(headingMatch[2]);
      pathStack.splice(level - 1);
      pathStack[level - 1] = title;
      continue;
    }

    const imageMatch = line.match(ASCIIDOC_IMAGE_PATTERN);

    if (!imageMatch) {
      continue;
    }

    const attributes = parseAsciidocImageAttributes(imageMatch[2]);
    drafts.push({
      alt: attributes.alt,
      caption: attributes.caption,
      path: pathStack.length > 0 ? [...pathStack] : undefined,
      src: imageMatch[1].trim(),
      surroundingText: stripAsciidoc(line),
      title: attributes.title,
    });
  }

  return toImages(drafts, sections);
};

const extractRstImages = (request: IngestionRequest, sections: IngestionSection[]) => {
  const lines = request.rawContent.split(/\r?\n/);
  const pathStack: string[] = [];
  const levelByAdornment = new Map<string, number>();
  const drafts: ImageDraft[] = [];
  let lineIndex = 0;

  const getLevel = (adornment: string, hasOverline: boolean) => {
    const key = `${hasOverline ? "overline" : "underline"}:${adornment}`;

    if (!levelByAdornment.has(key)) {
      levelByAdornment.set(key, levelByAdornment.size + 1);
    }

    return levelByAdornment.get(key) ?? 1;
  };

  while (lineIndex < lines.length) {
    const line = lines[lineIndex];
    const nextLine = lines[lineIndex + 1] || "";
    const nextNextLine = lines[lineIndex + 2] || "";
    const overlineAdornment = getRstAdornmentChar(line);
    const underlineAdornment = getRstAdornmentChar(nextNextLine);

    if (
      overlineAdornment
      && nextLine.trim()
      && underlineAdornment === overlineAdornment
      && nextNextLine.trim().length >= nextLine.trim().length
    ) {
      const title = stripRst(nextLine);
      const level = getLevel(overlineAdornment, true);
      pathStack.splice(level - 1);
      pathStack[level - 1] = title;
      lineIndex += 3;
      continue;
    }

    const nextAdornment = getRstAdornmentChar(nextLine);

    if (
      line.trim()
      && !getRstAdornmentChar(line)
      && nextAdornment
      && nextLine.trim().length >= line.trim().length
    ) {
      const title = stripRst(line);
      const level = getLevel(nextAdornment, false);
      pathStack.splice(level - 1);
      pathStack[level - 1] = title;
      lineIndex += 2;
      continue;
    }

    const imageMatch = line.match(RST_IMAGE_PATTERN);

    if (!imageMatch) {
      lineIndex += 1;
      continue;
    }

    let alt: string | undefined;
    const captionLines: string[] = [];
    let scanIndex = lineIndex + 1;

    while (scanIndex < lines.length) {
      const candidate = lines[scanIndex];

      if (!candidate.trim()) {
        scanIndex += 1;
        break;
      }

      const optionMatch = candidate.match(/^\s+:([\w-]+):\s*(.*?)\s*$/);

      if (optionMatch) {
        if (optionMatch[1].toLowerCase() === "alt") {
          alt = optionMatch[2].trim();
        }

        scanIndex += 1;
        continue;
      }

      break;
    }

    while (scanIndex < lines.length) {
      const candidate = lines[scanIndex];

      if (!candidate.trim()) {
        break;
      }

      if (!candidate.startsWith("   ") && !candidate.startsWith("\t")) {
        break;
      }

      captionLines.push(candidate.trim());
      scanIndex += 1;
    }

    drafts.push({
      alt,
      caption: captionLines.join(" "),
      path: pathStack.length > 0 ? [...pathStack] : undefined,
      src: imageMatch[1].trim(),
      surroundingText: stripRst(captionLines.join("\n")),
    });
    lineIndex = scanIndex;
  }

  return toImages(drafts, sections);
};

const extractImages = (request: IngestionRequest, sections: IngestionSection[]) => {
  if (request.sourceFormat === "markdown") {
    return extractMarkdownImages(request, sections);
  }

  if (request.sourceFormat === "html") {
    return extractHtmlImages(request, sections);
  }

  if (request.sourceFormat === "latex") {
    return extractLatexImages(request, sections);
  }

  if (request.sourceFormat === "asciidoc") {
    return extractAsciidocImages(request, sections);
  }

  if (request.sourceFormat === "rst") {
    return extractRstImages(request, sections);
  }

  return [];
};

const extractMarkdown = (request: IngestionRequest) => {
  const frontmatterMatch = request.rawContent.match(FRONTMATTER_PATTERN);
  const frontmatter = frontmatterMatch?.[1] ? yaml.load(frontmatterMatch[1]) : undefined;
  const content = request.rawContent.replace(FRONTMATTER_PATTERN, "");
  const lines = content.split(/\r?\n/);
  const sectionDrafts: SectionDraft[] = [];
  const pathStack: string[] = [];
  let current: Omit<SectionDraft, "text"> & { lines: string[] } | null = null;

  const finalizeCurrent = () => {
    if (!current) {
      return;
    }

    sectionDrafts.push({
      level: current.level,
      path: current.path,
      text: stripMarkdown(current.lines.join("\n")),
      title: current.title,
    });
  };

  for (const line of lines) {
    const headingMatch = line.match(MARKDOWN_HEADING_PATTERN);

    if (!headingMatch) {
      current?.lines.push(line);
      continue;
    }

    finalizeCurrent();
    const level = headingMatch[1].length;
    const title = headingMatch[2].trim();
    pathStack.splice(level - 1);
    pathStack[level - 1] = title;
    current = {
      level,
      lines: [],
      path: [...pathStack],
      title,
    };
  }

  finalizeCurrent();

  const parsedFrontmatter = (frontmatter && typeof frontmatter === "object" && !Array.isArray(frontmatter))
    ? frontmatter as Record<string, unknown>
    : {};

  const metadata: IngestionMetadata = {
    authors: normalizeAuthors(parsedFrontmatter.authors),
    documentType: typeof parsedFrontmatter.docType === "string"
      ? parsedFrontmatter.docType
      : typeof parsedFrontmatter.documentType === "string"
        ? parsedFrontmatter.documentType
        : undefined,
    labels: normalizeLabels(parsedFrontmatter.labels),
    tags: normalizeTags(parsedFrontmatter.tags),
    title: typeof parsedFrontmatter.title === "string"
      ? parsedFrontmatter.title
      : sectionDrafts[0]?.title,
  };

  return {
    metadata,
    plainText: stripMarkdown(content),
    sections: sectionDrafts.map(toSection),
  };
};

const extractHtml = (request: IngestionRequest) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(request.rawContent, "text/html");
  const body = doc.body;
  const metadata: IngestionMetadata = {
    authors: normalizeAuthors(doc.querySelector('meta[name="author"]')?.getAttribute("content") || undefined),
    labels: Object.fromEntries(Array.from(doc.querySelectorAll("[id]")).map((element) => {
      const id = element.getAttribute("id") || "";
      return [id, id];
    }).filter(([id]) => Boolean(id))),
    tags: normalizeTags(doc.querySelector('meta[name="keywords"]')?.getAttribute("content") || undefined),
    title: doc.querySelector("title")?.textContent?.trim() || body.querySelector("h1")?.textContent?.trim() || undefined,
  };
  const sectionDrafts: SectionDraft[] = [];
  const pathStack: string[] = [];
  let current: Omit<SectionDraft, "text"> & { parts: string[] } | null = null;

  const finalizeCurrent = () => {
    if (!current) {
      return;
    }

    sectionDrafts.push({
      level: current.level,
      path: current.path,
      text: current.parts.join(" ").replace(/\s+/g, " ").trim(),
      title: current.title,
    });
  };

  const walker = doc.createTreeWalker(body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let currentNode = walker.nextNode();

  while (currentNode) {
    if (currentNode.nodeType === Node.ELEMENT_NODE) {
      const element = currentNode as HTMLElement;
      const tagName = element.tagName.toLowerCase();

      if (/^h[1-3]$/.test(tagName)) {
        finalizeCurrent();
        const level = Number(tagName.slice(1));
        const title = (element.textContent || "").trim();
        pathStack.splice(level - 1);
        pathStack[level - 1] = title;
        current = {
          level,
          parts: [],
          path: [...pathStack],
          title,
        };
      }
    }

    if (
      current
      && currentNode.nodeType === Node.TEXT_NODE
      && currentNode.parentElement
      && !/^h[1-3]$/i.test(currentNode.parentElement.tagName)
    ) {
      const text = currentNode.textContent?.replace(/\s+/g, " ").trim();

      if (text) {
        current.parts.push(text);
      }
    }

    currentNode = walker.nextNode();
  }

  finalizeCurrent();

  return {
    metadata,
    plainText: stripHtml(request.rawContent),
    sections: sectionDrafts.map(toSection),
  };
};

const extractLatex = (request: IngestionRequest) => {
  const titleMatch = request.rawContent.match(/\\title\{([^}]*)\}/);
  const authorMatch = request.rawContent.match(/\\author\{([^}]*)\}/);
  const keywordsMatch = request.rawContent.match(/\\keywords\{([^}]*)\}/);
  const labelMatches = Array.from(request.rawContent.matchAll(/\\label\{([^}]*)\}/g)).map((match) => match[1]);
  const metadata: IngestionMetadata = {
    authors: normalizeAuthors(authorMatch?.[1]),
    labels: Object.fromEntries(labelMatches.map((label) => [label, label])),
    tags: normalizeTags(keywordsMatch?.[1]),
    title: titleMatch?.[1]?.trim(),
  };
  const sectionDrafts: SectionDraft[] = [];
  const pathStack: string[] = [];
  const matches = Array.from(request.rawContent.matchAll(LATEX_SECTION_PATTERN));

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const nextMatch = matches[index + 1];
    const level = match[1] === "section" ? 1 : match[1] === "subsection" ? 2 : 3;
    const title = stripLatex(match[2]);
    const startIndex = (match.index || 0) + match[0].length;
    const endIndex = nextMatch?.index || request.rawContent.length;
    const text = stripLatex(request.rawContent.slice(startIndex, endIndex));

    pathStack.splice(level - 1);
    pathStack[level - 1] = title;
    sectionDrafts.push({
      level,
      path: [...pathStack],
      text,
      title,
    });
  }

  if (!metadata.title) {
    metadata.title = sectionDrafts[0]?.title;
  }

  return {
    metadata,
    plainText: stripLatex(request.rawContent),
    sections: sectionDrafts.map(toSection),
  };
};

const extractAsciidoc = (request: IngestionRequest) => {
  const lines = request.rawContent.split(/\r?\n/);
  const attributes: Record<string, string> = {};
  const labels: Record<string, string> = {};
  const sectionDrafts: SectionDraft[] = [];
  const pathStack: string[] = [];
  let current: Omit<SectionDraft, "text"> & { lines: string[] } | null = null;

  const finalizeCurrent = () => {
    if (!current) {
      return;
    }

    sectionDrafts.push({
      level: current.level,
      path: current.path,
      text: stripAsciidoc(current.lines.join("\n")),
      title: current.title,
    });
  };

  for (const line of lines) {
    const attributeMatch = line.match(ASCIIDOC_ATTRIBUTE_PATTERN);

    if (attributeMatch) {
      attributes[attributeMatch[1].toLowerCase()] = attributeMatch[2].trim();
      continue;
    }

    const anchorMatch = line.match(ASCIIDOC_ANCHOR_PATTERN);

    if (anchorMatch) {
      const label = (anchorMatch[1] || anchorMatch[2] || "").trim();

      if (label) {
        labels[label] = label;
      }

      continue;
    }

    const titleMatch = line.match(ASCIIDOC_TITLE_PATTERN);

    if (titleMatch && !line.startsWith("==")) {
      attributes.doctitle = stripAsciidoc(titleMatch[1]);
      continue;
    }

    const headingMatch = line.match(ASCIIDOC_HEADING_PATTERN);

    if (!headingMatch) {
      current?.lines.push(line);
      continue;
    }

    finalizeCurrent();
    const level = headingMatch[1].length - 1;
    const title = stripAsciidoc(headingMatch[2]);
    pathStack.splice(level - 1);
    pathStack[level - 1] = title;
    current = {
      level,
      lines: [],
      path: [...pathStack],
      title,
    };
  }

  finalizeCurrent();

  return {
    metadata: {
      authors: normalizeAuthors(attributes.authors || attributes.author),
      documentType: attributes["document-type"] || attributes.doctype,
      labels: Object.keys(labels).length > 0 ? labels : undefined,
      tags: normalizeTags(attributes.keywords || attributes.tags),
      title: attributes.doctitle || sectionDrafts[0]?.title || request.fileName.replace(/\.[^.]+$/, ""),
    } satisfies IngestionMetadata,
    plainText: stripAsciidoc(request.rawContent),
    sections: sectionDrafts.map(toSection),
  };
};

const extractRst = (request: IngestionRequest) => {
  const lines = request.rawContent.split(/\r?\n/);
  const fieldValues: Record<string, string> = {};
  const labels: Record<string, string> = {};
  const levelByAdornment = new Map<string, number>();
  const sectionDrafts: SectionDraft[] = [];
  const pathStack: string[] = [];
  let current: Omit<SectionDraft, "text"> & { lines: string[] } | null = null;
  let lineIndex = 0;

  const getLevel = (adornment: string, hasOverline: boolean) => {
    const key = `${hasOverline ? "overline" : "underline"}:${adornment}`;

    if (!levelByAdornment.has(key)) {
      levelByAdornment.set(key, levelByAdornment.size + 1);
    }

    return levelByAdornment.get(key) ?? 1;
  };

  const finalizeCurrent = () => {
    if (!current) {
      return;
    }

    sectionDrafts.push({
      level: current.level,
      path: current.path,
      text: stripRst(current.lines.join("\n")),
      title: current.title,
    });
  };

  while (lineIndex < lines.length) {
    const line = lines[lineIndex];
    const nextLine = lines[lineIndex + 1] || "";
    const nextNextLine = lines[lineIndex + 2] || "";

    const fieldMatch = line.match(RST_FIELD_PATTERN);

    if (fieldMatch) {
      fieldValues[fieldMatch[1].toLowerCase()] = fieldMatch[2].trim();
      lineIndex += 1;
      continue;
    }

    const labelMatch = line.match(RST_LABEL_PATTERN);

    if (labelMatch) {
      const label = labelMatch[1].trim();

      if (label) {
        labels[label] = label;
      }

      lineIndex += 1;
      continue;
    }

    const overlineAdornment = getRstAdornmentChar(line);
    const underlineAdornment = getRstAdornmentChar(nextNextLine);

    if (
      overlineAdornment
      && nextLine.trim()
      && underlineAdornment === overlineAdornment
      && nextNextLine.trim().length >= nextLine.trim().length
    ) {
      finalizeCurrent();
      const title = stripRst(nextLine);
      const level = getLevel(overlineAdornment, true);
      pathStack.splice(level - 1);
      pathStack[level - 1] = title;
      current = {
        level,
        lines: [],
        path: [...pathStack],
        title,
      };
      lineIndex += 3;
      continue;
    }

    const nextAdornment = getRstAdornmentChar(nextLine);

    if (
      line.trim()
      && !getRstAdornmentChar(line)
      && nextAdornment
      && nextLine.trim().length >= line.trim().length
    ) {
      finalizeCurrent();
      const title = stripRst(line);
      const level = getLevel(nextAdornment, false);
      pathStack.splice(level - 1);
      pathStack[level - 1] = title;
      current = {
        level,
        lines: [],
        path: [...pathStack],
        title,
      };
      lineIndex += 2;
      continue;
    }

    current?.lines.push(line);
    lineIndex += 1;
  }

  finalizeCurrent();

  return {
    metadata: {
      authors: normalizeAuthors(fieldValues.authors || fieldValues.author),
      documentType: fieldValues["document-type"] || fieldValues.doctype,
      labels: Object.keys(labels).length > 0 ? labels : undefined,
      tags: normalizeTags(fieldValues.tags || fieldValues.keywords),
      title: fieldValues.title || sectionDrafts[0]?.title || request.fileName.replace(/\.[^.]+$/, ""),
    } satisfies IngestionMetadata,
    plainText: stripRst(request.rawContent),
    sections: sectionDrafts.map(toSection),
  };
};

const extractFallback = (request: IngestionRequest) => ({
  metadata: {
    title: request.fileName.replace(/\.[^.]+$/, ""),
  },
  plainText: request.rawContent.trim(),
  sections: [] as IngestionSection[],
});

export const normalizeIngestionRequest = (request: IngestionRequest): NormalizedIngestionDocument => {
  const base = createEmptyIngestionDocument(request);
  const extracted = request.sourceFormat === "markdown"
    ? extractMarkdown(request)
    : request.sourceFormat === "html"
      ? extractHtml(request)
      : request.sourceFormat === "latex"
        ? extractLatex(request)
        : request.sourceFormat === "asciidoc"
          ? extractAsciidoc(request)
          : request.sourceFormat === "rst"
            ? extractRst(request)
        : extractFallback(request);

  return {
    ...base,
    chunks: buildChunks(extracted.plainText, extracted.sections),
    images: extractImages(request, extracted.sections),
    metadata: extracted.metadata,
    plainText: extracted.plainText,
    sections: extracted.sections,
  };
};
