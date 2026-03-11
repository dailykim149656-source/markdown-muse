import { describe, expect, it } from "vitest";
import { applyIssueFilter } from "@/components/editor/workspaceGraphUtils";
import type { KnowledgeGraphEdge, KnowledgeGraphNode, KnowledgeHealthIssue } from "@/lib/knowledge/workspaceInsights";

const nodes: KnowledgeGraphNode[] = [
  {
    documentId: "doc-alpha",
    dominantIssueKind: "unresolved_reference",
    id: "doc:alpha",
    issueCount: 1,
    issueSeverity: "warning",
    kind: "document",
    label: "Alpha Doc",
  },
  {
    documentId: "doc-beta",
    dominantIssueKind: "unresolved_reference",
    id: "doc:beta",
    issueCount: 1,
    issueSeverity: "warning",
    kind: "document",
    label: "Beta Doc",
  },
  {
    documentId: "doc-delta",
    dominantIssueKind: "duplicate_document",
    id: "doc:delta",
    issueCount: 1,
    issueSeverity: "warning",
    kind: "document",
    label: "Delta Doc",
  },
];

const edges: KnowledgeGraphEdge[] = [
  {
    description: "Alpha references Beta.",
    group: "reference",
    id: "edge-ref",
    kind: "references",
    sourceDocumentId: "doc-alpha",
    sourceId: "doc:alpha",
    targetDocumentId: "doc-beta",
    targetId: "doc:beta",
    weight: 2,
  },
  {
    description: "Alpha has a broken reference to Beta.",
    group: "issue",
    id: "edge-issue-ref",
    kind: "issue_relation",
    sourceDocumentId: "doc-alpha",
    sourceId: "doc:alpha",
    targetDocumentId: "doc-beta",
    targetId: "doc:beta",
    weight: 6,
  },
  {
    description: "Delta overlaps with Alpha.",
    group: "issue",
    id: "edge-issue-dup",
    kind: "issue_relation",
    sourceDocumentId: "doc-delta",
    sourceId: "doc:delta",
    targetDocumentId: "doc-alpha",
    targetId: "doc:alpha",
    weight: 6,
  },
];

const issues: KnowledgeHealthIssue[] = [
  {
    documentId: "doc-alpha",
    id: "issue-ref",
    kind: "unresolved_reference",
    message: "Alpha references a missing anchor in Beta.",
    relatedDocumentIds: ["doc-alpha", "doc-beta"],
    severity: "warning",
  },
  {
    documentId: "doc-delta",
    id: "issue-dup",
    kind: "duplicate_document",
    message: "Delta overlaps with Alpha.",
    relatedDocumentIds: ["doc-delta", "doc-alpha"],
    severity: "warning",
  },
];

describe("workspaceGraphUtils", () => {
  it("filters graph nodes and edges by issue kind", () => {
    const graph = applyIssueFilter({
      graph: { edges, nodes },
      issues,
      value: "unresolved_reference",
    });

    expect(graph.nodes.map((node) => node.id)).toEqual(["doc:alpha", "doc:beta"]);
    expect(graph.edges.map((edge) => edge.id)).toEqual(["edge-ref", "edge-issue-ref"]);
  });
});
