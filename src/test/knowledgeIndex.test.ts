import { describe, expect, it } from "vitest";
import {
  buildDocumentOptionsFromKnowledgeRecord,
  buildKnowledgeRecordFromDocument,
  coerceKnowledgeRecord,
  reconcileKnowledgeRecords,
  searchKnowledgeRecords,
  summarizeKnowledgeRecords,
} from "@/lib/knowledge/knowledgeIndex";
import type { DocumentData } from "@/types/document";

const createMarkdownDocument = (overrides: Partial<DocumentData> = {}): DocumentData => ({
  ast: null,
  content: "# Incident Runbook\n\n## Restart Service\n\nRestart the service and verify health checks.",
  createdAt: 1,
  id: "doc-1",
  metadata: {
    sourceFiles: [{
      fileName: "incident-runbook.md",
      importedAt: 1,
      sourceFormat: "markdown",
      sourceId: "source-doc-1",
    }],
  },
  mode: "markdown",
  name: "Incident Runbook",
  sourceSnapshots: {
    markdown: "# Incident Runbook\n\n## Restart Service\n\nRestart the service and verify health checks.",
  },
  storageKind: "docsy",
  tiptapJson: null,
  updatedAt: 2,
  ...overrides,
});

describe("knowledgeIndex", () => {
  it("builds a normalized knowledge record from a document", () => {
    const record = buildKnowledgeRecordFromDocument(createMarkdownDocument());

    expect(record).not.toBeNull();
    expect(record?.fileName).toBe("incident-runbook.md");
    expect(record?.normalizedDocument.sections[0]).toEqual(expect.objectContaining({
      title: "Incident Runbook",
    }));
    expect(record?.sourceFile.sourceId).toBe("source-doc-1");
  });

  it("searches indexed records by chunk text", () => {
    const incidentRecord = buildKnowledgeRecordFromDocument(createMarkdownDocument());
    const apiRecord = buildKnowledgeRecordFromDocument(createMarkdownDocument({
      content: "# API Guide\n\n## Authentication\n\nIssue a token before calling the API.",
      id: "doc-2",
      metadata: {
        sourceFiles: [{
          fileName: "api-guide.md",
          importedAt: 3,
          sourceFormat: "markdown",
          sourceId: "source-doc-2",
        }],
      },
      name: "API Guide",
      sourceSnapshots: {
        markdown: "# API Guide\n\n## Authentication\n\nIssue a token before calling the API.",
      },
      updatedAt: 4,
    }));

    const results = searchKnowledgeRecords(
      [incidentRecord, apiRecord].filter((record): record is NonNullable<typeof record> => Boolean(record)),
      "restart service",
    );

    expect(results).toHaveLength(1);
    expect(results[0].record.documentId).toBe("doc-1");
    expect(results[0].kind).toBe("chunk");
    expect(results[0].snippet.toLowerCase()).toContain("restart the service");
  });

  it("rebuilds document options from a stored knowledge record", () => {
    const record = buildKnowledgeRecordFromDocument(createMarkdownDocument());

    expect(record).not.toBeNull();

    const options = buildDocumentOptionsFromKnowledgeRecord(record!);

    expect(options).toEqual(expect.objectContaining({
      content: expect.stringContaining("Restart the service"),
      id: "doc-1",
      mode: "markdown",
      name: "Incident Runbook",
    }));
    expect(options.metadata?.sourceFiles?.[0]).toEqual(expect.objectContaining({
      fileName: "incident-runbook.md",
      sourceId: "source-doc-1",
    }));
  });

  it("prefers preserved asciidoc snapshots for ingestion and reopening", () => {
    const record = buildKnowledgeRecordFromDocument(createMarkdownDocument({
      content: "<h1>Converted HTML</h1><p>Converted content.</p>",
      id: "doc-adoc",
      metadata: {
        sourceFiles: [{
          fileName: "ops-runbook.adoc",
          importedAt: 10,
          sourceFormat: "asciidoc",
          sourceId: "source-doc-adoc",
        }],
      },
      mode: "html",
      name: "Ops Runbook",
      sourceSnapshots: {
        asciidoc: "= Ops Runbook\n\n== Recover\n\nRestart the service.",
        html: "<h1>Converted HTML</h1><p>Converted content.</p>",
      },
      updatedAt: 11,
    }));

    expect(record).not.toBeNull();
    expect(record?.sourceFormat).toBe("asciidoc");
    expect(record?.rawContent).toContain("== Recover");
    expect(record?.normalizedDocument.sections[0]).toEqual(expect.objectContaining({
      title: "Recover",
    }));

    const options = buildDocumentOptionsFromKnowledgeRecord(record!);

    expect(options.mode).toBe("html");
    expect(options.content).toContain("<h2>Recover</h2>");
    expect(options.sourceSnapshots).toEqual(expect.objectContaining({
      asciidoc: expect.stringContaining("== Recover"),
      html: expect.stringContaining("<h2>Recover</h2>"),
    }));
  });

  it("marks legacy records as stale until they are rebuilt", () => {
    const legacyRecord = coerceKnowledgeRecord({
      documentId: "doc-1",
      fileName: "incident-runbook.md",
      normalizedDocument: {
        chunks: [],
        fileName: "incident-runbook.md",
        images: [],
        importedAt: 1,
        ingestionId: "doc-1",
        metadata: {},
        plainText: "Restart the service.",
        sections: [],
        sourceFormat: "markdown",
      },
      rawContent: "# Incident Runbook\n\nRestart the service.",
      sourceFile: {
        fileName: "incident-runbook.md",
        importedAt: 1,
        sourceFormat: "markdown",
        sourceId: "source-doc-1",
      },
      sourceFormat: "markdown",
      updatedAt: 2,
    });

    expect(legacyRecord).not.toBeNull();
    expect(legacyRecord?.indexStatus).toBe("stale");
    expect(legacyRecord?.staleReasons).toContain("schema_version");
  });

  it("marks indexed records as stale when the source document changed", () => {
    const storedRecord = buildKnowledgeRecordFromDocument(createMarkdownDocument({
      updatedAt: 2,
    }));
    const liveRecord = buildKnowledgeRecordFromDocument(createMarkdownDocument({
      content: "# Incident Runbook\n\n## Restart Service\n\nRestart the service twice and verify health checks.",
      sourceSnapshots: {
        markdown: "# Incident Runbook\n\n## Restart Service\n\nRestart the service twice and verify health checks.",
      },
      updatedAt: 5,
    }));

    const reconciled = reconcileKnowledgeRecords(
      [storedRecord].filter((record): record is NonNullable<typeof record> => Boolean(record)),
      [liveRecord].filter((record): record is NonNullable<typeof record> => Boolean(record)),
    );

    expect(reconciled[0].indexStatus).toBe("stale");
    expect(reconciled[0].staleReasons).toContain("source_changed");
  });

  it("searches indexed records by image metadata", () => {
    const record = buildKnowledgeRecordFromDocument(createMarkdownDocument({
      content: [
        "# Architecture",
        "",
        "![System diagram](./images/system.png \"System\")",
        "",
        "Reference architecture for service recovery.",
      ].join("\n"),
      id: "doc-img",
      metadata: {
        sourceFiles: [{
          fileName: "architecture.md",
          importedAt: 20,
          sourceFormat: "markdown",
          sourceId: "source-doc-img",
        }],
      },
      name: "Architecture",
      sourceSnapshots: {
        markdown: [
          "# Architecture",
          "",
          "![System diagram](./images/system.png \"System\")",
          "",
          "Reference architecture for service recovery.",
        ].join("\n"),
      },
      updatedAt: 21,
    }));

    const results = searchKnowledgeRecords(
      [record].filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
      "system diagram",
    );

    const imageResult = results.find((result) => result.kind === "image");

    expect(imageResult).toEqual(expect.objectContaining({
      kind: "image",
      snippet: expect.stringContaining("System diagram"),
    }));
    expect(imageResult?.image).toEqual(expect.objectContaining({
      src: "./images/system.png",
    }));
  });

  it("summarizes fresh, stale, and image counts", () => {
    const freshRecord = buildKnowledgeRecordFromDocument(createMarkdownDocument({
      content: "# Fresh\n\n![Diagram](diagram.png)",
      id: "fresh",
      sourceSnapshots: {
        markdown: "# Fresh\n\n![Diagram](diagram.png)",
      },
      updatedAt: 10,
    }));
    const staleRecord = coerceKnowledgeRecord({
      documentId: "stale",
      fileName: "stale.md",
      normalizedDocument: {
        chunks: [],
        fileName: "stale.md",
        images: [],
        importedAt: 1,
        ingestionId: "stale",
        metadata: {},
        plainText: "stale",
        sections: [],
        sourceFormat: "markdown",
      },
      rawContent: "# Stale",
      sourceFile: {
        fileName: "stale.md",
        importedAt: 1,
        sourceFormat: "markdown",
        sourceId: "source-stale",
      },
      sourceFormat: "markdown",
      updatedAt: 2,
    });

    const summary = summarizeKnowledgeRecords(
      [freshRecord, staleRecord].filter((record): record is NonNullable<typeof record> => Boolean(record)),
    );

    expect(summary.documentCount).toBe(2);
    expect(summary.freshCount).toBe(1);
    expect(summary.imageCount).toBe(1);
    expect(summary.staleCount).toBe(1);
  });
});
