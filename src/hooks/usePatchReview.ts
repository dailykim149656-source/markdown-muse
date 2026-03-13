import { useCallback, useEffect, useMemo, useState } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { toast } from "sonner";
import { applyDocumentPatchSet } from "@/lib/ast/applyDocumentPatch";
import { serializeTiptapToAst } from "@/lib/ast/tiptapAst";
import { renderAstToHtml } from "@/lib/ast/renderAstToHtml";
import { renderAstToLatex } from "@/lib/ast/renderAstToLatex";
import { renderAstToMarkdown } from "@/lib/ast/renderAstToMarkdown";
import { validateDocumentAst } from "@/lib/ast/validateDocumentAst";
import { useI18n } from "@/i18n/useI18n";
import { applyPatchDecision } from "@/lib/patches/reviewPatchSet";
import type { DocumentData, DocumentVersionSnapshotMetadata } from "@/types/document";
import type { DocumentPatch, DocumentPatchSet } from "@/types/documentPatch";

interface UsePatchReviewOptions {
  activeDoc: DocumentData;
  activeEditor: TiptapEditor | null;
  bumpEditorKey: () => void;
  onWorkspaceSync?: (document: DocumentData) => Promise<{ warnings?: string[] } | null | void> | { warnings?: string[] } | null | void;
  onVersionSnapshot?: (document: DocumentData, metadata?: DocumentVersionSnapshotMetadata) => Promise<unknown> | unknown;
  setLiveEditorHtml: (html: string) => void;
  updateActiveDoc: (patch: Partial<DocumentData>) => void;
}

const getContentForMode = (mode: DocumentData["mode"], html: string, markdown: string, latex: string) => {
  switch (mode) {
    case "markdown":
      return markdown;
    case "html":
      return html;
    case "latex":
      return latex;
    default:
      return "";
  }
};

const isStructuredPatchSet = (patchSet: DocumentPatchSet) =>
  patchSet.patches.every((patch) => patch.target.targetType === "structured_path");

export const usePatchReview = ({
  activeDoc,
  activeEditor,
  bumpEditorKey,
  onWorkspaceSync,
  onVersionSnapshot,
  setLiveEditorHtml,
  updateActiveDoc,
}: UsePatchReviewOptions) => {
  const { t } = useI18n();
  const [patchReviewOpen, setPatchReviewOpen] = useState(false);
  const [patchSet, setPatchSet] = useState<DocumentPatchSet | null>(null);

  const patchCount = patchSet?.patches.length ?? 0;
  const acceptedPatchCount = useMemo(
    () => patchSet?.patches.filter((patch) => patch.status === "accepted" || patch.status === "edited").length ?? 0,
    [patchSet],
  );

  useEffect(() => {
    setPatchSet(null);
    setPatchReviewOpen(false);
  }, [activeDoc.id]);

  const openPatchReview = useCallback(() => {
    setPatchReviewOpen(true);
  }, []);

  const closePatchReview = useCallback(() => {
    setPatchReviewOpen(false);
  }, []);

  const clearPatchSet = useCallback(() => {
    setPatchSet(null);
  }, []);

  const loadPatchSet = useCallback((nextPatchSet: DocumentPatchSet) => {
    if ((activeDoc.mode === "json" || activeDoc.mode === "yaml") && !isStructuredPatchSet(nextPatchSet)) {
      toast.error(t("hooks.patchReview.structuredOnly"));
      return;
    }

    if ((activeDoc.mode === "markdown" || activeDoc.mode === "latex" || activeDoc.mode === "html") && isStructuredPatchSet(nextPatchSet)) {
      toast.error(t("hooks.patchReview.richTextOnly"));
      return;
    }

    setPatchSet(nextPatchSet);
    setPatchReviewOpen(true);

    if (nextPatchSet.documentId !== activeDoc.id) {
      toast.warning(t("hooks.patchReview.documentMismatch"));
    }

    toast.success(t("hooks.patchReview.patchLoaded", { title: nextPatchSet.title }));
  }, [activeDoc.id, activeDoc.mode, t]);

  const handlePatchDecision = useCallback((
    patch: DocumentPatch,
    decision: "accepted" | "rejected" | "edited",
    editedSuggestedText?: string,
  ) => {
    setPatchSet((currentPatchSet) => {
      if (!currentPatchSet) {
        return currentPatchSet;
      }

      const result = applyPatchDecision(currentPatchSet, {
        decision,
        decidedAt: Date.now(),
        editedSuggestedText,
        patchId: patch.patchId,
      });

      if (result.warnings.length > 0) {
        toast.warning(result.warnings[0]?.message || t("hooks.patchReview.decisionWarning"));
      }

      return result.patchSet;
    });
  }, [t]);

  const applyReviewedPatches = useCallback(async () => {
    if (!patchSet) {
      toast.info(t("hooks.patchReview.loadFirst"));
      return;
    }

    if (activeDoc.mode === "json" || activeDoc.mode === "yaml") {
      if (!isStructuredPatchSet(patchSet)) {
        toast.error(t("hooks.patchReview.structuredOnly"));
        return;
      }

      let structuredDocument: unknown;

      try {
        const { parseStructuredPatchDocument } = await import("@/lib/patches/applyStructuredPatchSet");
        structuredDocument = parseStructuredPatchDocument(activeDoc.content, activeDoc.mode);
      } catch (error) {
        const message = error instanceof Error ? error.message : t("hooks.patchReview.structuredParseFailed");
        toast.error(message);
        return;
      }

      const { applyStructuredPatchSet, serializeStructuredContent } = await import("@/lib/patches/applyStructuredPatchSet");
      const result = applyStructuredPatchSet(structuredDocument, patchSet);

      if (result.appliedPatchIds.length === 0 && result.failures.length === 0) {
        toast.info(t("hooks.patchReview.nothingToApply"));
        return;
      }

      if (result.appliedPatchIds.length > 0) {
        const nextContent = serializeStructuredContent(result.value, activeDoc.mode);
        const nextDocument: DocumentData = {
          ...activeDoc,
          content: nextContent,
          sourceSnapshots: {
            ...(activeDoc.sourceSnapshots || {}),
            [activeDoc.mode]: nextContent,
          },
          tiptapJson: null,
          updatedAt: Date.now(),
        };

        updateActiveDoc({
          content: nextContent,
        });
        bumpEditorKey();
        void onVersionSnapshot?.(nextDocument, {
          patchCount: result.appliedPatchIds.length,
          patchSetTitle: patchSet.title,
        });

        try {
          const syncResult = await onWorkspaceSync?.(nextDocument);

          if (syncResult?.warnings?.length) {
            toast.warning(syncResult.warnings[0]);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Workspace sync failed after local apply.";
          toast.warning(message);
        }
      }

      if (result.warnings.length > 0) {
        toast.warning(result.warnings[0] || t("hooks.patchReview.appliedWithWarnings"));
      }

      if (result.failures.length > 0) {
        toast.warning(t("hooks.patchReview.appliedWithFailures", {
          applied: result.appliedPatchIds.length,
          failed: result.failures.length,
        }));
        return;
      }

      setPatchSet((currentPatchSet) => currentPatchSet ? { ...currentPatchSet, status: "completed" } : currentPatchSet);
      setPatchReviewOpen(false);
      toast.success(t("hooks.patchReview.appliedSuccess", { count: result.appliedPatchIds.length }));
      return;
    }

    if (!activeEditor) {
      toast.error(t("hooks.patchReview.editorNotReady"));
      return;
    }

    let documentAst;

    try {
      documentAst = serializeTiptapToAst(activeEditor.getJSON(), {
        documentNodeId: `doc-${activeDoc.id}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("hooks.patchReview.serializeFailed");
      toast.error(message);
      return;
    }

    const sourceValidation = validateDocumentAst(documentAst);

    if (sourceValidation.errors.length > 0) {
      toast.error(t("hooks.patchReview.invalidAst", { message: sourceValidation.errors[0]?.message || "" }));
      return;
    }

    const result = applyDocumentPatchSet(documentAst, patchSet);

    if (result.appliedPatchIds.length === 0 && result.failures.length === 0) {
      toast.info(t("hooks.patchReview.nothingToApply"));
      return;
    }

    if (result.appliedPatchIds.length > 0) {
      const nextHtml = renderAstToHtml(result.document);
      const nextLatex = renderAstToLatex(result.document, { includeWrapper: false });
      const nextMarkdown = renderAstToMarkdown(result.document);
      const nextContent = getContentForMode(activeDoc.mode, nextHtml, nextMarkdown, nextLatex);
      const nextUpdatedAt = Date.now();
      const nextDocument: DocumentData = {
        ...activeDoc,
        ast: result.document,
        content: nextContent,
        sourceSnapshots: {
          ...(activeDoc.sourceSnapshots || {}),
          html: nextHtml,
          latex: nextLatex,
          markdown: nextMarkdown,
          [activeDoc.mode]: nextContent,
        },
        tiptapJson: null,
        updatedAt: nextUpdatedAt,
      };

      updateActiveDoc({
        ast: nextDocument.ast,
        content: nextDocument.content,
        sourceSnapshots: nextDocument.sourceSnapshots,
        storageKind: nextDocument.storageKind,
        tiptapJson: nextDocument.tiptapJson,
        updatedAt: nextDocument.updatedAt,
      });
      setLiveEditorHtml(nextHtml);
      bumpEditorKey();
      void onVersionSnapshot?.(nextDocument, {
        patchCount: result.appliedPatchIds.length,
        patchSetTitle: patchSet.title,
      });

      try {
        const syncResult = await onWorkspaceSync?.(nextDocument);

        if (syncResult?.warnings?.length) {
          toast.warning(syncResult.warnings[0]);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Workspace sync failed after local apply.";
        toast.warning(message);
      }
    }

    if (result.warnings.length > 0) {
      toast.warning(result.warnings[0] || t("hooks.patchReview.appliedWithWarnings"));
    }

    if (result.failures.length > 0) {
      toast.warning(t("hooks.patchReview.appliedWithFailures", {
        applied: result.appliedPatchIds.length,
        failed: result.failures.length,
      }));
      return;
    }

    setPatchSet((currentPatchSet) => currentPatchSet ? { ...currentPatchSet, status: "completed" } : currentPatchSet);
    setPatchReviewOpen(false);
    toast.success(t("hooks.patchReview.appliedSuccess", { count: result.appliedPatchIds.length }));
  }, [activeDoc, activeDoc.content, activeDoc.id, activeDoc.mode, activeEditor, bumpEditorKey, onVersionSnapshot, onWorkspaceSync, patchSet, setLiveEditorHtml, t, updateActiveDoc]);

  return {
    acceptedPatchCount,
    applyReviewedPatches,
    clearPatchSet,
    closePatchReview,
    handleAcceptPatch: (patch: DocumentPatch) => handlePatchDecision(patch, "accepted"),
    handleEditPatch: (patch: DocumentPatch, suggestedText: string) => handlePatchDecision(patch, "edited", suggestedText),
    handleRejectPatch: (patch: DocumentPatch) => handlePatchDecision(patch, "rejected"),
    loadPatchSet,
    openPatchReview,
    patchCount,
    patchReviewOpen,
    patchSet,
    setPatchReviewOpen,
  };
};
