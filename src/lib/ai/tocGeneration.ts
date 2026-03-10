import { buildDerivedDocumentIndex } from "@/lib/ast/documentIndex";
import type {
  DocumentAst,
  HeadingLevel,
  TableOfContentsNode,
} from "@/types/documentAst";
import type {
  DocumentPatchSet,
  PatchAuthor,
  PatchSourceAttribution,
} from "@/types/documentPatch";
import type { GenerateTocEntry } from "@/types/aiAssistant";

export type TocSuggestionConflictCode =
  | "duplicate_headings"
  | "existing_toc"
  | "no_headings"
  | "non_matching_titles"
  | "unchanged_toc";

export interface TocSuggestionAnalysis {
  conflicts: TocSuggestionConflictCode[];
  existingTocNode: TableOfContentsNode | null;
}

export interface TocPatchSetRequest {
  analysis: TocSuggestionAnalysis;
  author?: PatchAuthor;
  createdAt?: number;
  documentId: string;
  maxDepth: HeadingLevel;
  patchSetId: string;
  rationale: string;
  sources?: PatchSourceAttribution[];
}

const normalizeTitle = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, " ")
    .trim();

const createTocNode = (nodeId: string, maxDepth: HeadingLevel): TableOfContentsNode => ({
  kind: "block",
  maxDepth,
  nodeId,
  type: "table_of_contents",
});

export const analyzeTocSuggestion = (
  sourceAst: DocumentAst,
  entries: GenerateTocEntry[],
  maxDepth: HeadingLevel,
): TocSuggestionAnalysis => {
  const conflicts = new Set<TocSuggestionConflictCode>();
  const headingIndex = buildDerivedDocumentIndex(sourceAst).headings;
  const normalizedHeadingTitles = headingIndex.map((heading) => normalizeTitle(heading.text));
  const headingTitleSet = new Set(normalizedHeadingTitles.filter(Boolean));
  const duplicateHeadingTitleSet = new Set<string>();
  const seenHeadingTitles = new Set<string>();

  for (const headingTitle of normalizedHeadingTitles) {
    if (!headingTitle) {
      continue;
    }

    if (seenHeadingTitles.has(headingTitle)) {
      duplicateHeadingTitleSet.add(headingTitle);
      continue;
    }

    seenHeadingTitles.add(headingTitle);
  }

  if (headingIndex.length === 0) {
    conflicts.add("no_headings");
  }

  if (duplicateHeadingTitleSet.size > 0) {
    conflicts.add("duplicate_headings");
  }

  if (entries.some((entry) => !headingTitleSet.has(normalizeTitle(entry.title)))) {
    conflicts.add("non_matching_titles");
  }

  const existingTocNode = sourceAst.blocks.find((block) => block.type === "table_of_contents") as TableOfContentsNode | undefined;

  if (existingTocNode) {
    conflicts.add("existing_toc");

    if ((existingTocNode.maxDepth ?? 3) === maxDepth) {
      conflicts.add("unchanged_toc");
    }
  }

  return {
    conflicts: Array.from(conflicts),
    existingTocNode: existingTocNode || null,
  };
};

export const buildTocPatchSetWithAst = (
  sourceAst: DocumentAst,
  request: TocPatchSetRequest,
): DocumentPatchSet => {
  const author = request.author ?? "ai";
  const createdAt = request.createdAt ?? Date.now();
  const tocNodeId = `${request.patchSetId}-toc-node`;
  const tocNode = createTocNode(
    request.analysis.existingTocNode?.nodeId || tocNodeId,
    request.maxDepth,
  );

  if (request.analysis.existingTocNode) {
    if ((request.analysis.existingTocNode.maxDepth ?? 3) === request.maxDepth) {
      return {
        author,
        createdAt,
        description: "Suggested TOC already matches the current placeholder depth.",
        documentId: request.documentId,
        patchSetId: request.patchSetId,
        patches: [],
        status: "draft",
        title: "AI TOC suggestion",
      };
    }

    return {
      author,
      createdAt,
      description: `Update the existing table of contents placeholder to depth ${request.maxDepth}.`,
      documentId: request.documentId,
      patchSetId: request.patchSetId,
      patches: [{
        author,
        confidence: 0.72,
        operation: "replace_node",
        originalText: `TOC depth ${request.analysis.existingTocNode.maxDepth ?? 3}`,
        patchId: `${request.patchSetId}-patch-001`,
        payload: {
          kind: "replace_node",
          node: tocNode,
        },
        reason: request.rationale,
        sources: request.sources,
        status: "pending",
        suggestedText: `TOC depth ${request.maxDepth}`,
        summary: "Refresh the existing table of contents placeholder with the suggested depth.",
        target: {
          nodeId: request.analysis.existingTocNode.nodeId,
          targetType: "node",
        },
        title: `Update table of contents depth to ${request.maxDepth}`,
      }],
      status: "draft",
      title: "AI TOC suggestion",
    };
  }

  const firstBlock = sourceAst.blocks[0];

  if (!firstBlock) {
    return {
      author,
      createdAt,
      description: "The document is empty, so there is no safe anchor for a TOC placeholder.",
      documentId: request.documentId,
      patchSetId: request.patchSetId,
      patches: [],
      status: "draft",
      title: "AI TOC suggestion",
    };
  }

  return {
    author,
    createdAt,
    description: `Insert a table of contents placeholder with depth ${request.maxDepth}.`,
    documentId: request.documentId,
    patchSetId: request.patchSetId,
    patches: [{
      author,
      confidence: 0.72,
      operation: "insert_before",
      patchId: `${request.patchSetId}-patch-001`,
      payload: {
        kind: "insert_nodes",
        nodes: [tocNode],
      },
      reason: request.rationale,
      sources: request.sources,
      status: "pending",
      suggestedText: `TOC depth ${request.maxDepth}`,
      summary: "Insert a table of contents placeholder before the document content.",
      target: {
        nodeId: firstBlock.nodeId,
        targetType: "node",
      },
      title: `Insert table of contents (depth ${request.maxDepth})`,
    }],
    status: "draft",
    title: "AI TOC suggestion",
  };
};
