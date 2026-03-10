type GraphNodeLike = {
  id: string;
  label: string;
  kind?: string;
  documentId?: string | null;
};

type GraphEdgeLike = {
  sourceId: string;
  targetId: string;
  group?: string;
  description?: string;
};

type GraphIssueLike = {
  kind?: string;
  documentId?: string | null;
  relatedDocumentIds?: string[];
};

export type SemanticOverlayLinkKind = "depends_on" | "conflicts_with";
export type SemanticOverlayConfidence = "low" | "medium";
export type SemanticOverlayProvenance = "heuristic" | "issue_assisted";

export type SemanticOverlayLink = {
  targetId: string;
  targetDocumentId: string | null;
  targetLabel: string;
  kind: SemanticOverlayLinkKind;
  confidence: SemanticOverlayConfidence;
  provenance: SemanticOverlayProvenance;
  reasonKey:
    | "graphSemanticReasonReference"
    | "graphSemanticReasonSimilarity"
    | "graphSemanticReasonConflict"
    | "graphSemanticReasonSharedTerms";
};

export type SemanticOverlay = {
  concepts: string[];
  links: SemanticOverlayLink[];
};

const STOP_WORDS = new Set([
  "about",
  "after",
  "before",
  "draft",
  "from",
  "guide",
  "image",
  "into",
  "note",
  "notes",
  "page",
  "pages",
  "part",
  "section",
  "spec",
  "specs",
  "that",
  "this",
  "with",
  "workflow",
  "workflows",
  "document",
  "documents",
]);

function normalizeRelationKind(edge: GraphEdgeLike) {
  return [edge.group, edge.description].filter(Boolean).join(" ").toLowerCase();
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length >= 4 && !STOP_WORDS.has(token));
}

function pickConcepts(values: string[]) {
  const counts = new Map<string, number>();

  for (const value of values) {
    for (const token of tokenize(value)) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 4)
    .map(([token]) => token);
}

export function deriveSemanticOverlay(params: {
  nodes: GraphNodeLike[];
  edges: GraphEdgeLike[];
  issues: GraphIssueLike[];
  selectedNodeId: string | null;
}): SemanticOverlay {
  if (!params.selectedNodeId) {
    return { concepts: [], links: [] };
  }

  const nodeById = new Map(params.nodes.map((node) => [node.id, node]));
  const selectedNode = nodeById.get(params.selectedNodeId);

  if (!selectedNode) {
    return { concepts: [], links: [] };
  }

  const relatedNodes = new Map<string, GraphNodeLike>();
  const links = new Map<string, SemanticOverlayLink>();
  const selectedDocumentId = selectedNode.documentId ?? null;

  for (const edge of params.edges) {
    const relationKind = normalizeRelationKind(edge);
    const isSource = edge.sourceId === selectedNode.id;
    const isTarget = edge.targetId === selectedNode.id;

    if (!isSource && !isTarget) {
      continue;
    }

    const relatedId = isSource ? edge.targetId : edge.sourceId;
    const relatedNode = nodeById.get(relatedId);

    if (!relatedNode) {
      continue;
    }

    relatedNodes.set(relatedId, relatedNode);

    if (relationKind.includes("reference")) {
      links.set(relatedId, {
        targetId: relatedId,
        targetDocumentId: relatedNode.documentId ?? null,
        targetLabel: relatedNode.label,
        kind: "depends_on",
        confidence: "medium",
        provenance: "heuristic",
        reasonKey: "graphSemanticReasonReference",
      });
      continue;
    }

    if (relationKind.includes("similar")) {
      links.set(relatedId, {
        targetId: relatedId,
        targetDocumentId: relatedNode.documentId ?? null,
        targetLabel: relatedNode.label,
        kind: "depends_on",
        confidence: "low",
        provenance: "heuristic",
        reasonKey: "graphSemanticReasonSimilarity",
      });
    }
  }

  for (const issue of params.issues) {
    const involvesSelected =
      issue.documentId === selectedDocumentId ||
      (issue.relatedDocumentIds ?? []).includes(selectedDocumentId ?? "");

    if (!involvesSelected) {
      continue;
    }

    const normalizedKind = (issue.kind ?? "").toLowerCase();
    const relatedDocumentIds = issue.relatedDocumentIds ?? [];

    for (const node of params.nodes) {
      if (!node.documentId || node.documentId === selectedDocumentId) {
        continue;
      }

      if (!relatedDocumentIds.includes(node.documentId)) {
        continue;
      }

      relatedNodes.set(node.id, node);

      if (normalizedKind.includes("conflict")) {
        links.set(node.id, {
          targetId: node.id,
          targetDocumentId: node.documentId ?? null,
          targetLabel: node.label,
          kind: "conflicts_with",
          confidence: "medium",
          provenance: "issue_assisted",
          reasonKey: "graphSemanticReasonConflict",
        });
      }
    }
  }

  const concepts = pickConcepts([
    selectedNode.label,
    ...[...relatedNodes.values()].map((node) => node.label),
  ]);

  if (concepts.length === 0 && links.size === 0 && relatedNodes.size > 0) {
    const fallbackConcepts = pickConcepts([...relatedNodes.values()].map((node) => node.label));
    return { concepts: fallbackConcepts, links: [...links.values()] };
  }

  if (concepts.length > 0) {
    const conceptTokenSet = new Set(concepts);

    for (const node of relatedNodes.values()) {
      if (links.has(node.id)) {
        continue;
      }

      const sharedToken = tokenize(node.label).some((token) => conceptTokenSet.has(token));
      if (!sharedToken) {
        continue;
      }

      links.set(node.id, {
        targetId: node.id,
        targetDocumentId: node.documentId ?? null,
        targetLabel: node.label,
        kind: "depends_on",
        confidence: "low",
        provenance: "heuristic",
        reasonKey: "graphSemanticReasonSharedTerms",
      });
    }
  }

  return {
    concepts,
    links: [...links.values()].sort(
      (left, right) =>
        (right.confidence === "medium" ? 1 : 0) - (left.confidence === "medium" ? 1 : 0) ||
        left.targetLabel.localeCompare(right.targetLabel),
    ),
  };
}
