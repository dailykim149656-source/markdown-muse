import { describe, expect, it } from "vitest";
import type { KnowledgeDocumentRecord } from "@/lib/knowledge/knowledgeIndex";
import {
  buildConsistencyHealthIssues,
  buildKnowledgeConsistencyIssues,
} from "@/lib/knowledge/consistencyAnalysis";

const createKnowledgeRecord = (
  documentId: string,
  title: string,
  sections: Array<{ sectionId: string; title: string; text: string }>,
): KnowledgeDocumentRecord => ({
  contentHash: `hash-${documentId}`,
  documentId,
  fileName: `${title.toLowerCase()}.md`,
  indexStatus: "fresh",
  indexedAt: 10,
  normalizedDocument: {
    chunks: sections.map((section, index) => ({
      chunkId: `${section.sectionId}-chunk`,
      order: index,
      sectionId: section.sectionId,
      text: section.text,
      tokenEstimate: section.text.length,
    })),
    fileName: `${title.toLowerCase()}.md`,
    images: [],
    importedAt: 10,
    ingestionId: `ing-${documentId}`,
    metadata: { title },
    plainText: sections.map((section) => section.text).join("\n"),
    sections: sections.map((section, index) => ({
      level: 1,
      path: [section.title],
      sectionId: section.sectionId,
      text: section.text,
      title: section.title,
    })),
    sourceFormat: "markdown",
  },
  rawContent: sections.map((section) => `# ${section.title}\n${section.text}`).join("\n\n"),
  schemaVersion: 2,
  sourceFile: {
    fileName: `${title.toLowerCase()}.md`,
    importedAt: 10,
    sourceFormat: "markdown",
    sourceId: documentId,
  },
  sourceFormat: "markdown",
  sourceUpdatedAt: 10,
  updatedAt: 10,
});

describe("consistencyAnalysis", () => {
  it("derives missing, conflicting, and changed issues", () => {
    const activeRecord = createKnowledgeRecord("source", "Source", [
      { sectionId: "overview", text: "Keep service online.", title: "Overview" },
      { sectionId: "deploy", text: "Deploy in three steps.", title: "Deploy" },
    ]);
    const missingTarget = createKnowledgeRecord("target-1", "Target One", [
      { sectionId: "overview", text: "Keep service online.", title: "Overview" },
    ]);
    const conflictingTarget = createKnowledgeRecord("target-2", "Target Two", [
      { sectionId: "overview", text: "Keep service offline.", title: "Overview" },
      { sectionId: "deploy", text: "Deploy in ten unrelated phases.", title: "Deploy" },
    ]);
    const changedTarget = createKnowledgeRecord("target-3", "Target Three", [
      { sectionId: "overview", text: "Keep service online with extra checks.", title: "Overview" },
      { sectionId: "deploy", text: "Deploy in three steps.", title: "Deploy" },
    ]);

    const issues = buildKnowledgeConsistencyIssues(activeRecord, [
      missingTarget,
      conflictingTarget,
      changedTarget,
    ]);

    expect(issues.map((issue) => issue.kind)).toEqual(expect.arrayContaining([
      "missing_section",
      "conflicting_procedure",
      "changed_section",
    ]));

    const healthIssues = buildConsistencyHealthIssues(issues);
    expect(healthIssues.every((issue) => issue.kind !== "changed_section")).toBe(true);
    expect(healthIssues.map((issue) => issue.kind)).toEqual(expect.arrayContaining([
      "missing_section",
      "conflicting_procedure",
    ]));
  });
});
