import type { HeadingLevel, ParagraphNode } from "@/types/documentAst";
import type { DocumentPatchSet, PatchAuthor, PatchSourceAttribution } from "@/types/documentPatch";

export interface SectionGenerationRequest {
  anchorNodeId: string;
  author?: PatchAuthor;
  body: string;
  createdAt?: number;
  documentId: string;
  insertPosition?: "before" | "after";
  level?: HeadingLevel;
  patchSetId: string;
  reason?: string;
  sectionTitle: string;
  sources?: PatchSourceAttribution[];
}

const createTextChildren = (text: string, prefix: string): ParagraphNode["children"] => {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const children: ParagraphNode["children"] = [];

  lines.forEach((line, index) => {
    if (line.length > 0) {
      children.push({ type: "text", text: line });
    }

    if (index < lines.length - 1) {
      children.push({ kind: "inline", nodeId: `${prefix}-br-${index + 1}`, type: "hard_break" });
    }
  });

  return children.length > 0 ? children : [{ type: "text", text: "" }];
};

export const buildGeneratedSectionNodes = (
  sectionTitle: string,
  body: string,
  prefix: string,
  level: HeadingLevel = 2,
) => {
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph, index) => ({
      children: createTextChildren(paragraph, `${prefix}-paragraph-${index + 1}`),
      kind: "block" as const,
      nodeId: `${prefix}-paragraph-${index + 1}`,
      type: "paragraph" as const,
    }));

  return [
    {
      children: [{ type: "text" as const, text: sectionTitle }],
      kind: "block" as const,
      level,
      nodeId: `${prefix}-heading`,
      type: "heading" as const,
    },
    ...paragraphs,
  ];
};

export const buildSectionGenerationPatchSet = (request: SectionGenerationRequest): DocumentPatchSet => {
  const author = request.author ?? "ai";
  const createdAt = request.createdAt ?? Date.now();
  const insertPosition = request.insertPosition ?? "after";
  const prefix = `${request.patchSetId}-generated`;
  const nodes = buildGeneratedSectionNodes(request.sectionTitle, request.body, prefix, request.level ?? 2);

  return {
    author,
    createdAt,
    description: `Generated draft section "${request.sectionTitle}" anchored to node "${request.anchorNodeId}".`,
    documentId: request.documentId,
    patchSetId: request.patchSetId,
    patches: [{
      author,
      confidence: 0.7,
      operation: insertPosition === "before" ? "insert_before" : "insert_after",
      patchId: `${request.patchSetId}-patch-001`,
      payload: {
        kind: "insert_nodes",
        nodes,
      },
      reason: request.reason || `Insert generated section "${request.sectionTitle}".`,
      sources: request.sources,
      status: "pending",
      suggestedText: request.body,
      summary: "Insert generated section as reviewable nodes.",
      target: {
        nodeId: request.anchorNodeId,
        targetType: "node",
      },
      title: `Insert generated section: ${request.sectionTitle}`,
    }],
    status: "draft",
    title: `Generated section: ${request.sectionTitle}`,
  };
};
