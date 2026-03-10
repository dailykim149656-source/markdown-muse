import { useCallback, useEffect, useMemo, useState } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { toast } from "sonner";
import type { KnowledgeSuggestionContext } from "@/components/editor/sidebarFeatureTypes";
import { serializeTiptapToAst } from "@/lib/ast/tiptapAst";
import { buildDerivedDocumentIndex } from "@/lib/ast/documentIndex";
import { buildComparisonPatchSet, compareDocuments } from "@/lib/ai/compareDocuments";
import { useI18n } from "@/i18n/useI18n";
import type { DocumentComparisonResult } from "@/lib/ai/compareDocuments";
import type { ProcedureExtractionResult } from "@/lib/ai/procedureExtraction";
import type { TocSuggestionConflictCode } from "@/lib/ai/tocGeneration";
import type { DocumentData } from "@/types/document";
import type { DocumentPatchSet } from "@/types/documentPatch";
import type {
  GenerateTocEntry,
  GenerateTocResponse,
  SummarizeDocumentResponse,
} from "@/types/aiAssistant";

export type AiBusyAction =
  | "compare"
  | "extract-procedure"
  | "generate-section"
  | "generate-toc"
  | "suggest-updates"
  | "summarize"
  | null;

export interface PatchPreviewResult {
  comparison: DocumentComparisonResult;
  patchCount: number;
  patchSet?: DocumentPatchSet | null;
  patchSetTitle: string;
  targetDocumentName: string;
}

export interface TocPreviewResult {
  attributions: GenerateTocResponse["attributions"];
  conflicts: TocSuggestionConflictCode[];
  entries: GenerateTocEntry[];
  hasLoadablePatch: boolean;
  maxDepth: 1 | 2 | 3;
  patchCount: number;
  patchSetTitle: string;
  rationale: string;
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

const getIssueKindLabel = (issueKind?: KnowledgeSuggestionContext["issueKind"]) => {
  switch (issueKind) {
    case "missing_section":
      return "missing-section";
    case "conflicting_procedure":
      return "conflicting-procedure";
    case "changed_section":
      return "changed-section";
    default:
      return null;
  }
};

const getIssuePriorityLabel = (issuePriority?: KnowledgeSuggestionContext["issuePriority"]) => {
  switch (issuePriority) {
    case "high":
      return "P1";
    case "medium":
      return "P2";
    case "low":
      return "P3";
    default:
      return null;
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
  const [tocPreview, setTocPreview] = useState<TocPreviewResult | null>(null);

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
    setTocPreview(null);
  }, [activeDoc.id]);

  const ensureActiveRichText = useCallback(() => {
    if (!richTextAvailable) {
      throw new Error(t("hooks.ai.richTextOnly"));
    }

    if (!currentRenderableMarkdown.trim()) {
      throw new Error(t("hooks.ai.markdownNotReady"));
    }
  }, [currentRenderableMarkdown, richTextAvailable, t]);

  const buildActiveNormalizedDocument = useCallback(async () => {
    ensureActiveRichText();
    const { normalizeIngestionRequest } = await import("@/lib/ingestion/normalizeIngestionRequest");

    return normalizeIngestionRequest({
      fileName: `${activeDoc.name}.${getDocumentExtension(activeDoc.mode)}`,
      importedAt: activeDoc.updatedAt,
      ingestionId: activeDoc.id,
      rawContent: currentRenderableMarkdown,
      sourceFormat: "markdown",
    });
  }, [activeDoc.id, activeDoc.mode, activeDoc.name, activeDoc.updatedAt, currentRenderableMarkdown, ensureActiveRichText]);

  const buildSourceAst = useCallback(async () => {
    if (!activeEditor) {
      throw new Error(t("hooks.ai.editorNotReady"));
    }

    return serializeTiptapToAst(activeEditor.getJSON(), {
      documentNodeId: `doc-${activeDoc.id}`,
    });
  }, [activeDoc.id, activeEditor, t]);

  const buildTargetNormalizedDocument = useCallback(async (targetDocumentId: string) => {
    const targetDocument = compareCandidates.find((candidate) => candidate.id === targetDocumentId);

    if (!targetDocument) {
      throw new Error(t("hooks.ai.compareTargetMissing"));
    }

    const { normalizeIngestionRequest } = await import("@/lib/ingestion/normalizeIngestionRequest");

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
      const { summarizeDocument } = await import("@/lib/ai/client");
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
      const [
        { buildSectionGenerationPatchSet },
        { generateSection },
      ] = await Promise.all([
        import("@/lib/ai/sectionGeneration"),
        import("@/lib/ai/client"),
      ]);
      const sourceAst = await buildSourceAst();
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

  const generateTocSuggestion = useCallback(async () => {
    ensureActiveRichText();
    setBusyAction("generate-toc");

    try {
      const [
        { generateToc },
        { analyzeTocSuggestion, buildTocPatchSetWithAst },
      ] = await Promise.all([
        import("@/lib/ai/client"),
        import("@/lib/ai/tocGeneration"),
      ]);
      const sourceAst = await buildSourceAst();
      const headings = buildDerivedDocumentIndex(sourceAst).headings;
      const result = await generateToc({
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
        locale,
      });
      const analysis = analyzeTocSuggestion(sourceAst, result.entries, result.maxDepth);
      const patchSet = buildTocPatchSetWithAst(sourceAst, {
        analysis,
        documentId: activeDoc.id,
        maxDepth: result.maxDepth,
        patchSetId: `gemini-toc-${Date.now()}`,
        rationale: result.rationale,
        sources: result.attributions.map((attribution) => ({
          chunkId: attribution.chunkId,
          sectionId: attribution.sectionId,
          sourceId: attribution.ingestionId,
        })),
      });

      const preview = {
        attributions: result.attributions,
        conflicts: analysis.conflicts,
        entries: result.entries,
        hasLoadablePatch: patchSet.patches.length > 0,
        maxDepth: result.maxDepth,
        patchCount: patchSet.patches.length,
        patchSetTitle: patchSet.title,
        rationale: result.rationale,
      } satisfies TocPreviewResult;

      setTocPreview(preview);
      return preview;
    } catch (error) {
      const message = error instanceof Error ? error.message : t("hooks.ai.tocFailed");
      toast.error(message);
      throw error;
    } finally {
      setBusyAction((current) => (current === "generate-toc" ? null : current));
    }
  }, [activeDoc.id, activeDoc.mode, activeDoc.name, buildSourceAst, currentRenderableMarkdown, ensureActiveRichText, locale, t]);

  const loadTocPatch = useCallback(async (maxDepthOverride?: 1 | 2 | 3) => {
    ensureActiveRichText();

    if (!tocPreview) {
      toast.info(t("hooks.ai.tocGenerateFirst"));
      return null;
    }

    const { analyzeTocSuggestion, buildTocPatchSetWithAst } = await import("@/lib/ai/tocGeneration");
    const sourceAst = await buildSourceAst();
    const maxDepth = maxDepthOverride ?? tocPreview.maxDepth;
    const analysis = analyzeTocSuggestion(sourceAst, tocPreview.entries, maxDepth);
    const patchSet = buildTocPatchSetWithAst(sourceAst, {
      analysis,
      documentId: activeDoc.id,
      maxDepth,
      patchSetId: `gemini-toc-${Date.now()}`,
      rationale: tocPreview.rationale,
      sources: tocPreview.attributions.map((attribution) => ({
        chunkId: attribution.chunkId,
        sectionId: attribution.sectionId,
        sourceId: attribution.ingestionId,
      })),
    });

    if (patchSet.patches.length === 0) {
      toast.info(t("hooks.ai.tocNoPatchNeeded"));
      setTocPreview((current) => current
        ? {
          ...current,
          conflicts: analysis.conflicts,
          hasLoadablePatch: false,
          maxDepth,
          patchCount: 0,
        }
        : current);
      return null;
    }

    loadPatchSet(patchSet);
    setTocPreview((current) => current
      ? {
        ...current,
        conflicts: analysis.conflicts,
        hasLoadablePatch: true,
        maxDepth,
        patchCount: patchSet.patches.length,
      }
      : current);
    toast.success(t("hooks.ai.tocPatchLoaded"));
    return patchSet;
  }, [activeDoc.id, buildSourceAst, ensureActiveRichText, loadPatchSet, t, tocPreview]);

  const compareWithDocument = useCallback(async (targetDocumentId: string) => {
    ensureActiveRichText();
    setBusyAction("compare");

    try {
      const sourceAst = await buildSourceAst();
      const sourceNormalized = await buildActiveNormalizedDocument();
      const { normalized: targetNormalized, targetDocument } = await buildTargetNormalizedDocument(targetDocumentId);
      const comparison = compareDocuments(sourceNormalized, targetNormalized);
      const patchBuild = buildComparisonPatchSet(comparison, sourceAst, targetNormalized, {
        documentId: activeDoc.id,
        patchSetId: `compare-${activeDoc.id}-${targetDocument.id}-${Date.now()}`,
        title: t("hooks.ai.compareTitle", { source: activeDoc.name, target: targetDocument.name }),
      });

      const nextPreview = {
        comparison,
        patchCount: patchBuild.patchSet.patches.length,
        patchSet: patchBuild.patchSet,
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

  const suggestUpdatesFromDocument = useCallback(async (
    targetDocumentId: string,
    context?: KnowledgeSuggestionContext,
  ) => {
    ensureActiveRichText();
    setBusyAction("suggest-updates");

    try {
      const { suggestDocumentUpdates } = await import("@/lib/ai/suggestDocumentUpdates");
      const sourceAst = await buildSourceAst();
      const sourceNormalized = await buildActiveNormalizedDocument();
      const { normalized: targetNormalized, targetDocument } = await buildTargetNormalizedDocument(targetDocumentId);
      const issueKindLabel = getIssueKindLabel(context?.issueKind);
      const issuePriorityLabel = getIssuePriorityLabel(context?.issuePriority);
      const issueIdLabel = context?.issueId ? `#${context.issueId}` : null;
      const titleSuffixParts = [issueKindLabel, issuePriorityLabel, issueIdLabel].filter(Boolean);
      const titleSuffix = titleSuffixParts.length > 0 ? ` [${titleSuffixParts.join(" | ")}]` : "";
      const result = suggestDocumentUpdates(sourceNormalized, targetNormalized, sourceAst, {
        documentId: activeDoc.id,
        patchSetId: `suggest-updates-${activeDoc.id}-${targetDocument.id}-${Date.now()}`,
        title: `${t("hooks.ai.updateTitle", { source: activeDoc.name, target: targetDocument.name })}${titleSuffix}`,
      });

      const nextPreview = {
        comparison: result.comparison,
        patchCount: result.patchBuild.patchSet.patches.length,
        patchSet: result.patchBuild.patchSet,
        patchSetTitle: result.patchBuild.patchSet.title,
        targetDocumentName: targetDocument.name,
      } satisfies PatchPreviewResult;

      setUpdateSuggestionPreview(nextPreview);

      if (result.patchBuild.patchSet.patches.length === 0) {
        toast.info(t("hooks.ai.noDiff"));
        return nextPreview;
      }

      loadPatchSet(result.patchBuild.patchSet);
      if (context?.issueId) {
        const sourceName = context.sourceDocumentName || activeDoc.name;
        const targetName = context.targetDocumentName || targetDocument.name;
        const reason = context.issueReason ? ` (${context.issueReason})` : "";
        toast.info(`Issue ${context.issueId}: ${sourceName} -> ${targetName}${reason}`);
      }
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

  const extractProcedureFromActiveDocument = useCallback(async () => {
    ensureActiveRichText();
    setBusyAction("extract-procedure");

    try {
      const { extractProcedure } = await import("@/lib/ai/procedureExtraction");
      const normalizedDocument = await buildActiveNormalizedDocument();
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
    generateTocSuggestion,
    loadTocPatch,
    procedureResult,
    richTextAvailable,
    setAssistantOpen,
    suggestUpdatesFromDocument,
    summarizeActiveDocument,
    summaryResult,
    tocPreview,
    updateSuggestionPreview,
  };
};
