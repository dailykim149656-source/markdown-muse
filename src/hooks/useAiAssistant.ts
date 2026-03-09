import { useCallback, useMemo, useState } from "react";
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
import { buildSectionGenerationPatchSet } from "@/lib/ai/sectionGeneration";
import { normalizeIngestionRequest } from "@/lib/ingestion/normalizeIngestionRequest";
import type { DocumentData } from "@/types/document";
import type { DocumentPatchSet } from "@/types/documentPatch";
import type { SummarizeDocumentResponse } from "@/types/aiAssistant";

type BusyAction = "compare" | "generate-section" | "summarize" | null;

interface ComparePreviewResult {
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

const isRichTextDocument = (document: DocumentData): document is DocumentData & { mode: "html" | "latex" | "markdown" } =>
  document.mode === "markdown" || document.mode === "latex" || document.mode === "html";

export const useAiAssistant = ({
  activeDoc,
  activeEditor,
  currentRenderableMarkdown,
  documents,
  loadPatchSet,
}: UseAiAssistantOptions) => {
  const { t } = useI18n();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [summaryResult, setSummaryResult] = useState<SummarizeDocumentResponse | null>(null);
  const [comparePreview, setComparePreview] = useState<ComparePreviewResult | null>(null);

  const richTextAvailable = isRichTextDocument(activeDoc);
  const compareCandidates = useMemo(
    () => documents.filter((document) => document.id !== activeDoc.id && isRichTextDocument(document)),
    [activeDoc.id, documents],
  );

  const ensureActiveRichText = useCallback(() => {
    if (!richTextAvailable) {
      throw new Error(t("hooks.ai.richTextOnly"));
    }

    if (!currentRenderableMarkdown.trim()) {
      throw new Error(t("hooks.ai.markdownNotReady"));
    }
  }, [currentRenderableMarkdown, richTextAvailable, t]);

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
      });

      setSummaryResult(result);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : t("hooks.ai.summarizeFailed");
      toast.error(message);
      throw error;
    } finally {
      setBusyAction((current) => current === "summarize" ? null : current);
    }
  }, [activeDoc.id, activeDoc.mode, activeDoc.name, currentRenderableMarkdown, ensureActiveRichText, t]);

  const generateSectionPatch = useCallback(async (prompt: string) => {
    ensureActiveRichText();

    if (!activeEditor) {
      throw new Error(t("hooks.ai.editorNotReady"));
    }

    setBusyAction("generate-section");

    try {
      const sourceAst = serializeTiptapToAst(activeEditor.getJSON(), {
        documentNodeId: `doc-${activeDoc.id}`,
      });
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
      setBusyAction((current) => current === "generate-section" ? null : current);
    }
  }, [activeDoc.id, activeDoc.mode, activeDoc.name, activeEditor, currentRenderableMarkdown, ensureActiveRichText, loadPatchSet, t]);

  const compareWithDocument = useCallback((targetDocumentId: string) => {
    ensureActiveRichText();

    if (!activeEditor) {
      throw new Error(t("hooks.ai.editorNotReady"));
    }

    const targetDocument = compareCandidates.find((candidate) => candidate.id === targetDocumentId);

    if (!targetDocument) {
      throw new Error(t("hooks.ai.compareTargetMissing"));
    }

    setBusyAction("compare");

    try {
      const sourceAst = serializeTiptapToAst(activeEditor.getJSON(), {
        documentNodeId: `doc-${activeDoc.id}`,
      });
      const sourceNormalized = normalizeIngestionRequest({
        fileName: `${activeDoc.name}.md`,
        importedAt: activeDoc.updatedAt,
        ingestionId: activeDoc.id,
        rawContent: currentRenderableMarkdown,
        sourceFormat: "markdown",
      });
      const targetNormalized = normalizeIngestionRequest({
        fileName: `${targetDocument.name}.${targetDocument.mode === "markdown" ? "md" : targetDocument.mode === "latex" ? "tex" : "html"}`,
        importedAt: targetDocument.updatedAt,
        ingestionId: targetDocument.id,
        rawContent: targetDocument.content,
        sourceFormat: targetDocument.mode,
      });
      const comparison = compareDocuments(sourceNormalized, targetNormalized);
      const patchBuild = buildComparisonPatchSet(comparison, sourceAst, targetNormalized, {
        documentId: activeDoc.id,
        patchSetId: `compare-${activeDoc.id}-${targetDocument.id}-${Date.now()}`,
        title: t("hooks.ai.compareTitle", { source: activeDoc.name, target: targetDocument.name }),
      });

      setComparePreview({
        comparison,
        patchCount: patchBuild.patchSet.patches.length,
        patchSetTitle: patchBuild.patchSet.title,
        targetDocumentName: targetDocument.name,
      });

      if (patchBuild.patchSet.patches.length === 0) {
        toast.info(t("hooks.ai.noDiff"));
        return null;
      }

      loadPatchSet(patchBuild.patchSet);
      toast.success(t("hooks.ai.compareLoaded", { count: patchBuild.patchSet.patches.length }));
      return patchBuild;
    } catch (error) {
      const message = error instanceof Error ? error.message : t("hooks.ai.compareFailed");
      toast.error(message);
      throw error;
    } finally {
      setBusyAction((current) => current === "compare" ? null : current);
    }
  }, [
    activeDoc.id,
    activeDoc.name,
    activeDoc.updatedAt,
    activeEditor,
    compareCandidates,
    currentRenderableMarkdown,
    ensureActiveRichText,
    loadPatchSet,
    t,
  ]);

  return {
    assistantOpen,
    busyAction,
    compareCandidates,
    comparePreview,
    compareWithDocument,
    generateSectionPatch,
    richTextAvailable,
    setAssistantOpen,
    summarizeActiveDocument,
    summaryResult,
  };
};
