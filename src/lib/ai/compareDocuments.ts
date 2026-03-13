import { buildDerivedDocumentIndex } from "@/lib/ast/documentIndex";
import { computePatchNodeHash, extractAstNodeText } from "@/lib/ast/applyDocumentPatch";
import type { NormalizedIngestionDocument } from "@/lib/ingestion/contracts";
import type {
  BlockNode,
  DocumentAst,
  HeadingNode,
  InlineNode,
  ParagraphNode,
} from "@/types/documentAst";
import type {
  DocumentPatch,
  DocumentPatchSet,
  PatchAuthor,
  PatchSourceAttribution,
} from "@/types/documentPatch";

export type ComparisonDeltaKind = "added" | "removed" | "changed" | "inconsistent";

export interface ComparisonSectionSnapshot {
  chunkIds: string[];
  ingestionId: string;
  level: number;
  path: string[];
  sectionId: string;
  text: string;
  title: string;
}

export interface DocumentComparisonDelta {
  deltaId: string;
  kind: ComparisonDeltaKind;
  similarityScore: number;
  source?: ComparisonSectionSnapshot;
  summary: string;
  target?: ComparisonSectionSnapshot;
}

export interface DocumentComparisonResult {
  counts: Record<ComparisonDeltaKind, number>;
  deltas: DocumentComparisonDelta[];
  sourceDocumentId: string;
  targetDocumentId: string;
}

export interface CompareDocumentsOptions {
  changedSimilarityThreshold?: number;
}

interface ComparableSection extends ComparisonSectionSnapshot {
  key: string;
  order: number;
}

interface AstSectionSnapshot {
  bodyBlocks: BlockNode[];
  heading: HeadingNode;
  key: string;
  lastNodeId: string;
  path: string[];
  title: string;
}

export interface ComparisonPatchBuildOptions {
  author?: PatchAuthor;
  createdAt?: number;
  documentId: string;
  patchSetId: string;
  title?: string;
}

export interface ComparisonPatchBuildResult {
  patchSet: DocumentPatchSet;
  unmappedDeltaIds: string[];
  warnings: string[];
}

const normalizeText = (value: unknown) =>
  (typeof value === "string" ? value : "")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const slugify = (value: string) => normalizeText(value).replace(/\s+/g, "-") || "section";

const tokenize = (value: string) => {
  const normalized = normalizeText(value);

  if (!normalized) {
    return [];
  }

  return normalized.split(" ").filter((term) => term.length >= 2);
};

const toKey = (path: string[], fallbackTitle: string) => {
  const normalizedPath = path.map((entry) => normalizeText(entry)).filter(Boolean);
  return normalizedPath.join(" > ") || normalizeText(fallbackTitle);
};

const jaccardSimilarity = (leftText: string, rightText: string) => {
  const leftTerms = new Set(tokenize(leftText));
  const rightTerms = new Set(tokenize(rightText));

  if (leftTerms.size === 0 && rightTerms.size === 0) {
    return 1;
  }

  const union = new Set([...leftTerms, ...rightTerms]);
  let intersectionSize = 0;

  for (const term of leftTerms) {
    if (rightTerms.has(term)) {
      intersectionSize += 1;
    }
  }

  return union.size === 0 ? 0 : intersectionSize / union.size;
};

const getComparableSections = (document: NormalizedIngestionDocument): ComparableSection[] => {
  const chunkIdsBySectionId = new Map<string, string[]>();

  for (const chunk of document.chunks) {
    if (!chunk.sectionId) {
      continue;
    }

    const chunkIds = chunkIdsBySectionId.get(chunk.sectionId) || [];
    chunkIds.push(chunk.chunkId);
    chunkIdsBySectionId.set(chunk.sectionId, chunkIds);
  }

  if (document.sections.length === 0) {
    const title = document.metadata.title || document.fileName.replace(/\.[^.]+$/, "");
    return [{
      chunkIds: document.chunks.map((chunk) => chunk.chunkId),
      ingestionId: document.ingestionId,
      key: toKey([title], title),
      level: 1,
      order: 0,
      path: [title],
      sectionId: `${document.ingestionId}-root`,
      text: document.plainText,
      title,
    }];
  }

  return document.sections.map((section, index) => ({
    chunkIds: chunkIdsBySectionId.get(section.sectionId) || [],
    ingestionId: document.ingestionId,
    key: toKey(section.path, section.title),
    level: section.level,
    order: index,
    path: section.path,
    sectionId: section.sectionId,
    text: section.text,
    title: section.title,
  }));
};

const buildDeltaSummary = (kind: ComparisonDeltaKind, title: string, similarityScore: number) => {
  switch (kind) {
    case "added":
      return `Section "${title}" exists only in the target document.`;
    case "removed":
      return `Section "${title}" exists only in the source document.`;
    case "changed":
      return `Section "${title}" changed with overlap score ${similarityScore.toFixed(2)}.`;
    case "inconsistent":
      return `Section "${title}" diverged materially across documents (score ${similarityScore.toFixed(2)}).`;
    default:
      return `Section "${title}" changed.`;
  }
};

const toSnapshot = (section: ComparableSection): ComparisonSectionSnapshot => ({
  chunkIds: section.chunkIds,
  ingestionId: section.ingestionId,
  level: section.level,
  path: section.path,
  sectionId: section.sectionId,
  text: section.text,
  title: section.title,
});

const countKinds = (deltas: DocumentComparisonDelta[]): Record<ComparisonDeltaKind, number> => ({
  added: deltas.filter((delta) => delta.kind === "added").length,
  changed: deltas.filter((delta) => delta.kind === "changed").length,
  inconsistent: deltas.filter((delta) => delta.kind === "inconsistent").length,
  removed: deltas.filter((delta) => delta.kind === "removed").length,
});

const createSectionLookup = (sections: ComparableSection[]) =>
  new Map(sections.map((section) => [section.key, section]));

const buildDeltaId = (index: number, section: ComparableSection) =>
  `cmp-${String(index + 1).padStart(3, "0")}-${slugify(section.title)}`;

export const compareDocuments = (
  sourceDocument: NormalizedIngestionDocument,
  targetDocument: NormalizedIngestionDocument,
  options: CompareDocumentsOptions = {},
): DocumentComparisonResult => {
  const changedSimilarityThreshold = options.changedSimilarityThreshold ?? 0.25;
  const sourceSections = getComparableSections(sourceDocument);
  const targetSections = getComparableSections(targetDocument);
  const sourceLookup = createSectionLookup(sourceSections);
  const targetLookup = createSectionLookup(targetSections);
  const orderedKeys = Array.from(new Set([
    ...sourceSections.map((section) => section.key),
    ...targetSections.map((section) => section.key),
  ]));
  const deltas: DocumentComparisonDelta[] = [];

  orderedKeys.forEach((key, index) => {
    const sourceSection = sourceLookup.get(key);
    const targetSection = targetLookup.get(key);

    if (!sourceSection && !targetSection) {
      return;
    }

    const referenceSection = targetSection || sourceSection;

    if (!referenceSection) {
      return;
    }

    if (!sourceSection) {
      deltas.push({
        deltaId: buildDeltaId(index, referenceSection),
        kind: "added",
        similarityScore: 0,
        summary: buildDeltaSummary("added", referenceSection.title, 0),
        target: toSnapshot(referenceSection),
      });
      return;
    }

    if (!targetSection) {
      deltas.push({
        deltaId: buildDeltaId(index, referenceSection),
        kind: "removed",
        similarityScore: 0,
        source: toSnapshot(referenceSection),
        summary: buildDeltaSummary("removed", referenceSection.title, 0),
      });
      return;
    }

    const normalizedSourceText = normalizeText(sourceSection.text);
    const normalizedTargetText = normalizeText(targetSection.text);

    if (normalizedSourceText === normalizedTargetText) {
      return;
    }

    const similarityScore = jaccardSimilarity(sourceSection.text, targetSection.text);
    const kind = similarityScore >= changedSimilarityThreshold ? "changed" : "inconsistent";
    deltas.push({
      deltaId: buildDeltaId(index, referenceSection),
      kind,
      similarityScore,
      source: toSnapshot(sourceSection),
      summary: buildDeltaSummary(kind, referenceSection.title, similarityScore),
      target: toSnapshot(targetSection),
    });
  });

  return {
    counts: countKinds(deltas),
    deltas,
    sourceDocumentId: sourceDocument.ingestionId,
    targetDocumentId: targetDocument.ingestionId,
  };
};

const collectInlineText = (children: InlineNode[]) =>
  children.map((child) => {
    switch (child.type) {
      case "text":
        return child.text;
      case "math_inline":
        return child.latex;
      case "cross_reference":
        return child.targetLabel;
      case "footnote_ref":
        return child.footnoteId;
      case "hard_break":
        return "\n";
      default:
        return "";
    }
  }).join("");

const buildAstSections = (document: DocumentAst): AstSectionSnapshot[] => {
  const sections: AstSectionSnapshot[] = [];
  const pathStack: string[] = [];
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
      pathStack.splice(block.level - 1);
      const title = collectInlineText(block.children).trim() || "Untitled";
      pathStack[block.level - 1] = title;
      currentSection = {
        bodyBlocks: [],
        heading: block,
        key: toKey(pathStack, title),
        lastNodeId: block.nodeId,
        path: [...pathStack],
        title,
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

const createTextChildren = (text: string, prefix: string): ParagraphNode["children"] => {
  const normalized = text.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
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
  text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph, index) => ({
      children: createTextChildren(paragraph, `${prefix}-paragraph-${index + 1}`),
      kind: "block",
      nodeId: `${prefix}-paragraph-${index + 1}`,
      type: "paragraph",
    }));

const createHeadingNode = (section: ComparisonSectionSnapshot, prefix: string, existingNodeId?: string): HeadingNode => ({
  children: [{ type: "text", text: section.title }],
  kind: "block",
  level: Math.min(Math.max(section.level, 1), 3) as HeadingNode["level"],
  nodeId: existingNodeId || `${prefix}-heading`,
  type: "heading",
});

const buildSourceAttributions = (delta: DocumentComparisonDelta): PatchSourceAttribution[] => {
  const attributions: PatchSourceAttribution[] = [];

  if (delta.source) {
    attributions.push(...delta.source.chunkIds.map((chunkId) => ({
      chunkId,
      sectionId: delta.source?.sectionId,
      sourceId: delta.source?.ingestionId || "",
    })));
  }

  if (delta.target) {
    attributions.push(...delta.target.chunkIds.map((chunkId) => ({
      chunkId,
      sectionId: delta.target?.sectionId,
      sourceId: delta.target?.ingestionId || "",
    })));
  }

  return attributions;
};

const createPatch = (
  patchId: string,
  title: string,
  patch: Omit<DocumentPatch, "author" | "patchId" | "status" | "title">,
  author: PatchAuthor,
): DocumentPatch => ({
  author,
  patchId,
  status: "pending",
  title,
  ...patch,
});

const createParagraphSummary = (text?: string) =>
  (text || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .slice(0, 240);

const resolveSectionAnchor = (
  targetSectionOrder: ComparableSection[],
  availableAnchors: Map<string, { headingNodeId: string; lastNodeId: string }>,
  delta: DocumentComparisonDelta,
) => {
  const targetSection = delta.target;

  if (!targetSection) {
    return null;
  }

  const targetIndex = targetSectionOrder.findIndex((section) => section.sectionId === targetSection.sectionId);

  for (let index = targetIndex - 1; index >= 0; index -= 1) {
    const candidate = targetSectionOrder[index];
    const anchor = availableAnchors.get(candidate.key);

    if (anchor) {
      return { operation: "insert_after" as const, targetNodeId: anchor.lastNodeId };
    }
  }

  for (let index = targetIndex + 1; index < targetSectionOrder.length; index += 1) {
    const candidate = targetSectionOrder[index];
    const anchor = availableAnchors.get(candidate.key);

    if (anchor) {
      return { operation: "insert_before" as const, targetNodeId: anchor.headingNodeId };
    }
  }

  return null;
};

export const buildComparisonPatchSet = (
  comparison: DocumentComparisonResult,
  sourceAst: DocumentAst,
  targetDocument: NormalizedIngestionDocument,
  options: ComparisonPatchBuildOptions,
): ComparisonPatchBuildResult => {
  const author = options.author ?? "system";
  const createdAt = options.createdAt ?? Date.now();
  const sourceSections = buildAstSections(sourceAst);
  const sourceSectionMap = new Map(sourceSections.map((section) => [section.key, section]));
  const derivedIndex = buildDerivedDocumentIndex(sourceAst);
  const targetSections = getComparableSections(targetDocument);
  const targetSectionMap = createSectionLookup(targetSections);
  const availableAnchors = new Map(
    sourceSections.map((section) => [section.key, { headingNodeId: section.heading.nodeId, lastNodeId: section.lastNodeId }]),
  );
  const patches: DocumentPatch[] = [];
  const unmappedDeltaIds: string[] = [];
  const warnings: string[] = [];
  let patchSequence = 1;

  const nextPatchId = () => `${options.patchSetId}-patch-${String(patchSequence++).padStart(3, "0")}`;

  for (const delta of comparison.deltas) {
    if (delta.kind === "added") {
      const targetSection = delta.target ? targetSectionMap.get(toKey(delta.target.path, delta.target.title)) : null;
      const anchor = resolveSectionAnchor(targetSections, availableAnchors, delta);

      if (!targetSection || !anchor) {
        unmappedDeltaIds.push(delta.deltaId);
        warnings.push(`No stable insertion anchor found for delta "${delta.deltaId}".`);
        continue;
      }

      const insertedNodes: BlockNode[] = [
        createHeadingNode(targetSection, delta.deltaId),
        ...createParagraphNodes(targetSection.text, delta.deltaId),
      ];

      patches.push(createPatch(nextPatchId(), `Add section: ${targetSection.title}`, {
        confidence: 0.75,
        metadata: {
          comparisonDeltaId: delta.deltaId,
          comparisonKind: delta.kind,
        },
        operation: anchor.operation,
        payload: {
          kind: "insert_nodes",
          nodes: insertedNodes,
        },
        reason: delta.summary,
        sources: buildSourceAttributions(delta),
        suggestedText: createParagraphSummary(targetSection.text),
        summary: "Insert section derived from comparison target.",
        target: {
          nodeId: anchor.targetNodeId,
          targetType: "node",
        },
      }, author));

      availableAnchors.set(targetSection.key, {
        headingNodeId: insertedNodes[0].nodeId,
        lastNodeId: insertedNodes.at(-1)?.nodeId || insertedNodes[0].nodeId,
      });
      continue;
    }

    const sourceSection = delta.source ? sourceSectionMap.get(toKey(delta.source.path, delta.source.title)) : null;

    if (!sourceSection) {
      unmappedDeltaIds.push(delta.deltaId);
      warnings.push(`No source AST section matches delta "${delta.deltaId}".`);
      continue;
    }

    if (delta.kind === "removed") {
      for (const node of [...sourceSection.bodyBlocks, sourceSection.heading].reverse()) {
        patches.push(createPatch(nextPatchId(), `Remove section: ${sourceSection.title}`, {
          confidence: 0.8,
          metadata: {
            comparisonDeltaId: delta.deltaId,
            comparisonKind: delta.kind,
          },
          operation: "delete_node",
          originalText: extractAstNodeText(node),
          precondition: {
            expectedNodeHash: computePatchNodeHash(node),
            expectedText: extractAstNodeText(node),
          },
          reason: delta.summary,
          sources: buildSourceAttributions(delta),
          summary: "Delete source section blocks that no longer exist in the target document.",
          target: {
            nodeId: node.nodeId,
            targetType: "node",
          },
        }, author));
      }
      continue;
    }

    const targetSection = delta.target ? targetSectionMap.get(toKey(delta.target.path, delta.target.title)) : null;

    if (!targetSection) {
      unmappedDeltaIds.push(delta.deltaId);
      warnings.push(`Comparison delta "${delta.deltaId}" has no target section snapshot.`);
      continue;
    }

    if (sourceSection.title !== targetSection.title || sourceSection.heading.level !== targetSection.level) {
      const replacementHeading = createHeadingNode(targetSection, delta.deltaId, sourceSection.heading.nodeId);
      patches.push(createPatch(nextPatchId(), `${delta.kind === "changed" ? "Update" : "Resolve"} heading: ${sourceSection.title}`, {
        confidence: delta.kind === "changed" ? 0.72 : 0.55,
        metadata: {
          comparisonDeltaId: delta.deltaId,
          comparisonKind: delta.kind,
        },
        operation: "replace_node",
        originalText: collectInlineText(sourceSection.heading.children),
        payload: {
          kind: "replace_node",
          node: replacementHeading,
        },
        precondition: {
          expectedNodeHash: computePatchNodeHash(sourceSection.heading),
          expectedText: collectInlineText(sourceSection.heading.children),
        },
        reason: delta.summary,
        sources: buildSourceAttributions(delta),
        suggestedText: targetSection.title,
        summary: "Replace source heading with target heading content.",
        target: {
          nodeId: sourceSection.heading.nodeId,
          targetType: "node",
        },
      }, author));
    }

    for (const node of [...sourceSection.bodyBlocks].reverse()) {
      patches.push(createPatch(nextPatchId(), `${delta.kind === "changed" ? "Replace" : "Resolve"} body: ${sourceSection.title}`, {
        confidence: delta.kind === "changed" ? 0.72 : 0.55,
        metadata: {
          comparisonDeltaId: delta.deltaId,
          comparisonKind: delta.kind,
        },
        operation: "delete_node",
        originalText: extractAstNodeText(node),
        precondition: {
          expectedNodeHash: computePatchNodeHash(node),
          expectedText: extractAstNodeText(node),
        },
        reason: delta.summary,
        sources: buildSourceAttributions(delta),
        summary: "Delete outdated section body block before inserting normalized replacement text.",
        target: {
          nodeId: node.nodeId,
          targetType: "node",
        },
      }, author));
    }

    const replacementParagraphs = createParagraphNodes(targetSection.text, delta.deltaId);

    if (replacementParagraphs.length > 0) {
      patches.push(createPatch(nextPatchId(), `${delta.kind === "changed" ? "Insert" : "Resolve"} body: ${targetSection.title}`, {
        confidence: delta.kind === "changed" ? 0.72 : 0.55,
        metadata: {
          comparisonDeltaId: delta.deltaId,
          comparisonKind: delta.kind,
        },
        operation: "insert_after",
        payload: {
          kind: "insert_nodes",
          nodes: replacementParagraphs,
        },
        precondition: {
          expectedNodeHash: computePatchNodeHash(sourceSection.heading),
          expectedText: collectInlineText(sourceSection.heading.children),
        },
        reason: delta.summary,
        sources: buildSourceAttributions(delta),
        suggestedText: createParagraphSummary(targetSection.text),
        summary: delta.kind === "changed"
          ? "Insert normalized target section body after removing the old body."
          : "Insert normalized target section body to resolve divergent source content.",
        target: {
          nodeId: sourceSection.heading.nodeId,
          targetType: "node",
        },
      }, author));
    }

    availableAnchors.set(sourceSection.key, {
      headingNodeId: sourceSection.heading.nodeId,
      lastNodeId: replacementParagraphs.at(-1)?.nodeId || sourceSection.heading.nodeId,
    });
  }

  if (derivedIndex.headings.length === 0) {
    warnings.push("Source AST has no headings; section-based comparison mapping is limited.");
  }

  return {
    patchSet: {
      author,
      createdAt,
      description: `Generated from comparison ${comparison.sourceDocumentId} -> ${comparison.targetDocumentId}.`,
      documentId: options.documentId,
      patchSetId: options.patchSetId,
      patches,
      status: "draft",
      title: options.title || `Comparison patches (${comparison.sourceDocumentId} -> ${comparison.targetDocumentId})`,
    },
    unmappedDeltaIds,
    warnings,
  };
};
