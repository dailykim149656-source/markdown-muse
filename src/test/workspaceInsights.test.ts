import { describe, expect, it } from "vitest";
import { buildKnowledgeRecordFromDocument, coerceKnowledgeRecord } from "@/lib/knowledge/knowledgeIndex";
import { buildKnowledgeDocumentImpact, buildKnowledgeWorkspaceInsights } from "@/lib/knowledge/workspaceInsights";
import type { DocumentData } from "@/types/document";

const createDocument = (overrides: Partial<DocumentData> = {}): DocumentData => ({
  ast: null,
  content: "# Runbook\n\nSee [API Guide](api-guide.md#auth).",
  createdAt: 1,
  id: "doc-runbook",
  metadata: {
    sourceFiles: [{
      fileName: "runbook.md",
      importedAt: 1,
      sourceFormat: "markdown",
      sourceId: "source-runbook",
    }],
    title: "Runbook",
  },
  mode: "markdown",
  name: "Runbook",
  sourceSnapshots: {
    markdown: "# Runbook\n\nSee [API Guide](api-guide.md#auth).",
  },
  storageKind: "docsy",
  tiptapJson: null,
  updatedAt: 2,
  ...overrides,
});

describe("workspaceInsights", () => {
  it("builds graph edges for sections, images, and references", () => {
    const runbook = buildKnowledgeRecordFromDocument(createDocument({
      content: "# Runbook\n\n![System](system.png)\n\nSee [API Guide](api-guide.md#auth).",
      sourceSnapshots: {
        markdown: "# Runbook\n\n![System](system.png)\n\nSee [API Guide](api-guide.md#auth).",
      },
    }));
    const guide = buildKnowledgeRecordFromDocument(createDocument({
      content: "# API Guide\n\n## Auth\n\nToken flow.",
      id: "doc-guide",
      metadata: {
        labels: { auth: "auth" },
        sourceFiles: [{
          fileName: "api-guide.md",
          importedAt: 3,
          sourceFormat: "markdown",
          sourceId: "source-guide",
        }],
        title: "API Guide",
      },
      name: "API Guide",
      sourceSnapshots: {
        markdown: "# API Guide\n\n## Auth\n\nToken flow.",
      },
      updatedAt: 4,
    }));

    const insights = buildKnowledgeWorkspaceInsights(
      [runbook, guide].filter((record): record is NonNullable<typeof record> => Boolean(record)),
    );

    expect(insights.summary.documentNodeCount).toBe(2);
    expect(insights.summary.imageNodeCount).toBe(1);
    expect(insights.summary.referenceEdgeCount).toBeGreaterThanOrEqual(1);
    expect(insights.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "contains_section" }),
      expect.objectContaining({ kind: "contains_image" }),
      expect.objectContaining({ kind: "references" }),
    ]));
  });

  it("emits stale, duplicate, and unresolved reference issues", () => {
    const staleRecord = coerceKnowledgeRecord({
      documentId: "doc-stale",
      fileName: "stale.md",
      normalizedDocument: {
        chunks: [],
        fileName: "stale.md",
        images: [],
        importedAt: 1,
        ingestionId: "doc-stale",
        metadata: {
          title: "Duplicate Doc",
        },
        plainText: "content",
        sections: [],
        sourceFormat: "markdown",
      },
      rawContent: "# Duplicate Doc\n\nSee missing-guide.md#setup",
      sourceFile: {
        fileName: "stale.md",
        importedAt: 1,
        sourceFormat: "markdown",
        sourceId: "source-stale",
      },
      sourceFormat: "markdown",
      updatedAt: 2,
    });
    const duplicateRecord = buildKnowledgeRecordFromDocument(createDocument({
      content: "# Duplicate Doc",
      id: "doc-duplicate",
      metadata: {
        sourceFiles: [{
          fileName: "duplicate.md",
          importedAt: 4,
          sourceFormat: "markdown",
          sourceId: "source-duplicate",
        }],
        title: "Duplicate Doc",
      },
      name: "Duplicate Doc",
      sourceSnapshots: {
        markdown: "# Duplicate Doc",
      },
      updatedAt: 5,
    }));

    const insights = buildKnowledgeWorkspaceInsights(
      [staleRecord, duplicateRecord].filter((record): record is NonNullable<typeof record> => Boolean(record)),
    );

    expect(insights.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "stale_index" }),
      expect.objectContaining({ kind: "duplicate_document" }),
      expect.objectContaining({ kind: "unresolved_reference" }),
    ]));
    expect(insights.summary.issueCount).toBeGreaterThanOrEqual(3);
    expect(insights.summary.staleIssueCount).toBe(1);
  });

  it("derives active-document impact and related document actions", () => {
    const runbook = buildKnowledgeRecordFromDocument(createDocument({
      content: "# Runbook\n\nSee [API Guide](api-guide.md#auth).",
      sourceSnapshots: {
        markdown: "# Runbook\n\nSee [API Guide](api-guide.md#auth).",
      },
    }));
    const guide = buildKnowledgeRecordFromDocument(createDocument({
      content: "# API Guide\n\n## Auth\n\nSee [Runbook](runbook.md).\n\nToken flow.",
      id: "doc-guide",
      metadata: {
        labels: { auth: "auth" },
        sourceFiles: [{
          fileName: "api-guide.md",
          importedAt: 3,
          sourceFormat: "markdown",
          sourceId: "source-guide",
        }],
        title: "API Guide",
      },
      name: "API Guide",
      sourceSnapshots: {
        markdown: "# API Guide\n\n## Auth\n\nSee [Runbook](runbook.md).\n\nToken flow.",
      },
      updatedAt: 4,
    }));

    const records = [runbook, guide].filter((record): record is NonNullable<typeof record> => Boolean(record));
    const insights = buildKnowledgeWorkspaceInsights(records);
    const impact = buildKnowledgeDocumentImpact(records, insights, "doc-runbook");

    expect(impact).not.toBeNull();
    expect(impact?.outboundReferenceCount).toBeGreaterThanOrEqual(1);
    expect(impact?.inboundReferenceCount).toBeGreaterThanOrEqual(1);
    expect(impact?.relatedDocuments).toEqual(expect.arrayContaining([
      expect.objectContaining({
        documentId: "doc-guide",
        relationKinds: expect.arrayContaining(["references", "referenced_by"]),
      }),
    ]));
  });
});
