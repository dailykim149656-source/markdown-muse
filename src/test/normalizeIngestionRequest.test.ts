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
  });
});
