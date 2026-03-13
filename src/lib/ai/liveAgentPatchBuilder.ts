import { validateDocumentAst } from "@/lib/ast/validateDocumentAst";
import type { DocumentAst, HeadingNode, ParagraphNode } from "@/types/documentAst";
import type { AgentCurrentDocumentDraft, AgentSectionEdit } from "@/types/liveAgent";
import type { DocumentPatch, DocumentPatchSet, PatchSourceAttribution } from "@/types/documentPatch";

interface AstSectionSnapshot {
  bodyBlocks: DocumentAst["blocks"];
  heading: HeadingNode;
  lastNodeId: string;
}

interface BuildLiveAgentPatchSetOptions {
  documentAst: DocumentAst;
  documentId: string;
  draft: AgentCurrentDocumentDraft;
  patchSetId: string;
  title: string;
}

const normalizeParagraphText = (value: string) =>
  value
    .replace(/\r\n/g, "\n")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const createTextChildren = (text: string, prefix: string): ParagraphNode["children"] => {
  const lines = normalizeParagraphText(text).split("\n");
  const children: ParagraphNode["children"] = [];

  lines.forEach((line, index) => {
    if (line.length > 0) {
      children.push({ type: "text", text: line });
    }

    if (index < lines.length - 1) {
      children.push({ kind: "inline", nodeId: `${prefix}-br-${index + 1}`, type: "hard_break" });
    }
  });

  return children.length > 0 ? children : [{ type: "text", text: "" }];
};

const createParagraphNodes = (text: string, prefix: string): ParagraphNode[] =>
  normalizeParagraphText(text)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph, index) => ({
      children: createTextChildren(paragraph, `${prefix}-paragraph-${index + 1}`),
      kind: "block" as const,
      nodeId: `${prefix}-paragraph-${index + 1}`,
      type: "paragraph" as const,
    }));

const buildAstSections = (document: DocumentAst): AstSectionSnapshot[] => {
  const sections: AstSectionSnapshot[] = [];
  let currentSection: AstSectionSnapshot | null = null;

  const finalizeCurrentSection = () => {
    if (!currentSection) {
      return;
    }

    currentSection.lastNodeId = currentSection.bodyBlocks.at(-1)?.nodeId || currentSection.heading.nodeId;
    sections.push(currentSection);
  };

  for (const block of document.blocks) {
    if (block.type === "heading") {
      finalizeCurrentSection();
      currentSection = {
        bodyBlocks: [],
        heading: block,
        lastNodeId: block.nodeId,
      };
      continue;
    }

    if (currentSection) {
      currentSection.bodyBlocks.push(block);
    }
  }

  finalizeCurrentSection();
  return sections;
};

const toPatchSources = (sources?: AgentSectionEdit["sources"]): PatchSourceAttribution[] | undefined => {
  if (!sources?.length) {
    return undefined;
  }

  return sources.map((source) => ({
    chunkId: source.chunkId,
    excerpt: source.excerpt,
    sectionId: source.sectionId,
    sourceId: source.sourceId,
  }));
};

const createHeadingNode = (
  level: 1 | 2 | 3,
  title: string,
  nodeId: string,
): HeadingNode => ({
  children: [{ type: "text", text: title }],
  kind: "block",
  level,
  nodeId,
  type: "heading",
});

const ensureDraftHasContent = (draft: AgentCurrentDocumentDraft) => {
  if (draft.edits.length === 0) {
    throw new Error("Live agent draft has no edits to review.");
  }

  const hasAnyParagraphText = draft.edits.some((edit) => normalizeParagraphText(edit.markdownBody).length > 0);

  if (!hasAnyParagraphText) {
    throw new Error("Live agent draft does not contain any reviewable body text.");
  }
};

export const buildLiveAgentPatchSet = ({
  documentAst,
  documentId,
  draft,
  patchSetId,
  title,
}: BuildLiveAgentPatchSetOptions): DocumentPatchSet => {
  ensureDraftHasContent(draft);

  const validation = validateDocumentAst(documentAst);

  if (validation.errors.length > 0) {
    throw new Error(`Current document AST is invalid: ${validation.errors[0]?.message || "unknown error"}`);
  }

  const sections = buildAstSections(documentAst);
  const sectionsByHeadingNodeId = new Map(sections.map((section) => [section.heading.nodeId, section]));
  const patches: DocumentPatch[] = [];
  let sequence = 1;

  const nextPatchId = () => `${patchSetId}-patch-${String(sequence++).padStart(3, "0")}`;

  draft.edits.forEach((edit, index) => {
    const prefix = `${patchSetId}-edit-${String(index + 1).padStart(2, "0")}`;
    const sources = toPatchSources(edit.sources);
    const replacementParagraphs = createParagraphNodes(edit.markdownBody, prefix);

    if (edit.kind === "append_section") {
      if (replacementParagraphs.length === 0) {
        return;
      }

      const anchorNodeId = documentAst.blocks.at(-1)?.nodeId;

      if (!anchorNodeId) {
        throw new Error("Cannot append a section into an empty document.");
      }

      patches.push({
        author: "ai",
        confidence: 0.74,
        operation: "insert_after",
        patchId: nextPatchId(),
        payload: {
          kind: "insert_nodes",
          nodes: [
            createHeadingNode(edit.newHeading.level, edit.newHeading.title, `${prefix}-heading`),
            ...replacementParagraphs,
          ],
        },
        reason: edit.rationale,
        sources,
        status: "pending",
        suggestedText: edit.markdownBody,
        summary: `Append section "${edit.newHeading.title}".`,
        target: {
          nodeId: anchorNodeId,
          targetType: "node",
        },
        title: `Append section: ${edit.newHeading.title}`,
      });
      return;
    }

    const sourceSection = sectionsByHeadingNodeId.get(edit.targetHeadingNodeId);

    if (!sourceSection) {
      throw new Error(`Live agent target heading "${edit.targetHeadingNodeId}" no longer exists.`);
    }

    if (edit.kind === "insert_after_section") {
      patches.push({
        author: "ai",
        confidence: 0.72,
        operation: "insert_after",
        patchId: nextPatchId(),
        payload: {
          kind: "insert_nodes",
          nodes: [
            createHeadingNode(edit.newHeading.level, edit.newHeading.title, `${prefix}-heading`),
            ...replacementParagraphs,
          ],
        },
        reason: edit.rationale,
        sources,
        status: "pending",
        suggestedText: edit.markdownBody,
        summary: `Insert section "${edit.newHeading.title}" after "${edit.targetHeadingTitle || edit.targetHeadingNodeId}".`,
        target: {
          nodeId: sourceSection.lastNodeId,
          targetType: "node",
        },
        title: `Insert section: ${edit.newHeading.title}`,
      });
      return;
    }

    if (edit.newHeading && (
      edit.newHeading.title !== sourceSection.heading.children.map((child) => child.type === "text" ? child.text : "").join("")
      || edit.newHeading.level !== sourceSection.heading.level
    )) {
      patches.push({
        author: "ai",
        confidence: 0.7,
        operation: "replace_node",
        patchId: nextPatchId(),
        payload: {
          kind: "replace_node",
          node: createHeadingNode(edit.newHeading.level, edit.newHeading.title, sourceSection.heading.nodeId),
        },
        reason: edit.rationale,
        sources,
        status: "pending",
        suggestedText: edit.newHeading.title,
        summary: `Update section heading to "${edit.newHeading.title}".`,
        target: {
          nodeId: sourceSection.heading.nodeId,
          targetType: "node",
        },
        title: `Update heading: ${edit.targetHeadingTitle || edit.targetHeadingNodeId}`,
      });
    }

    for (const block of [...sourceSection.bodyBlocks].reverse()) {
      patches.push({
        author: "ai",
        confidence: 0.68,
        operation: "delete_node",
        patchId: nextPatchId(),
        reason: edit.rationale,
        sources,
        status: "pending",
        summary: `Remove outdated body block from "${edit.targetHeadingTitle || edit.targetHeadingNodeId}".`,
        target: {
          nodeId: block.nodeId,
          targetType: "node",
        },
        title: `Remove body block: ${edit.targetHeadingTitle || edit.targetHeadingNodeId}`,
      });
    }

    if (replacementParagraphs.length > 0) {
      patches.push({
        author: "ai",
        confidence: 0.73,
        operation: "insert_after",
        patchId: nextPatchId(),
        payload: {
          kind: "insert_nodes",
          nodes: replacementParagraphs,
        },
        reason: edit.rationale,
        sources,
        status: "pending",
        suggestedText: edit.markdownBody,
        summary: `Replace body of "${edit.targetHeadingTitle || edit.targetHeadingNodeId}".`,
        target: {
          nodeId: sourceSection.heading.nodeId,
          targetType: "node",
        },
        title: `Replace section body: ${edit.targetHeadingTitle || edit.targetHeadingNodeId}`,
      });
    }
  });

  if (patches.length === 0) {
    throw new Error("Live agent draft did not produce any reviewable patches.");
  }

  return {
    author: "ai",
    createdAt: Date.now(),
    description: "Generated from the live agent chat flow.",
    documentId,
    patchSetId,
    patches,
    status: "draft",
    title,
  };
};
