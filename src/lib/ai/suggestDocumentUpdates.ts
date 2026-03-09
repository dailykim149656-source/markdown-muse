import { buildComparisonPatchSet, compareDocuments, type ComparisonPatchBuildOptions } from "@/lib/ai/compareDocuments";
import type { NormalizedIngestionDocument } from "@/lib/ingestion/contracts";
import type { DocumentAst } from "@/types/documentAst";

export interface SuggestDocumentUpdatesOptions extends ComparisonPatchBuildOptions {
  changedSimilarityThreshold?: number;
}

export const suggestDocumentUpdates = (
  sourceDocument: NormalizedIngestionDocument,
  targetDocument: NormalizedIngestionDocument,
  sourceAst: DocumentAst,
  options: SuggestDocumentUpdatesOptions,
) => {
  const comparison = compareDocuments(sourceDocument, targetDocument, {
    changedSimilarityThreshold: options.changedSimilarityThreshold,
  });
  const patchBuild = buildComparisonPatchSet(comparison, sourceAst, targetDocument, options);

  return {
    comparison,
    patchBuild,
  };
};
