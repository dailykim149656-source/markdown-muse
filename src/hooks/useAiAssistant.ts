import { useCallback, useEffect, useMemo, useState } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { toast } from "sonner";
import type { KnowledgeSuggestionContext } from "@/components/editor/sidebarFeatureTypes";
import { serializeTiptapToAst } from "@/lib/ast/tiptapAst";
import { buildDerivedDocumentIndex } from "@/lib/ast/documentIndex";
import { captureWorkspaceScreenshot } from "@/lib/ai/captureWorkspaceScreenshot";
import { buildComparisonPatchSet, compareDocuments } from "@/lib/ai/compareDocuments";
import { useI18n } from "@/i18n/useI18n";
import type { DocumentComparisonResult } from "@/lib/ai/compareDocuments";
import type { ProcedureExtractionResult } from "@/lib/ai/procedureExtraction";
import type { TocSkippedEntry, TocSuggestionConflictCode } from "@/lib/ai/tocGeneration";
import type { DocumentData } from "@/types/document";
import type { DocumentPatchSet } from "@/types/documentPatch";
import type {
  GenerateTocEntry,
  GenerateTocResponse,
  ProposeEditorActionResponse,
  SummarizeDocumentResponse,
} from "@/types/aiAssistant";
import type { GenerateSectionResponse } from "@/types/aiAssistant";

export type AiBusyAction =
  | "compare"
  | "extract-procedure"
  | "generate-section"
  | "generate-toc"
  | "suggest-updates"
  | "summarize"
  | null;

export interface PatchPreviewResult {
  actionProposal?: ProposeEditorActionResponse | null;
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
  matchedCount: number;
  patchCount: number;
  patchSet: DocumentPatchSet | null;
  patchSetTitle: string;
  promotedCount: number;
  rationale: string;
  skippedEntries: TocSkippedEntry[];
}

export interface SectionGenerationResult {
  patchSet: DocumentPatchSet;
  response: GenerateSectionResponse;
}

interface UseAiAssistantOptions {
  activeDoc: DocumentData;
  activeEditor: TiptapEditor | null;
  currentRenderableMarkdown: string;
  documents: DocumentData[];
  getFreshRenderableMarkdown: () => Promise<string>;
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
  getFreshRenderableMarkdown,
  loadPatchSet,
}: UseAiAssistantOptions) => {
  const { t, locale } = useI18n();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [busyAction, setBusyAction] = useState<AiBusyAction>(null);
  const [summaryResult, setSummaryResult] = useState<SummarizeDocumentResponse | null>(null);
  const [lastSummaryObjective, setLastSummaryObjective] = useState<string | null>(null);
  const [comparePreview, setComparePreview] = useState<PatchPreviewResult | null>(null);
  const [updateSuggestionPreview, setUpdateSuggestionPreview] = useState<PatchPreviewResult | null>(null);
  const [procedureResult, setProcedureResult] = useState<ProcedureExtractionResult | null>(null);
  const [tocPreview, setTocPreview] = useState<TocPreviewResult | null>(null);

  const richTextAvailable = isRichTextDocument(activeDoc);
  const activeRichTextMode = (richTextAvailable ? activeDoc.mode : "markdown") as "html" | "latex" | "markdown";
  const compareCandidates = useMemo(
    () => documents.filter((document) => document.id !== activeDoc.id && isRichTextDocument(document)),
    [activeDoc.id, documents],
  );

  useEffect(() => {
    setSummaryResult(null);
    setLastSummaryObjective(null);
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

  const resolveFreshMarkdown = useCallback(async () => {
    ensureActiveRichText();
    return getFreshRenderableMarkdown();
  }, [ensureActiveRichText, getFreshRenderableMarkdown]);

  const buildActiveNormalizedDocument = useCallback(async () => {
    const markdown = await resolveFreshMarkdown();
    const { normalizeIngestionRequest } = await import("@/lib/ingestion/normalizeIngestionRequest");

    return normalizeIngestionRequest({
      fileName: `${activeDoc.name}.${getDocumentExtension(activeDoc.mode)}`,
      importedAt: activeDoc.updatedAt,
      ingestionId: activeDoc.id,
      rawContent: markdown,
      sourceFormat: "markdown",
    });
  }, [activeDoc.id, activeDoc.mode, activeDoc.name, activeDoc.updatedAt, resolveFreshMarkdown]);

  const captureAiScreenshot = useCallback(async (markdown: string) => {
    try {
      return await captureWorkspaceScreenshot({
        documentName: activeDoc.name,
        markdown,
        mode: activeDoc.mode,
      });
    } catch {
      return undefined;
    }
  }, [activeDoc.mode, activeDoc.name]);

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
    setBusyAction("summarize");

    try {
      const { summarizeDocument } = await import("@/lib/ai/assistantClient");
      const markdown = await resolveFreshMarkdown();
      const screenshot = await captureAiScreenshot(markdown);
      const result = await summarizeDocument({
        document: {
          documentId: activeDoc.id,
          fileName: activeDoc.name,
          markdown,
          mode: activeRichTextMode,
        },
        objective,
        locale,
        screenshot,
      });

      setLastSummaryObjective(objective.trim());
      setSummaryResult(result);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : t("hooks.ai.summarizeFailed");
      toast.error(message);
      throw error;
    } finally {
      setBusyAction((current) => (current === "summarize" ? null : current));
    }
  }, [activeDoc.id, activeDoc.mode, activeDoc.name, captureAiScreenshot, locale, resolveFreshMarkdown, t]);

  const generateSectionPatch = useCallback(async (prompt: string) => {
    setBusyAction("generate-section");

    try {
      const [
        { buildSectionGenerationPatchSet },
        { generateSection },
      ] = await Promise.all([
        import("@/lib/ai/sectionGeneration"),
        import("@/lib/ai/assistantClient"),
      ]);
      const sourceAst = await buildSourceAst();
      const headings = buildDerivedDocumentIndex(sourceAst).headings;
      const lastBlock = sourceAst.blocks.at(-1);
      const markdown = await resolveFreshMarkdown();
      const screenshot = await captureAiScreenshot(markdown);

      if (!lastBlock) {
        throw new Error(t("hooks.ai.emptyInsert"));
      }

      const generated = await generateSection({
        document: {
          documentId: activeDoc.id,
          fileName: activeDoc.name,
          markdown,
          mode: activeRichTextMode,
        },
        existingHeadings: headings.map((heading) => ({
          level: heading.level,
          nodeId: heading.nodeId,
          text: heading.text,
        })),
        prompt,
        locale,
        screenshot,
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
      return {
        patchSet,
        response: generated,
      } satisfies SectionGenerationResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : t("hooks.ai.generateFailed");
      toast.error(message);
      throw error;
    } finally {
      setBusyAction((current) => (current === "generate-section" ? null : current));
    }
  }, [activeDoc.id, activeDoc.mode, activeDoc.name, buildSourceAst, captureAiScreenshot, locale, loadPatchSet, resolveFreshMarkdown, t]);

  const generateTocSuggestion = useCallback(async () => {
    setBusyAction("generate-toc");

    try {
      const [
        { generateToc },
        { analyzeTocSuggestion, buildTocPatchSetWithAst },
      ] = await Promise.all([
        import("@/lib/ai/assistantClient"),
        import("@/lib/ai/tocGeneration"),
      ]);
      const sourceAst = await buildSourceAst();
      const headings = buildDerivedDocumentIndex(sourceAst).headings;
      const markdown = await resolveFreshMarkdown();
      const screenshot = await captureAiScreenshot(markdown);
      const result = await generateToc({
        document: {
          documentId: activeDoc.id,
          fileName: activeDoc.name,
          markdown,
          mode: activeRichTextMode,
        },
        existingHeadings: headings.map((heading) => ({
          level: heading.level,
          nodeId: heading.nodeId,
          text: heading.text,
        })),
        locale,
        screenshot,
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
        matchedCount: analysis.matchedCount,
        patchCount: patchSet.patches.length,
        patchSet: patchSet.patches.length > 0 ? patchSet : null,
        patchSetTitle: patchSet.title,
        promotedCount: analysis.promotedCount,
        rationale: result.rationale,
        skippedEntries: analysis.skippedEntries,
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
  }, [activeDoc.id, activeDoc.mode, activeDoc.name, buildSourceAst, captureAiScreenshot, locale, resolveFreshMarkdown, t]);

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
          matchedCount: analysis.matchedCount,
          patchCount: 0,
          patchSet: null,
          promotedCount: analysis.promotedCount,
          skippedEntries: analysis.skippedEntries,
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
        patchSet,
        matchedCount: analysis.matchedCount,
        promotedCount: analysis.promotedCount,
        skippedEntries: analysis.skippedEntries,
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
    setBusyAction("suggest-updates");

    try {
      const [{ proposeEditorAction }, { suggestDocumentUpdates }] = await Promise.all([
        import("@/lib/ai/assistantClient"),
        import("@/lib/ai/suggestDocumentUpdates"),
      ]);
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
      let actionProposal: ProposeEditorActionResponse | null = null;

      try {
        const headings = buildDerivedDocumentIndex(sourceAst).headings;
        const markdown = await resolveFreshMarkdown();
        const screenshot = await captureAiScreenshot(markdown);
        actionProposal = await proposeEditorAction({
          candidatePatchCount: result.patchBuild.patchSet.patches.length,
          document: {
            documentId: activeDoc.id,
            fileName: activeDoc.name,
            markdown,
            mode: activeRichTextMode,
          },
          existingHeadings: headings.map((heading) => ({
            level: heading.level,
            nodeId: heading.nodeId,
            text: heading.text,
          })),
          intent: "review_patch_suggestion",
          issueSummary: context?.issueReason,
          locale,
          screenshot,
          targetDocumentId: targetDocument.id,
          targetDocumentName: targetDocument.name,
        });
      } catch {
        actionProposal = null;
      }

      const nextPreview = {
        actionProposal,
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
    activeDoc.mode,
    buildActiveNormalizedDocument,
    buildSourceAst,
    buildTargetNormalizedDocument,
    captureAiScreenshot,
    ensureActiveRichText,
    locale,
    loadPatchSet,
    resolveFreshMarkdown,
    t,
  ]);

  const extractProcedureFromActiveDocument = useCallback(async () => {
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
  }, [buildActiveNormalizedDocument, t]);

  return {
    assistantOpen,
    busyAction,
    compareCandidates,
    comparePreview,
    compareWithDocument,
    extractProcedureFromActiveDocument,
    generateSectionPatch,
    generateTocSuggestion,
    lastSummaryObjective,
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
