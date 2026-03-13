import { useCallback, useState } from "react";
import { toast } from "sonner";
import { fixTexCompileError } from "@/lib/ai/client";
import { useI18n } from "@/i18n/useI18n";
import type { DocumentPatchSet, PatchSourceAttribution } from "@/types/documentPatch";
import type { TexDiagnostic, TexSourceType } from "@/types/tex";

interface UseTexAutoFixOptions {
  diagnostics: TexDiagnostic[];
  documentId: string;
  documentName: string;
  latexSource: string;
  logSummary: string;
  sourceType: TexSourceType;
}

const toSyntheticSources = (diagnostics: TexDiagnostic[]): PatchSourceAttribution[] =>
  diagnostics.map((diagnostic, index) => ({
    chunkId: diagnostic.line ? `line-${diagnostic.line}` : `diagnostic-${index + 1}`,
    excerpt: `${diagnostic.severity.toUpperCase()} ${diagnostic.stage}${diagnostic.line ? ` L${diagnostic.line}` : ""}${diagnostic.column ? `:${diagnostic.column}` : ""}: ${diagnostic.message}`,
    sectionId: diagnostic.stage,
    sourceId: `tex-diagnostic-${index + 1}`,
  }));

export const useTexAutoFix = ({
  diagnostics,
  documentId,
  documentName,
  latexSource,
  logSummary,
  sourceType,
}: UseTexAutoFixOptions) => {
  const { locale, t } = useI18n();
  const [isFixing, setIsFixing] = useState(false);

  const generatePatchSet = useCallback(async (): Promise<DocumentPatchSet> => {
    if (sourceType !== "raw-latex") {
      throw new Error(t("hooks.ai.texAutoFixRawLatexOnly"));
    }

    if (!latexSource.trim()) {
      throw new Error(t("hooks.ai.texAutoFixMissingSource"));
    }

    if (diagnostics.length === 0) {
      throw new Error(t("hooks.ai.texAutoFixNoDiagnostics"));
    }

    setIsFixing(true);

    try {
      const result = await fixTexCompileError({
        diagnostics,
        documentName,
        latex: latexSource,
        locale,
        logSummary,
        sourceType,
      });

      return {
        author: "ai",
        createdAt: Date.now(),
        description: result.rationale,
        documentId,
        patchSetId: `tex-autofix-${Date.now()}`,
        patches: [{
          author: "ai",
          confidence: 0.82,
          operation: "replace_text_range",
          originalText: latexSource,
          patchId: `tex-autofix-patch-${Date.now()}`,
          payload: {
            kind: "replace_text",
            text: result.fixedLatex,
          },
          precondition: {
            expectedText: latexSource,
          },
          reason: result.rationale,
          sources: toSyntheticSources(diagnostics),
          status: "pending",
          suggestedText: result.fixedLatex,
          summary: t("hooks.ai.texAutoFixPatchSummary"),
          target: {
            endOffset: latexSource.length,
            startOffset: 0,
            targetType: "document_text",
          },
          title: t("hooks.ai.texAutoFixPatchTitle"),
        }],
        status: "draft",
        title: t("hooks.ai.texAutoFixPatchSetTitle"),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : t("hooks.ai.texAutoFixFailed");
      toast.error(message);
      throw error;
    } finally {
      setIsFixing(false);
    }
  }, [diagnostics, documentId, documentName, latexSource, locale, logSummary, sourceType, t]);

  return {
    generatePatchSet,
    isFixing,
  };
};
