import { describe, expect, it } from "vitest";
import { normalizeIngestionRequest } from "@/lib/ingestion/normalizeIngestionRequest";

describe("normalizeIngestionRequest", () => {
  it("extracts sections and metadata from markdown with frontmatter", () => {
    const result = normalizeIngestionRequest({
      fileName: "runbook.md",
      importedAt: 100,
      ingestionId: "ing-md",
      rawContent: [
        "---",
        'title: "Runbook"',
        "authors:",
        "  - Alice",
        "  - Bob",
        "tags:",
        "  - ops",
        "  - guide",
        "docType: sop",
        "labels:",
        "  owner: docs",
        "---",
        "",
        "# Overview",
        "",
        "Intro paragraph.",
        "",
        "## Procedure",
        "",
        "1. Step one",
      ].join("\n"),
      sourceFormat: "markdown",
    });

    expect(result.metadata).toEqual({
      authors: ["Alice", "Bob"],
      documentType: "sop",
      labels: { owner: "docs" },
      tags: ["ops", "guide"],
      title: "Runbook",
    });
    expect(result.sections).toEqual([
      expect.objectContaining({
        level: 1,
        path: ["Overview"],
        title: "Overview",
      }),
      expect.objectContaining({
        level: 2,
        path: ["Overview", "Procedure"],
        title: "Procedure",
      }),
    ]);
    expect(result.chunks.map((chunk) => chunk.sectionId)).toEqual([
      result.sections[0].sectionId,
      result.sections[1].sectionId,
    ]);
    expect(result.images).toEqual([]);
  });

  it("extracts sections and metadata from html", () => {
    const result = normalizeIngestionRequest({
      fileName: "guide.html",
      importedAt: 200,
      ingestionId: "ing-html",
      rawContent: [
        "<html>",
        "<head>",
        "<title>System Guide</title>",
        '<meta name="author" content="Alice, Bob" />',
        '<meta name="keywords" content="ops, guide" />',
        "</head>",
        "<body>",
        '<h1 id="overview">Overview</h1>',
        "<p>Intro text.</p>",
        "<h2>Install</h2>",
        "<p>Install steps.</p>",
        "</body>",
        "</html>",
      ].join(""),
      sourceFormat: "html",
    });

    expect(result.metadata).toEqual({
      authors: ["Alice", "Bob"],
      labels: { overview: "overview" },
      tags: ["ops", "guide"],
      title: "System Guide",
    });
    expect(result.sections).toEqual([
      expect.objectContaining({ level: 1, path: ["Overview"], title: "Overview" }),
      expect.objectContaining({ level: 2, path: ["Overview", "Install"], title: "Install" }),
    ]);
    expect(result.plainText).toContain("Overview");
    expect(result.plainText).toContain("Install steps.");
    expect(result.images).toEqual([]);
  });

  it("extracts sections and metadata from latex", () => {
    const result = normalizeIngestionRequest({
      fileName: "spec.tex",
      importedAt: 300,
      ingestionId: "ing-tex",
      rawContent: [
        "\\title{API Spec}",
        "\\author{Alice \\and Bob}",
        "",
        "\\section{Overview}",
        "Intro text.",
        "",
        "\\subsection{Auth}",
        "\\label{sec:auth}",
        "Use token auth.",
      ].join("\n"),
      sourceFormat: "latex",
    });

    expect(result.metadata).toEqual({
      authors: ["Alice", "Bob"],
      labels: { "sec:auth": "sec:auth" },
      tags: undefined,
      title: "API Spec",
    });
    expect(result.sections).toEqual([
      expect.objectContaining({ level: 1, path: ["Overview"], title: "Overview" }),
      expect.objectContaining({ level: 2, path: ["Overview", "Auth"], title: "Auth" }),
    ]);
    expect(result.chunks).toHaveLength(2);
    expect(result.plainText).toContain("Intro text.");
    expect(result.plainText).toContain("Use token auth.");
    expect(result.images).toEqual([]);
  });

  it("extracts sections and metadata from asciidoc", () => {
    const result = normalizeIngestionRequest({
      fileName: "runbook.adoc",
      importedAt: 400,
      ingestionId: "ing-adoc",
      rawContent: [
        "= Operations Runbook",
        ":author: Alice; Bob",
        ":keywords: ops, recovery",
        ":doctype: book",
        "",
        "[[overview]]",
        "== Overview",
        "",
        "Service recovery overview.",
        "",
        "[[restart-service]]",
        "=== Restart Service",
        "",
        "* Restart the service",
        "* Verify health checks",
      ].join("\n"),
      sourceFormat: "asciidoc",
    });

    expect(result.metadata).toEqual({
      authors: ["Alice", "Bob"],
      documentType: "book",
      labels: {
        overview: "overview",
        "restart-service": "restart-service",
      },
      tags: ["ops", "recovery"],
      title: "Operations Runbook",
    });
    expect(result.sections).toEqual([
      expect.objectContaining({ level: 1, path: ["Overview"], title: "Overview" }),
      expect.objectContaining({ level: 2, path: ["Overview", "Restart Service"], title: "Restart Service" }),
    ]);
    expect(result.plainText).toContain("Restart the service");
    expect(result.chunks).toHaveLength(2);
    expect(result.images).toEqual([]);
  });

  it("extracts sections and metadata from rst", () => {
    const result = normalizeIngestionRequest({
      fileName: "guide.rst",
      importedAt: 500,
      ingestionId: "ing-rst",
      rawContent: [
        ":author: Alice, Bob",
        ":tags: ops, guide",
        ":document-type: manual",
        "",
        "Guide",
        "=====",
        "",
        "Overview text.",
        "",
        ".. _install:",
        "",
        "Install",
        "-------",
        "",
        "1. Run installer",
        "2. Verify service",
      ].join("\n"),
      sourceFormat: "rst",
    });

    expect(result.metadata).toEqual({
      authors: ["Alice", "Bob"],
      documentType: "manual",
      labels: { install: "install" },
      tags: ["ops", "guide"],
      title: "Guide",
    });
    expect(result.sections).toEqual([
      expect.objectContaining({ level: 1, path: ["Guide"], title: "Guide" }),
      expect.objectContaining({ level: 2, path: ["Guide", "Install"], title: "Install" }),
    ]);
    expect(result.plainText).toContain("Run installer");
    expect(result.chunks).toHaveLength(2);
    expect(result.images).toEqual([]);
  });

  it("extracts markdown images with section context", () => {
    const result = normalizeIngestionRequest({
      fileName: "architecture.md",
      importedAt: 600,
      ingestionId: "ing-md-img",
      rawContent: [
        "# Overview",
        "",
        "![System diagram](./images/system.png \"System\")",
        "",
        "## Components",
        "",
        "Text before ![API flow](./images/api-flow.png) text after.",
      ].join("\n"),
      sourceFormat: "markdown",
    });

    expect(result.images).toEqual([
      expect.objectContaining({
        alt: "System diagram",
        metadata: expect.objectContaining({
          sectionTitle: "Overview",
        }),
        src: "./images/system.png",
        title: "System",
      }),
      expect.objectContaining({
        alt: "API flow",
        metadata: expect.objectContaining({
          sectionTitle: "Components",
        }),
        src: "./images/api-flow.png",
      }),
    ]);
  });

  it("extracts html images with captions", () => {
    const result = normalizeIngestionRequest({
      fileName: "architecture.html",
      importedAt: 700,
      ingestionId: "ing-html-img",
      rawContent: [
        "<html><body>",
        "<h1>Overview</h1>",
        "<figure>",
        '<img src="/assets/system.svg" alt="System diagram" title="System" />',
        "<figcaption>Architecture caption</figcaption>",
        "</figure>",
        "</body></html>",
      ].join(""),
      sourceFormat: "html",
    });

    expect(result.images).toEqual([
      expect.objectContaining({
        alt: "System diagram",
        caption: "Architecture caption",
        metadata: expect.objectContaining({
          sectionTitle: "Overview",
        }),
        src: "/assets/system.svg",
        title: "System",
      }),
    ]);
  });
});
