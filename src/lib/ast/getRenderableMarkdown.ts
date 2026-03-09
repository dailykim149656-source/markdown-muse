import type { JSONContent } from "@tiptap/core";
import { renderAstToMarkdown } from "./renderAstToMarkdown";
import { serializeTiptapToAst } from "./tiptapAst";

export const getRenderableMarkdown = (
  editorDocument: JSONContent | null | undefined,
  fallbackMarkdown: string,
) => {
  if (!editorDocument) {
    return fallbackMarkdown;
  }

  try {
    const ast = serializeTiptapToAst(editorDocument, { throwOnUnsupported: true });
    return renderAstToMarkdown(ast);
  } catch {
    return fallbackMarkdown;
  }
};
