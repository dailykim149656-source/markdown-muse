import yaml from "js-yaml";
import { buildDerivedDocumentIndex } from "@/lib/ast/documentIndex";
import type { DocumentData } from "@/types/document";
import type { DocumentAst, BlockNode } from "@/types/documentAst";

export type FormatConsistencyIssueKind =
  | "duplicate_heading"
  | "heading_level_gap"
  | "json_yaml_divergence"
  | "loss_sensitive_content"
  | "missing_toc"
  | "structured_parse_error";

export interface FormatConsistencyIssue {
  kind: FormatConsistencyIssueKind;
  message: string;
  severity: "info" | "warning";
  action?: "generate_toc";
}

const normalizeHeading = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, " ")
    .trim();

const walkBlocks = (blocks: BlockNode[], visit: (node: BlockNode) => void) => {
  for (const block of blocks) {
    visit(block);

    if (block.type === "blockquote" || block.type === "admonition" || block.type === "list_item" || block.type === "task_list_item") {
      walkBlocks(block.blocks, visit);
      continue;
    }

    if (block.type === "bullet_list" || block.type === "ordered_list" || block.type === "task_list") {
      walkBlocks(block.items, visit);
      continue;
    }

    if (block.type === "table") {
      for (const row of block.rows) {
        for (const cell of row.cells) {
          walkBlocks(cell.blocks, visit);
        }
      }
    }
  }
};

const detectLossSensitiveContent = (ast: DocumentAst | null | undefined) => {
  if (!ast) {
    return false;
  }

  let found = false;
  const riskyTypes = new Set([
    "admonition",
    "figure_caption",
    "footnote_item",
    "math_block",
    "mermaid_block",
    "table_of_contents",
  ]);

  walkBlocks(ast.blocks, (block) => {
    if (riskyTypes.has(block.type)) {
      found = true;
    }
  });

  return found;
};

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (!value || typeof value !== "object") {
    return JSON.stringify(value);
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`).join(",")}}`;
};

const parseStructured = (mode: "json" | "yaml", content: string) =>
  mode === "json" ? JSON.parse(content) : yaml.load(content);

export const analyzeFormatConsistency = (document: DocumentData): FormatConsistencyIssue[] => {
  const issues: FormatConsistencyIssue[] = [];

  if (document.mode === "json" || document.mode === "yaml") {
    try {
      parseStructured(document.mode, document.content);
    } catch (error) {
      issues.push({
        kind: "structured_parse_error",
        message: error instanceof Error ? error.message : "Structured document could not be parsed.",
        severity: "warning",
      });
    }

    const jsonSnapshot = document.sourceSnapshots?.json;
    const yamlSnapshot = document.sourceSnapshots?.yaml;

    if (jsonSnapshot && yamlSnapshot) {
      try {
        const jsonValue = parseStructured("json", jsonSnapshot);
        const yamlValue = parseStructured("yaml", yamlSnapshot);

        if (stableStringify(jsonValue) !== stableStringify(yamlValue)) {
          issues.push({
            kind: "json_yaml_divergence",
            message: "JSON and YAML snapshots resolve to different structured values.",
            severity: "warning",
          });
        }
      } catch {
        issues.push({
          kind: "json_yaml_divergence",
          message: "JSON and YAML snapshots could not be compared safely.",
          severity: "info",
        });
      }
    }

    return issues;
  }

  if (!document.ast) {
    return issues;
  }

  const headingIndex = buildDerivedDocumentIndex(document.ast).headings;
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const heading of headingIndex) {
    const normalized = normalizeHeading(heading.text);

    if (!normalized) {
      continue;
    }

    if (seen.has(normalized)) {
      duplicates.add(heading.text);
      continue;
    }

    seen.add(normalized);
  }

  if (duplicates.size > 0) {
    issues.push({
      kind: "duplicate_heading",
      message: `Duplicate heading titles detected: ${Array.from(duplicates).slice(0, 3).join(", ")}.`,
      severity: "warning",
    });
  }

  for (let index = 1; index < headingIndex.length; index += 1) {
    const previous = headingIndex[index - 1];
    const current = headingIndex[index];

    if (current.level - previous.level > 1) {
      issues.push({
        kind: "heading_level_gap",
        message: `Heading "${current.text}" skips directly from level ${previous.level} to ${current.level}.`,
        severity: "info",
      });
      break;
    }
  }

  const hasToc = document.ast.blocks.some((block) => block.type === "table_of_contents");

  if (!hasToc && headingIndex.length >= 3) {
    issues.push({
      action: "generate_toc",
      kind: "missing_toc",
      message: "The document has multiple headings but no table of contents placeholder.",
      severity: "info",
    });
  }

  if (detectLossSensitiveContent(document.ast)) {
    issues.push({
      kind: "loss_sensitive_content",
      message: "This document includes advanced blocks that may need export review for full fidelity.",
      severity: "info",
    });
  }

  return issues;
};
