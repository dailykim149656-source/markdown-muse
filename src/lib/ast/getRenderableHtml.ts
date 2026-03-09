import type { JSONContent } from "@tiptap/core";
import { renderAstToHtml } from "./renderAstToHtml";
import { serializeTiptapToAst } from "./tiptapAst";

export const getRenderableHtml = (editorDocument: JSONContent | null | undefined, fallbackHtml: string) => {
  if (!editorDocument) {
    return fallbackHtml;
  }

  try {
    const ast = serializeTiptapToAst(editorDocument, { throwOnUnsupported: true });
    return renderAstToHtml(ast);
  } catch {
    return fallbackHtml;
  }
};
