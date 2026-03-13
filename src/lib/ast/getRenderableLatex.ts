import type { JSONContent } from "@tiptap/core";
import type { AstLatexRenderOptions } from "./renderAstToLatex";
import { renderAstToLatex } from "./renderAstToLatex";
import { serializeTiptapToAst } from "./tiptapAst";
import { isUsableTiptapDocument } from "./tiptapUsability";

export const getRenderableLatex = (
  editorDocument: JSONContent | null | undefined,
  fallbackLatex: string,
  options: AstLatexRenderOptions = {},
) => {
  if (!isUsableTiptapDocument(editorDocument)) {
    return fallbackLatex;
  }

  try {
    const ast = serializeTiptapToAst(editorDocument, { throwOnUnsupported: true });
    return renderAstToLatex(ast, options);
  } catch {
    return fallbackLatex;
  }
};
