import { htmlToLatex } from "@/components/editor/utils/htmlToLatex";
import { ensureResumePreambleSupport, hasResumeLatexCommands } from "./resumeSupport";
import { splitLatexDocument } from "./scanner";

interface ExportDocsyToLatexOptions {
  currentLatexSource?: string;
  html: string;
  title?: string;
}

export const exportDocsyToLatex = ({
  currentLatexSource,
  html,
  title,
}: ExportDocsyToLatexOptions) => {
  const extractTitleBlock = () => {
    if (typeof DOMParser === "undefined") {
      return null;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
    const node = doc.querySelector('div[data-type="latex-title-block"]');

    if (!node) {
      return null;
    }

    const decode = (value: string | undefined) =>
      value || "";

    return {
      author: decode(node.getAttribute("data-author") || undefined),
      date: decode(node.getAttribute("data-date") || undefined),
      title: decode(node.getAttribute("data-title") || undefined),
    };
  };

  const replacePreambleCommand = (preamble: string, commandName: "author" | "date" | "title", value: string) => {
    const nextCommand = `\\${commandName}{${value}}`;
    const pattern = new RegExp(`\\\\${commandName}\\{[^}]*\\}`);

    if (pattern.test(preamble)) {
      return preamble.replace(pattern, nextCommand);
    }

    const documentClassMatch = preamble.match(/\\documentclass(?:\[[^\]]*\])?\{[^}]*\}/);
    if (!documentClassMatch) {
      return `${nextCommand}\n${preamble}`;
    }

    const insertIndex = documentClassMatch.index! + documentClassMatch[0].length;
    return `${preamble.slice(0, insertIndex)}\n${nextCommand}${preamble.slice(insertIndex)}`;
  };

  const hasOriginalWrapper = Boolean(currentLatexSource?.includes("\\begin{document}"));
  const bodyLatex = htmlToLatex(html, false, {
    includeMetadata: false,
    includeWrapper: false,
    title,
  }).trim();

  if (!currentLatexSource || !hasOriginalWrapper) {
    return htmlToLatex(html, true, {
      includeMetadata: false,
      title,
    });
  }

  const parts = splitLatexDocument(currentLatexSource);
  const titleBlock = extractTitleBlock();
  let nextPreamble = parts.preamble;

  if (titleBlock) {
    nextPreamble = replacePreambleCommand(nextPreamble, "title", titleBlock.title || (title || "Untitled"));

    if (titleBlock.author) {
      nextPreamble = replacePreambleCommand(nextPreamble, "author", titleBlock.author);
    }

    if (titleBlock.date) {
      nextPreamble = replacePreambleCommand(nextPreamble, "date", titleBlock.date);
    }
  }

  if (hasResumeLatexCommands(bodyLatex) || hasResumeLatexCommands(currentLatexSource)) {
    nextPreamble = ensureResumePreambleSupport(nextPreamble);
  }

  return `${nextPreamble}\n\n${bodyLatex}\n\n${parts.postamble}`.trim();
};
