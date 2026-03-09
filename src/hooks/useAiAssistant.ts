import { useCallback, useEffect, useMemo, useState } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/useI18n";
import { buildDerivedDocumentIndex } from "@/lib/ast/documentIndex";
import { serializeTiptapToAst } from "@/lib/ast/tiptapAst";
import { generateSection, summarizeDocument } from "@/lib/ai/client";
import {
  buildComparisonPatchSet,
  compareDocuments,
  type DocumentComparisonResult,
} from "@/lib/ai/compareDocuments";
import {
  extractProcedure,
  type ProcedureExtractionResult,
} from "@/lib/ai/procedureExtraction";
import { buildSectionGenerationPatchSet } from "@/lib/ai/sectionGeneration";
import { suggestDocumentUpdates } from "@/lib/ai/suggestDocumentUpdates";
import { normalizeIngestionRequest } from "@/lib/ingestion/normalizeIngestionRequest";
import type { DocumentData } from "@/types/document";
import type { DocumentPatchSet } from "@/types/documentPatch";
import type { SummarizeDocumentResponse } from "@/types/aiAssistant";

export type AiBusyAction =
  | "compare"
  | "extract-procedure"
  | "generate-section"
  | "suggest-updates"
  | "summarize"
  | null;

export interface PatchPreviewResult {
  comparison: DocumentComparisonResult;
  patchCount: number;
  patchSetTitle: string;
  targetDocumentName: string;
}

interface UseAiAssistantOptions {
  activeDoc: DocumentData;
  activeEditor: TiptapEditor | null;
  currentRenderableMarkdown: string;
  documents: DocumentData[];
  loadPatchSet: (patchSet: DocumentPatchSet) => void;
}

const isRichTextDocument = (
  document: DocumentData,
): document is DocumentData & { mode: "html" | "latex" | "markdown" } =>
  document.mode === "markdown" || document.mode === "latex" || document.mode === "html";

const getDocumentExtension = (mode: DocumentData["mode"]) => {
  switch (mode) {
    case "markdown":
      return "md";
    case "latex":
      return "tex";
    case "html":
      return "html";
    case "json":
      return "json";
    case "yaml":
      return "yaml";
    default:
      return "txt";
  }
};

export const useAiAssistant = ({
  activeDoc,
  activeEditor,
  currentRenderableMarkdown,
  documents,
  loadPatchSet,
}: UseAiAssistantOptions) => {
  const { t, locale } = useI18n();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [busyAction, setBusyAction] = useState<AiBusyAction>(null);
  const [summaryResult, setSummaryResult] = useState<SummarizeDocumentResponse | null>(null);
  const [comparePreview, setComparePreview] = useState<PatchPreviewResult | null>(null);
  const [updateSuggestionPreview, setUpdateSuggestionPreview] = useState<PatchPreviewResult | null>(null);
  const [procedureResult, setProcedureResult] = useState<ProcedureExtractionResult | null>(null);

  const richTextAvailable = isRichTextDocument(activeDoc);
  const compareCandidates = useMemo(
    () => documents.filter((document) => document.id !== activeDoc.id && isRichTextDocument(document)),
    [activeDoc.id, documents],
  );

  useEffect(() => {
    setSummaryResult(null);
    setComparePreview(null);
    setUpdateSuggestionPreview(null);
    setProcedureResult(null);
  }, [activeDoc.id]);

  const ensureActiveRichText = useCallback(() => {
    if (!richTextAvailable) {
      throw new Error(t("hooks.ai.richTextOnly"));
    }

    if (!currentRenderableMarkdown.trim()) {
      throw new Error(t("hooks.ai.markdownNotReady"));
    }
  }, [currentRenderableMarkdown, richTextAvailable, t]);

  const buildActiveNormalizedDocument = useCallback(() => {
    ensureActiveRichText();

    return normalizeIngestionRequest({
      fileName: `${activeDoc.name}.${getDocumentExtension(activeDoc.mode)}`,
      importedAt: activeDoc.updatedAt,
      ingestionId: activeDoc.id,
      rawContent: currentRenderableMarkdown,
      sourceFormat: "markdown",
    });
  }, [activeDoc.id, activeDoc.mode, activeDoc.name, activeDoc.updatedAt, currentRenderableMarkdown, ensureActiveRichText]);

  const buildSourceAst = useCallback(() => {
    if (!activeEditor) {
      throw new Error(t("hooks.ai.editorNotReady"));
    }

    return serializeTiptapToAst(activeEditor.getJSON(), {
      documentNodeId: `doc-${activeDoc.id}`,
    });
  }, [activeDoc.id, activeEditor, t]);

  const buildTargetNormalizedDocument = useCallback((targetDocumentId: string) => {
    const targetDocument = compareCandidates.find((candidate) => candidate.id === targetDocumentId);

    if (!targetDocument) {
      throw new Error(t("hooks.ai.compareTargetMissing"));
    }

    return {
      normalized: normalizeIngestionRequest({
        fileName: `${targetDocument.name}.${getDocumentExtension(targetDocument.mode)}`,
        importedAt: targetDocument.updatedAt,
        ingestionId: targetDocument.id,
        rawContent: targetDocument.content,
        sourceFormat: targetDocument.mode,
      }),
      targetDocument,
    };
  }, [compareCandidates, t]);

  const summarizeActiveDocument = useCallback(async (objective: string) => {
    ensureActiveRichText();
    setBusyAction("summarize");

    try {
      const result = await summarizeDocument({
        document: {
          documentId: activeDoc.id,
          fileName: activeDoc.name,
          markdown: currentRenderableMarkdown,
          mode: activeDoc.mode,
        },
        objective,
        locale,
      });

      setSummaryResult(result);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : t("hooks.ai.summarizeFailed");
      toast.error(message);
      throw error;
    } finally {
      setBusyAction((current) => (current === "summarize" ? null : current));
    }
  }, [activeDoc.id, activeDoc.mode, activeDoc.name, currentRenderableMarkdown, ensureActiveRichText, locale, t]);

  const generateSectionPatch = useCallback(async (prompt: string) => {
    ensureActiveRichText();
    setBusyAction("generate-section");

    try {
      const sourceAst = buildSourceAst();
      const headings = buildDerivedDocumentIndex(sourceAst).headings;
      const lastBlock = sourceAst.blocks.at(-1);

      if (!lastBlock) {
        throw new Error(t("hooks.ai.emptyInsert"));
      }

      const generated = await generateSection({
        document: {
          documentId: activeDoc.id,
          fileName: activeDoc.name,
          markdown: currentRenderableMarkdown,
          mode: activeDoc.mode,
        },
        existingHeadings: headings.map((heading) => ({
          level: heading.level,
          nodeId: heading.nodeId,
          text: heading.text,
        })),
        prompt,
        locale,
      });

      const patchSet = buildSectionGenerationPatchSet({
        anchorNodeId: lastBlock.nodeId,
        body: generated.body,
        documentId: activeDoc.id,
        patchSetId: `gemini-section-${Date.now()}`,
        reason: generated.rationale,
        sectionTitle: generated.title,
        sources: generated.attributions.map((attribution) => ({
          chunkId: attribution.chunkId,
          sectionId: attribution.sectionId,
          sourceId: attribution.ingestionId,
        })),
      });

      loadPatchSet(patchSet);
      toast.success(t("hooks.ai.generatedPatch", { title: generated.title }));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("hooks.ai.generateFailed");
      toast.error(message);
      throw error;
    } finally {
      setBusyAction((current) => (current === "generate-section" ? null : current));
    }
  }, [activeDoc.id, activeDoc.mode, activeDoc.name, buildSourceAst, currentRenderableMarkdown, ensureActiveRichText, locale, loadPatchSet, t]);

  const compareWithDocument = useCallback((targetDocumentId: string) => {
    ensureActiveRichText();
    setBusyAction("compare");

    try {
      const sourceAst = buildSourceAst();
      const sourceNormalized = buildActiveNormalizedDocument();
      const { normalized: targetNormalized, targetDocument } = buildTargetNormalizedDocument(targetDocumentId);
      const comparison = compareDocuments(sourceNormalized, targetNormalized);
      const patchBuild = buildComparisonPatchSet(comparison, sourceAst, targetNormalized, {
        documentId: activeDoc.id,
        patchSetId: `compare-${activeDoc.id}-${targetDocument.id}-${Date.now()}`,
        title: t("hooks.ai.compareTitle", { source: activeDoc.name, target: targetDocument.name }),
      });

      const nextPreview = {
        comparison,
        patchCount: patchBuild.patchSet.patches.length,
        patchSetTitle: patchBuild.patchSet.title,
        targetDocumentName: targetDocument.name,
      } satisfies PatchPreviewResult;

      setComparePreview(nextPreview);

      if (patchBuild.patchSet.patches.length === 0) {
        toast.info(t("hooks.ai.noDiff"));
        return nextPreview;
      }

      toast.success(t("hooks.ai.comparePreviewReady", { count: patchBuild.patchSet.patches.length }));
      return nextPreview;
    } catch (error) {
      const message = error instanceof Error ? error.message : t("hooks.ai.compareFailed");
      toast.error(message);
      throw error;
    } finally {
      setBusyAction((current) => (current === "compare" ? null : current));
    }
  }, [
    activeDoc.id,
    activeDoc.name,
    buildActiveNormalizedDocument,
    buildSourceAst,
    buildTargetNormalizedDocument,
    ensureActiveRichText,
    t,
  ]);

  const suggestUpdatesFromDocument = useCallback((targetDocumentId: string) => {
    ensureActiveRichText();
    setBusyAction("suggest-updates");

    try {
      const sourceAst = buildSourceAst();
      const sourceNormalized = buildActiveNormalizedDocument();
      const { normalized: targetNormalized, targetDocument } = buildTargetNormalizedDocument(targetDocumentId);
      const result = suggestDocumentUpdates(sourceNormalized, targetNormalized, sourceAst, {
        documentId: activeDoc.id,
        patchSetId: `suggest-updates-${activeDoc.id}-${targetDocument.id}-${Date.now()}`,
        title: t("hooks.ai.updateTitle", { source: activeDoc.name, target: targetDocument.name }),
      });

      const nextPreview = {
        comparison: result.comparison,
        patchCount: result.patchBuild.patchSet.patches.length,
        patchSetTitle: result.patchBuild.patchSet.title,
        targetDocumentName: targetDocument.name,
      } satisfies PatchPreviewResult;

      setUpdateSuggestionPreview(nextPreview);

      if (result.patchBuild.patchSet.patches.length === 0) {
        toast.info(t("hooks.ai.noDiff"));
        return nextPreview;
      }

      loadPatchSet(result.patchBuild.patchSet);
      toast.success(t("hooks.ai.updateLoaded", { count: result.patchBuild.patchSet.patches.length }));
      return nextPreview;
    } catch (error) {
      const message = error instanceof Error ? error.message : t("hooks.ai.updateFailed");
      toast.error(message);
      throw error;
    } finally {
      setBusyAction((current) => (current === "suggest-updates" ? null : current));
    }
  }, [
    activeDoc.id,
    activeDoc.name,
    buildActiveNormalizedDocument,
    buildSourceAst,
    buildTargetNormalizedDocument,
    ensureActiveRichText,
    loadPatchSet,
    t,
  ]);

  const extractProcedureFromActiveDocument = useCallback(() => {
    ensureActiveRichText();
    setBusyAction("extract-procedure");

    try {
      const normalizedDocument = buildActiveNormalizedDocument();
      const result = extractProcedure([normalizedDocument]);
      setProcedureResult(result);

      if (result.steps.length === 0) {
        toast.info(t("hooks.ai.noProcedure"));
        return result;
      }

      toast.success(t("hooks.ai.procedureReady", { count: result.steps.length }));
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : t("hooks.ai.procedureFailed");
      toast.error(message);
      throw error;
    } finally {
      setBusyAction((current) => (current === "extract-procedure" ? null : current));
    }
  }, [buildActiveNormalizedDocument, ensureActiveRichText, t]);

  return {
    assistantOpen,
    busyAction,
    compareCandidates,
    comparePreview,
    compareWithDocument,
    extractProcedureFromActiveDocument,
    generateSectionPatch,
    procedureResult,
    richTextAvailable,
    setAssistantOpen,
    suggestUpdatesFromDocument,
    summarizeActiveDocument,
    summaryResult,
    updateSuggestionPreview,
  };
};
