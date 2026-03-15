import type { JSONContent } from "@tiptap/core";
import { renderAstToHtml } from "./renderAstToHtml";
import { serializeTiptapToAst } from "./tiptapAst";
import { isUsableTiptapDocument } from "./tiptapUsability";

export const getRenderableHtml = (editorDocument: JSONContent | null | undefined, fallbackHtml: string) => {
  if (!isUsableTiptapDocument(editorDocument)) {
    return fallbackHtml;
  }

  try {
    const ast = serializeTiptapToAst(editorDocument, { throwOnUnsupported: true });
    return renderAstToHtml(ast);
  } catch {
    return fallbackHtml;
  }
};
