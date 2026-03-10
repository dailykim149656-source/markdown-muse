import { describe, expect, it } from "vitest";
import { analyzeFormatConsistency } from "@/lib/analysis/formatConsistency";
import type { DocumentData } from "@/types/document";
import type { DocumentAst } from "@/types/documentAst";

const richTextAst: DocumentAst = {
  type: "document",
  nodeId: "doc-1",
  blocks: [
    {
      children: [{ text: "Overview", type: "text" }],
      kind: "block",
      level: 1,
      nodeId: "h1",
      type: "heading",
    },
    {
      children: [{ text: "Overview", type: "text" }],
      kind: "block",
      level: 3,
      nodeId: "h2",
      type: "heading",
    },
    {
      children: [{ text: "Details", type: "text" }],
      kind: "block",
      level: 2,
      nodeId: "h3",
      type: "heading",
    },
    {
      code: "graph TD\nA-->B",
      kind: "block",
      nodeId: "m1",
      type: "mermaid_block",
    },
  ],
};

describe("formatConsistency", () => {
  it("detects heading and toc issues for rich-text documents", () => {
    const issues = analyzeFormatConsistency({
      ast: richTextAst,
      content: "# doc",
      createdAt: 1,
      id: "doc-1",
      mode: "markdown",
      name: "Doc",
      updatedAt: 2,
    } as DocumentData);

    expect(issues.map((issue) => issue.kind)).toContain("duplicate_heading");
    expect(issues.map((issue) => issue.kind)).toContain("heading_level_gap");
    expect(issues.map((issue) => issue.kind)).toContain("missing_toc");
    expect(issues.map((issue) => issue.kind)).toContain("loss_sensitive_content");
  });

  it("detects parse errors and snapshot divergence for structured documents", () => {
    const issues = analyzeFormatConsistency({
      content: "{ bad json",
      createdAt: 1,
      id: "doc-2",
      mode: "json",
      name: "Config",
      sourceSnapshots: {
        json: '{"name":"Docsy"}',
        yaml: "name: Other\n",
      },
      updatedAt: 2,
    } as DocumentData);

    expect(issues.map((issue) => issue.kind)).toContain("structured_parse_error");
    expect(issues.map((issue) => issue.kind)).toContain("json_yaml_divergence");
  });
});
