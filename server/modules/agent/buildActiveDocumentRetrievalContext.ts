import { normalizeIngestionRequest } from "../../../src/lib/ingestion/normalizeIngestionRequest";
import { keywordRetrieve } from "../../../src/lib/retrieval/keywordRetrieval";
import type { AgentTurnRequest, AgentWorkspaceGraphHints } from "../../../src/types/liveAgent";
import { extractFieldCandidates, scoreFieldCandidates, type DocumentFieldLineContext } from "./extractFieldCandidates";

const MARKDOWN_HEADING_PATTERN = /^(#{1,3})\s+(.+?)\s*$/;
const KOREAN_TRAILING_PARTICLE_PATTERN = /(은|는|이|가|을|를|와|과|로|으로)$/u;

const trimText = (value: string, maxLength = 420) => {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3)}...`;
};

export interface RetrievalHeadingLookupEntry {
  headingNodeId: string;
  headingTitle: string;
  level: number;
  sectionId?: string;
}

export interface RetrievalSectionRange {
  bodyEndLineIndex: number;
  bodyMarkdown: string;
  bodyStartLineIndex: number;
  endLineIndex: number;
  headingLineIndex: number;
  headingNodeId: string;
  headingTitle: string;
  level: number;
  sectionId?: string;
  startLineIndex: number;
}

export interface RetrievalSectionMatch {
  chunkId: string;
  excerpt: string;
  headingNodeId?: string;
  headingTitle?: string;
  matchedTerms: string[];
  score: number;
  sectionId?: string;
}

export interface RetrievalFieldCandidate {
  fieldKey: string;
  fieldLabel: string;
  headingNodeId?: string;
  headingTitle?: string;
  kind: "key_value_line" | "checklist_line" | "table_cell";
  lineIndex: number;
  lineText: string;
  matchedTerms: string[];
  score: number;
  sectionId?: string;
  tableColumnIndex?: number;
  tableHeaders?: string[];
}

export interface ActiveDocumentGraphNode {
  id: string;
  kind: "field" | "heading" | "section" | "table_cell";
  label: string;
  lineIndex?: number;
  sectionId?: string;
}

export interface ActiveDocumentGraphEdge {
  id: string;
  kind: "adjacent_section" | "contains_field" | "contains_section" | "contains_table_cell" | "field_in_section";
  sourceId: string;
  targetId: string;
}

export interface RetrievalSectionTarget {
  graphNodeId: string;
  graphScore: number;
  headingNodeId: string;
  headingTitle: string;
  level: number;
  matchedTerms: string[];
  retrievalScore: number;
  score: number;
  sectionId?: string;
}

export interface RetrievalFieldTarget extends RetrievalFieldCandidate {
  graphNodeId: string;
  graphScore: number;
  retrievalScore: number;
}

export interface ActiveDocumentRetrievalContext {
  activeDocumentGraph: {
    edges: ActiveDocumentGraphEdge[];
    nodes: ActiveDocumentGraphNode[];
  };
  documentSummary: {
    chunkCount: number;
    fileName: string;
    graphEdgeCount: number;
    graphNodeCount: number;
    headingCount: number;
    markdownLength: number;
    mode: NonNullable<AgentTurnRequest["activeDocument"]>["mode"];
    preview: string;
    sectionCount: number;
  };
  fieldCandidates: ReturnType<typeof extractFieldCandidates>;
  headingLookup: RetrievalHeadingLookupEntry[];
  lineContexts: DocumentFieldLineContext[];
  normalizedDocument: ReturnType<typeof normalizeIngestionRequest>;
  sectionRanges: RetrievalSectionRange[];
  topFieldCandidates: RetrievalFieldCandidate[];
  topFieldTargets: RetrievalFieldTarget[];
  topSectionMatches: RetrievalSectionMatch[];
  topSectionTargets: RetrievalSectionTarget[];
  workspaceGraphHints: AgentWorkspaceGraphHints | null;
}

const tokenizeQuery = (value: string) =>
  Array.from(new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9\uAC00-\uD7A3]+/i)
      .map((term) => term.trim())
      .flatMap((term) => {
        const trimmedParticle = term.replace(KOREAN_TRAILING_PARTICLE_PATTERN, "");
        return trimmedParticle && trimmedParticle !== term ? [term, trimmedParticle] : [term];
      })
      .filter((term) => term.length >= 2),
  ));

const scoreOverlap = (terms: string[], value: string) =>
  terms.filter((term) => value.toLowerCase().includes(term)).length;

const buildHeadingLookup = (request: AgentTurnRequest, normalizedDocument: ReturnType<typeof normalizeIngestionRequest>) =>
  (request.activeDocument?.existingHeadings || []).map((heading, index) => ({
    headingNodeId: heading.nodeId,
    headingTitle: heading.text,
    level: heading.level,
    sectionId: normalizedDocument.sections[index]?.sectionId,
  }));

const buildSectionRanges = ({
  headingLookup,
  markdown,
}: {
  headingLookup: RetrievalHeadingLookupEntry[];
  markdown: string;
}) => {
  const lines = markdown.split(/\r?\n/);
  const ranges: RetrievalSectionRange[] = [];
  let currentRange: RetrievalSectionRange | null = null;
  let headingLookupIndex = 0;

  lines.forEach((line, lineIndex) => {
    const headingMatch = line.match(MARKDOWN_HEADING_PATTERN);

    if (!headingMatch || headingLookupIndex >= headingLookup.length) {
      return;
    }

    if (currentRange) {
      currentRange.endLineIndex = lineIndex - 1;
      currentRange.bodyEndLineIndex = Math.max(currentRange.bodyStartLineIndex, lineIndex - 1);
      currentRange.bodyMarkdown = lines
        .slice(currentRange.bodyStartLineIndex, lineIndex)
        .join("\n")
        .trim();
      ranges.push(currentRange);
    }

    const lookup = headingLookup[headingLookupIndex];
    headingLookupIndex += 1;
    currentRange = {
      bodyEndLineIndex: lines.length - 1,
      bodyMarkdown: "",
      bodyStartLineIndex: lineIndex + 1,
      endLineIndex: lines.length - 1,
      headingLineIndex: lineIndex,
      headingNodeId: lookup.headingNodeId,
      headingTitle: lookup.headingTitle,
      level: lookup.level,
      sectionId: lookup.sectionId,
      startLineIndex: lineIndex,
    };
  });

  if (currentRange) {
    currentRange.endLineIndex = lines.length - 1;
    currentRange.bodyEndLineIndex = lines.length - 1;
    currentRange.bodyMarkdown = lines
      .slice(currentRange.bodyStartLineIndex)
      .join("\n")
      .trim();
    ranges.push(currentRange);
  }

  return ranges;
};

const buildLineContexts = ({
  lineCount,
  sectionRanges,
}: {
  lineCount: number;
  sectionRanges: RetrievalSectionRange[];
}) => {
  const contexts: DocumentFieldLineContext[] = Array.from({ length: lineCount }, () => ({}));

  sectionRanges.forEach((range) => {
    for (let lineIndex = range.headingLineIndex; lineIndex <= range.endLineIndex; lineIndex += 1) {
      contexts[lineIndex] = {
        headingNodeId: range.headingNodeId,
        headingTitle: range.headingTitle,
        sectionId: range.sectionId,
      };
    }
  });

  return contexts;
};

const buildActiveDocumentGraph = ({
  fieldCandidates,
  headingLookup,
  sectionRanges,
}: {
  fieldCandidates: ReturnType<typeof extractFieldCandidates>;
  headingLookup: RetrievalHeadingLookupEntry[];
  sectionRanges: RetrievalSectionRange[];
}) => {
  const nodes: ActiveDocumentGraphNode[] = [];
  const edges: ActiveDocumentGraphEdge[] = [];

  headingLookup.forEach((heading) => {
    nodes.push({
      id: `heading:${heading.headingNodeId}`,
      kind: "heading",
      label: heading.headingTitle,
      sectionId: heading.sectionId,
    });
  });

  sectionRanges.forEach((range, index) => {
    const sectionNodeId = `section:${range.sectionId || range.headingNodeId}`;
    nodes.push({
      id: sectionNodeId,
      kind: "section",
      label: range.headingTitle,
      lineIndex: range.headingLineIndex,
      sectionId: range.sectionId,
    });
    edges.push({
      id: `edge:contains_section:${range.headingNodeId}`,
      kind: "contains_section",
      sourceId: `heading:${range.headingNodeId}`,
      targetId: sectionNodeId,
    });

    if (index < sectionRanges.length - 1) {
      const nextRange = sectionRanges[index + 1];
      edges.push({
        id: `edge:adjacent_section:${range.headingNodeId}:${nextRange.headingNodeId}`,
        kind: "adjacent_section",
        sourceId: sectionNodeId,
        targetId: `section:${nextRange.sectionId || nextRange.headingNodeId}`,
      });
    }
  });

  fieldCandidates.forEach((candidate) => {
    const fieldNodeId = `field:${candidate.sectionId || "root"}:${candidate.lineIndex}:${candidate.fieldKey}`;
    nodes.push({
      id: fieldNodeId,
      kind: candidate.kind === "table_cell" ? "table_cell" : "field",
      label: candidate.fieldLabel,
      lineIndex: candidate.lineIndex,
      sectionId: candidate.sectionId,
    });

    if (candidate.headingNodeId) {
      edges.push({
        id: `edge:contains_field:${candidate.headingNodeId}:${candidate.lineIndex}:${candidate.fieldKey}`,
        kind: candidate.kind === "table_cell" ? "contains_table_cell" : "contains_field",
        sourceId: `heading:${candidate.headingNodeId}`,
        targetId: fieldNodeId,
      });
    }

    if (candidate.sectionId) {
      edges.push({
        id: `edge:field_in_section:${candidate.sectionId}:${candidate.lineIndex}:${candidate.fieldKey}`,
        kind: "field_in_section",
        sourceId: fieldNodeId,
        targetId: `section:${candidate.sectionId}`,
      });
    }
  });

  return { edges, nodes };
};

const buildTopSectionTargets = ({
  latestUserMessage,
  retrievalContext,
  workspaceGraphHints,
}: {
  latestUserMessage: string;
  retrievalContext: Pick<ActiveDocumentRetrievalContext, "headingLookup" | "sectionRanges" | "topFieldCandidates" | "topSectionMatches">;
  workspaceGraphHints: ActiveDocumentRetrievalContext["workspaceGraphHints"];
}) => {
  const terms = tokenizeQuery(latestUserMessage);
  const issueBoost = Math.min(workspaceGraphHints?.impactSummary?.issueCount || 0, 3) * 2;
  const referenceBoost = ((workspaceGraphHints?.impactSummary?.inboundReferenceCount || 0) > 0
    || (workspaceGraphHints?.impactSummary?.outboundReferenceCount || 0) > 0)
    ? 2
    : 0;

  return retrievalContext.sectionRanges
    .map((range) => {
      const retrievalMatch = retrievalContext.topSectionMatches.find((match) => match.sectionId === range.sectionId);
      const retrievalScore = retrievalMatch?.score || 0;
      const sectionTitleOverlap = scoreOverlap(terms, range.headingTitle) * 6;
      const fieldBoost = retrievalContext.topFieldCandidates.filter((candidate) => candidate.sectionId === range.sectionId).length * 4;
      const depthBoost = Math.max(0, 4 - range.level);
      const graphScore = sectionTitleOverlap + fieldBoost + depthBoost + issueBoost + referenceBoost;
      const score = retrievalScore + graphScore;

      return {
        graphNodeId: `section:${range.sectionId || range.headingNodeId}`,
        graphScore,
        headingNodeId: range.headingNodeId,
        headingTitle: range.headingTitle,
        level: range.level,
        matchedTerms: retrievalMatch?.matchedTerms || terms.filter((term) => range.headingTitle.toLowerCase().includes(term)),
        retrievalScore,
        score,
        sectionId: range.sectionId,
      } satisfies RetrievalSectionTarget;
    })
    .filter((target) => target.score > 0)
    .sort((left, right) =>
      right.score - left.score
      || left.level - right.level
      || left.headingTitle.localeCompare(right.headingTitle))
    .slice(0, 5);
};

const buildTopFieldTargets = ({
  latestUserMessage,
  retrievalContext,
  topSectionTargets,
}: {
  latestUserMessage: string;
  retrievalContext: Pick<ActiveDocumentRetrievalContext, "fieldCandidates" | "headingLookup" | "topFieldCandidates">;
  topSectionTargets: RetrievalSectionTarget[];
}) => {
  const terms = tokenizeQuery(latestUserMessage);
  const primarySectionId = topSectionTargets[0]?.sectionId;

  return retrievalContext.fieldCandidates
    .map((candidate) => {
      const retrievalCandidate = retrievalContext.topFieldCandidates.find((fieldCandidate) =>
        fieldCandidate.fieldKey === candidate.fieldKey
        && fieldCandidate.lineIndex === candidate.lineIndex
        && fieldCandidate.sectionId === candidate.sectionId);
      const retrievalScore = retrievalCandidate?.score || 0;
      const sectionTitle = candidate.headingTitle || "";
      const sectionTitleOverlap = scoreOverlap(terms, sectionTitle) * 4;
      const sectionProximityBoost = candidate.sectionId && candidate.sectionId === primarySectionId ? 10 : 0;
      const headingLevel = retrievalContext.headingLookup.find((heading) => heading.headingNodeId === candidate.headingNodeId)?.level || 3;
      const depthBoost = Math.max(0, 4 - headingLevel);
      const kindBoost = candidate.kind === "table_cell" ? 2 : 4;
      const graphScore = sectionTitleOverlap + sectionProximityBoost + depthBoost + kindBoost;

      return {
        ...candidate,
        graphNodeId: `field:${candidate.sectionId || "root"}:${candidate.lineIndex}:${candidate.fieldKey}`,
        graphScore,
        matchedTerms: retrievalCandidate?.matchedTerms || terms.filter((term) => candidate.fieldLabel.toLowerCase().includes(term)),
        retrievalScore,
        score: retrievalScore + graphScore,
      } satisfies RetrievalFieldTarget;
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) =>
      right.score - left.score
      || left.lineIndex - right.lineIndex
      || left.fieldLabel.localeCompare(right.fieldLabel))
    .slice(0, 5);
};

export const buildActiveDocumentRetrievalContext = ({
  latestUserMessage,
  request,
}: {
  latestUserMessage: string;
  request: AgentTurnRequest;
}): ActiveDocumentRetrievalContext | null => {
  if (!request.activeDocument?.markdown?.trim()) {
    return null;
  }

  const normalizedDocument = normalizeIngestionRequest({
    fileName: request.activeDocument.fileName.endsWith(".md")
      ? request.activeDocument.fileName
      : `${request.activeDocument.fileName}.md`,
    importedAt: Date.now(),
    ingestionId: request.activeDocument.documentId,
    rawContent: request.activeDocument.markdown,
    sourceFormat: "markdown",
  });

  const headingLookup = buildHeadingLookup(request, normalizedDocument);
  const sectionRanges = buildSectionRanges({
    headingLookup,
    markdown: request.activeDocument.markdown,
  });
  const lines = request.activeDocument.markdown.split(/\r?\n/);
  const lineContexts = buildLineContexts({
    lineCount: lines.length,
    sectionRanges,
  });
  const fieldCandidates = extractFieldCandidates({
    lineContexts,
    markdown: request.activeDocument.markdown,
  });
  const topFieldCandidates = scoreFieldCandidates({
    candidates: fieldCandidates,
    latestUserMessage,
  });
  const topSectionMatches = keywordRetrieve([normalizedDocument], {
    limit: 5,
    query: latestUserMessage,
  }).matches.map((match) => {
    const heading = headingLookup.find((entry) => entry.sectionId === match.chunk.sectionId);

    return {
      chunkId: match.chunk.chunkId,
      excerpt: trimText(match.chunk.text),
      headingNodeId: heading?.headingNodeId,
      headingTitle: heading?.headingTitle,
      matchedTerms: match.matchedTerms,
      score: match.score,
      sectionId: match.chunk.sectionId,
    } satisfies RetrievalSectionMatch;
  });
  const workspaceGraphHints = request.graphContext?.workspaceHints || null;
  const activeDocumentGraph = buildActiveDocumentGraph({
    fieldCandidates,
    headingLookup,
    sectionRanges,
  });
  const topSectionTargets = buildTopSectionTargets({
    latestUserMessage,
    retrievalContext: {
      headingLookup,
      sectionRanges,
      topFieldCandidates,
      topSectionMatches,
    },
    workspaceGraphHints,
  });
  const topFieldTargets = buildTopFieldTargets({
    latestUserMessage,
    retrievalContext: {
      fieldCandidates,
      headingLookup,
      topFieldCandidates,
    },
    topSectionTargets,
  });

  return {
    activeDocumentGraph,
    documentSummary: {
      chunkCount: normalizedDocument.chunks.length,
      fileName: request.activeDocument.fileName,
      graphEdgeCount: activeDocumentGraph.edges.length,
      graphNodeCount: activeDocumentGraph.nodes.length,
      headingCount: headingLookup.length,
      markdownLength: request.activeDocument.markdown.length,
      mode: request.activeDocument.mode,
      preview: trimText(request.activeDocument.markdown, 800),
      sectionCount: normalizedDocument.sections.length,
    },
    fieldCandidates,
    headingLookup,
    lineContexts,
    normalizedDocument,
    sectionRanges,
    topFieldCandidates,
    topFieldTargets,
    topSectionMatches,
    topSectionTargets,
    workspaceGraphHints,
  };
};
