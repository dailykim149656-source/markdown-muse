import yaml from "js-yaml";
import {
  createEmptyIngestionDocument,
  type IngestionChunk,
  type IngestionMetadata,
  type IngestionRequest,
  type IngestionSection,
  type NormalizedIngestionDocument,
} from "@/lib/ingestion/contracts";

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const MARKDOWN_HEADING_PATTERN = /^(#{1,3})\s+(.+?)\s*$/;
const LATEX_SECTION_PATTERN = /\\(section|subsection|subsubsection)\{([^}]*)\}/g;
const MAX_CHUNK_LENGTH = 1200;

interface SectionDraft {
  level: number;
  path: string[];
  text: string;
  title: string;
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "section";

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

const createSectionId = (draft: SectionDraft, index: number) =>
  `sec-${String(index + 1).padStart(3, "0")}-${slugify(draft.title)}`;

const toSection = (draft: SectionDraft, index: number): IngestionSection => ({
  level: draft.level,
  path: draft.path,
  sectionId: createSectionId(draft, index),
  text: draft.text.trim(),
  title: draft.title,
});

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
        : extractFallback(request);

  return {
    ...base,
    chunks: buildChunks(extracted.plainText, extracted.sections),
    metadata: extracted.metadata,
    plainText: extracted.plainText,
    sections: extracted.sections,
  };
};
