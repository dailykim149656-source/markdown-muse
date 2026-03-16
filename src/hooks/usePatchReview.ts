import { useCallback, useEffect, useMemo, useState } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/useI18n";
import { importLatexToDocsy } from "@/lib/latex/importLatexToDocsy";
import { applyPatchDecision, applyPatchDecisions } from "@/lib/patches/reviewPatchSet";
import type { DocumentData, DocumentVersionSnapshotMetadata } from "@/types/document";
import type { DocumentPatch, DocumentPatchSet, PatchApplyReport } from "@/types/documentPatch";

interface UsePatchReviewOptions {
  activeDoc: DocumentData;
  activeEditor: TiptapEditor | null;
  bumpEditorKey: () => void;
  onWorkspaceSync?: (document: DocumentData) => Promise<{ warnings?: string[] } | null | void> | { warnings?: string[] } | null | void;
  onVersionSnapshot?: (document: DocumentData, metadata?: DocumentVersionSnapshotMetadata) => Promise<unknown> | unknown;
  setLiveEditorHtml: (html: string) => void;
  updateActiveDoc: (patch: Partial<DocumentData>) => void;
}

interface PendingWorkspaceSyncState {
  appliedPatchIds: string[];
  document: DocumentData;
  patchSet: DocumentPatchSet;
  phase: PatchApplyReport["phase"];
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

const isDocumentTextPatchSet = (patchSet: DocumentPatchSet) =>
  patchSet.patches.every((patch) => patch.target.targetType === "document_text");

const loadDocumentTextPatchSet = () => import("@/lib/patches/applyDocumentTextPatchSet");
const loadRichTextPatchModules = async () => {
  const [
    { applyDocumentPatchSet },
    { serializeTiptapToAst },
    { renderAstToHtml },
    { renderAstToLatex },
    { renderAstToMarkdown },
    { validateDocumentAst },
  ] = await Promise.all([
    import("@/lib/ast/applyDocumentPatch"),
    import("@/lib/ast/tiptapAst"),
    import("@/lib/ast/renderAstToHtml"),
    import("@/lib/ast/renderAstToLatex"),
    import("@/lib/ast/renderAstToMarkdown"),
    import("@/lib/ast/validateDocumentAst"),
  ]);

  return {
    applyDocumentPatchSet,
    renderAstToHtml,
    renderAstToLatex,
    renderAstToMarkdown,
    serializeTiptapToAst,
    validateDocumentAst,
  };
};

const getPatchTitle = (patchSet: DocumentPatchSet | null, patchId?: string) =>
  patchId ? patchSet?.patches.find((patch) => patch.patchId === patchId)?.title : undefined;

const getWorkspaceSyncWarnings = (syncResult: { warnings?: string[] } | null | void) =>
  syncResult && typeof syncResult === "object" && "warnings" in syncResult
    ? syncResult.warnings || []
    : [];

const createApplyReport = ({
  appliedPatchIds,
  failures,
  patchSet,
  phase,
  scope,
  warnings,
}: {
  appliedPatchIds: string[];
  failures: Array<{ message: string; patchId?: string }>;
  patchSet: DocumentPatchSet | null;
  phase: PatchApplyReport["phase"];
  scope: PatchApplyReport["scope"];
  warnings: string[];
}): PatchApplyReport => ({
  appliedPatchIds,
  attemptedAt: Date.now(),
  failures: failures.map((failure) => ({
    message: failure.message,
    patchId: failure.patchId,
    patchTitle: getPatchTitle(patchSet, failure.patchId),
  })),
  phase,
  scope,
  warnings: [...warnings],
});

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
  const [lastApplyReport, setLastApplyReport] = useState<PatchApplyReport | null>(null);
  const [pendingWorkspaceSync, setPendingWorkspaceSync] = useState<PendingWorkspaceSyncState | null>(null);
  const [patchSet, setPatchSet] = useState<DocumentPatchSet | null>(null);

  const patchCount = patchSet?.patches.length ?? 0;
  const acceptedPatchCount = useMemo(
    () => patchSet?.patches.filter((patch) => patch.status === "accepted" || patch.status === "edited").length ?? 0,
    [patchSet],
  );

  useEffect(() => {
    setPatchSet(null);
    setPatchReviewOpen(false);
    setLastApplyReport(null);
    setPendingWorkspaceSync(null);
  }, [activeDoc.id]);

  const openPatchReview = useCallback(() => {
    setPatchReviewOpen(true);
  }, []);

  const closePatchReview = useCallback(() => {
    setPatchReviewOpen(false);
  }, []);

  const clearPatchSet = useCallback(() => {
    setPatchSet(null);
    setLastApplyReport(null);
    setPendingWorkspaceSync(null);
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

    setLastApplyReport(null);
    setPendingWorkspaceSync(null);
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

  const handlePatchDecisions = useCallback((
    decisions: Array<{
      decision: "accepted" | "rejected" | "edited";
      editedSuggestedText?: string;
      patchId: string;
    }>,
  ) => {
    if (decisions.length === 0) {
      return;
    }

    setPatchSet((currentPatchSet) => {
      if (!currentPatchSet) {
        return currentPatchSet;
      }

      const result = applyPatchDecisions(currentPatchSet, decisions.map((decision) => ({
        ...decision,
        decidedAt: Date.now(),
      })));

      if (result.warnings.length > 0) {
        toast.warning(result.warnings[0]?.message || t("hooks.patchReview.decisionWarning"));
      }

      return result.patchSet;
    });
  }, [t]);

  const handleAcceptPatches = useCallback((patchIds: string[]) => {
    if (patchIds.length === 0) {
      return;
    }

    setPatchSet((currentPatchSet) => {
      if (!currentPatchSet) {
        return currentPatchSet;
      }

      const decisions: Array<{
        decision: "accepted" | "edited";
        editedSuggestedText?: string;
        patchId: string;
      }> = [];

      patchIds.forEach((patchId) => {
        const patch = currentPatchSet.patches.find((candidatePatch) => candidatePatch.patchId === patchId);

        if (!patch) {
          return;
        }

        if (patch.status === "edited") {
          decisions.push({
            decision: "edited" as const,
            editedSuggestedText: patch.suggestedText,
            patchId,
          });
          return;
        }

        decisions.push({
          decision: "accepted" as const,
          patchId,
        });
      });

      if (decisions.length === 0) {
        return currentPatchSet;
      }

      const result = applyPatchDecisions(currentPatchSet, decisions.map((decision) => ({
        ...decision,
        decidedAt: Date.now(),
      })));

      if (result.warnings.length > 0) {
        toast.warning(result.warnings[0]?.message || t("hooks.patchReview.decisionWarning"));
      }

      return result.patchSet;
    });
  }, [t]);

  const handleRejectPatches = useCallback((patchIds: string[]) => {
    if (patchIds.length === 0) {
      return;
    }

    handlePatchDecisions(patchIds.map((patchId) => ({
      decision: "rejected" as const,
      patchId,
    })));
  }, [handlePatchDecisions]);

  const applyPreparedPatchSet = useCallback(async (patchSetToApply: DocumentPatchSet) => {
    setLastApplyReport(null);

    const recordPreflightFailure = (phase: PatchApplyReport["phase"], message: string) => {
      setLastApplyReport(createApplyReport({
        appliedPatchIds: [],
        failures: [{ message }],
        patchSet: patchSetToApply,
        phase,
        scope: "preflight",
        warnings: [],
      }));
    };

    const recordApplyFailure = (
      phase: PatchApplyReport["phase"],
      result: {
        appliedPatchIds: string[];
        failures: Array<{ message: string; patchId?: string }>;
        warnings: string[];
      },
    ) => {
      if (result.failures.length === 0) {
        return;
      }

      setLastApplyReport(createApplyReport({
        appliedPatchIds: result.appliedPatchIds,
        failures: result.failures,
        patchSet: patchSetToApply,
        phase,
        scope: "apply",
        warnings: result.warnings,
      }));
    };

    const recordSyncFailure = (
      phase: PatchApplyReport["phase"],
      nextDocument: DocumentData,
      appliedPatchIds: string[],
      message: string,
    ) => {
      setPatchReviewOpen(true);
      setPendingWorkspaceSync({
        appliedPatchIds,
        document: nextDocument,
        patchSet: patchSetToApply,
        phase,
      });
      setLastApplyReport(createApplyReport({
        appliedPatchIds,
        failures: [{ message }],
        patchSet: patchSetToApply,
        phase,
        scope: "sync",
        warnings: [],
      }));
    };

    const finalizeSuccessfulApply = (appliedPatchIds: string[], syncWarnings: string[]) => {
      setPendingWorkspaceSync(null);
      setPatchSet((currentPatchSet) => currentPatchSet ? { ...currentPatchSet, status: "completed" } : currentPatchSet);

      if (syncWarnings.length > 0) {
        setPatchReviewOpen(true);
        toast.warning(syncWarnings[0] || t("hooks.patchReview.appliedWithWarnings"));
        return true;
      }

      setPatchReviewOpen(false);
      toast.success(t("hooks.patchReview.appliedSuccess", { count: appliedPatchIds.length }));
      return true;
    };

    if (activeDoc.mode === "json" || activeDoc.mode === "yaml") {
      if (!isStructuredPatchSet(patchSetToApply)) {
        const message = t("hooks.patchReview.structuredOnly");
        toast.error(message);
        recordPreflightFailure("structured", message);
        return false;
      }

      let structuredDocument: unknown;

      try {
        const { parseStructuredPatchDocument } = await import("@/lib/patches/applyStructuredPatchSet");
        structuredDocument = parseStructuredPatchDocument(activeDoc.content, activeDoc.mode);
      } catch (error) {
        const message = error instanceof Error ? error.message : t("hooks.patchReview.structuredParseFailed");
        toast.error(message);
        recordPreflightFailure("structured", message);
        return false;
      }

      const { applyStructuredPatchSet, serializeStructuredContent } = await import("@/lib/patches/applyStructuredPatchSet");
      const result = applyStructuredPatchSet(structuredDocument, patchSetToApply);

      if (result.appliedPatchIds.length === 0 && result.failures.length === 0) {
        toast.info(t("hooks.patchReview.nothingToApply"));
        return false;
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
          patchSetTitle: patchSetToApply.title,
        });

        let syncWarnings: string[] = [];

        try {
          const syncResult = await onWorkspaceSync?.(nextDocument);
          syncWarnings = getWorkspaceSyncWarnings(syncResult);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Workspace sync failed after local apply.";
          recordSyncFailure("structured", nextDocument, result.appliedPatchIds, message);
          toast.warning(message);
          return false;
        }

        if (result.failures.length > 0) {
          if (result.warnings.length > 0) {
            toast.warning(result.warnings[0] || t("hooks.patchReview.appliedWithWarnings"));
          }
          recordApplyFailure("structured", result);
          toast.warning(t("hooks.patchReview.appliedWithFailures", {
            applied: result.appliedPatchIds.length,
            failed: result.failures.length,
          }));
          return false;
        }

        if (result.warnings.length > 0) {
          toast.warning(result.warnings[0] || t("hooks.patchReview.appliedWithWarnings"));
        }

        return finalizeSuccessfulApply(result.appliedPatchIds, syncWarnings);
      }

      if (result.warnings.length > 0) {
        toast.warning(result.warnings[0] || t("hooks.patchReview.appliedWithWarnings"));
      }

      if (result.failures.length > 0) {
        recordApplyFailure("structured", result);
        toast.warning(t("hooks.patchReview.appliedWithFailures", {
          applied: result.appliedPatchIds.length,
          failed: result.failures.length,
        }));
        return false;
      }

      return false;
    }

    if (isDocumentTextPatchSet(patchSetToApply)) {
      const { applyDocumentTextPatchSet } = await loadDocumentTextPatchSet();
      const result = applyDocumentTextPatchSet(activeDoc.content, patchSetToApply);

      if (result.appliedPatchIds.length === 0 && result.failures.length === 0) {
        toast.info(t("hooks.patchReview.nothingToApply"));
        return false;
      }

      if (result.appliedPatchIds.length > 0) {
        const nextContent = result.value;
        const imported = activeDoc.mode === "latex" ? importLatexToDocsy(nextContent) : null;
        const nextHtml = imported?.html || activeDoc.sourceSnapshots?.html || "";
        const nextDocument: DocumentData = {
          ...activeDoc,
          content: nextContent,
          sourceSnapshots: {
            ...(activeDoc.sourceSnapshots || {}),
            ...(activeDoc.mode === "latex"
              ? {
                html: nextHtml,
                latex: nextContent,
              }
              : {}),
            [activeDoc.mode]: nextContent,
          },
          tiptapJson: null,
          updatedAt: Date.now(),
        };

        updateActiveDoc({
          content: nextDocument.content,
          sourceSnapshots: nextDocument.sourceSnapshots,
          tiptapJson: nextDocument.tiptapJson,
          updatedAt: nextDocument.updatedAt,
        });
        setLiveEditorHtml(nextHtml);
        bumpEditorKey();
        void onVersionSnapshot?.(nextDocument, {
          patchCount: result.appliedPatchIds.length,
          patchSetTitle: patchSetToApply.title,
        });

        let syncWarnings: string[] = [];

        try {
          const syncResult = await onWorkspaceSync?.(nextDocument);
          syncWarnings = getWorkspaceSyncWarnings(syncResult);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Workspace sync failed after local apply.";
          recordSyncFailure("document_text", nextDocument, result.appliedPatchIds, message);
          toast.warning(message);
          return false;
        }

        if (result.failures.length > 0) {
          if (result.warnings.length > 0) {
            toast.warning(result.warnings[0] || t("hooks.patchReview.appliedWithWarnings"));
          }
          recordApplyFailure("document_text", result);
          toast.warning(t("hooks.patchReview.appliedWithFailures", {
            applied: result.appliedPatchIds.length,
            failed: result.failures.length,
          }));
          return false;
        }

        if (result.warnings.length > 0) {
          toast.warning(result.warnings[0] || t("hooks.patchReview.appliedWithWarnings"));
        }

        return finalizeSuccessfulApply(result.appliedPatchIds, syncWarnings);
      }

      if (result.warnings.length > 0) {
        toast.warning(result.warnings[0] || t("hooks.patchReview.appliedWithWarnings"));
      }

      if (result.failures.length > 0) {
        recordApplyFailure("document_text", result);
        toast.warning(t("hooks.patchReview.appliedWithFailures", {
          applied: result.appliedPatchIds.length,
          failed: result.failures.length,
        }));
        return false;
      }

      return false;
    }

    if (!activeEditor) {
      const message = t("hooks.patchReview.editorNotReady");
      toast.error(message);
      recordPreflightFailure("rich_text", message);
      return false;
    }

    const {
      applyDocumentPatchSet,
      renderAstToHtml,
      renderAstToLatex,
      renderAstToMarkdown,
      serializeTiptapToAst,
      validateDocumentAst,
    } = await loadRichTextPatchModules();
    let documentAst;

    try {
      documentAst = serializeTiptapToAst(activeEditor.getJSON(), {
        documentNodeId: `doc-${activeDoc.id}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("hooks.patchReview.serializeFailed");
      toast.error(message);
      recordPreflightFailure("rich_text", message);
      return false;
    }

    const sourceValidation = validateDocumentAst(documentAst);

    if (sourceValidation.errors.length > 0) {
      const message = t("hooks.patchReview.invalidAst", { message: sourceValidation.errors[0]?.message || "" });
      toast.error(message);
      recordPreflightFailure("rich_text", message);
      return false;
    }

    const result = applyDocumentPatchSet(documentAst, patchSetToApply);

    if (result.appliedPatchIds.length === 0 && result.failures.length === 0) {
      toast.info(t("hooks.patchReview.nothingToApply"));
      return false;
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
        patchSetTitle: patchSetToApply.title,
      });

      let syncWarnings: string[] = [];

      try {
        const syncResult = await onWorkspaceSync?.(nextDocument);
        syncWarnings = getWorkspaceSyncWarnings(syncResult);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Workspace sync failed after local apply.";
        recordSyncFailure("rich_text", nextDocument, result.appliedPatchIds, message);
        toast.warning(message);
        return false;
      }

      if (result.failures.length > 0) {
        if (result.warnings.length > 0) {
          toast.warning(result.warnings[0] || t("hooks.patchReview.appliedWithWarnings"));
        }
        recordApplyFailure("rich_text", result);
        toast.warning(t("hooks.patchReview.appliedWithFailures", {
          applied: result.appliedPatchIds.length,
          failed: result.failures.length,
        }));
        return false;
      }

      if (result.warnings.length > 0) {
        toast.warning(result.warnings[0] || t("hooks.patchReview.appliedWithWarnings"));
      }

      return finalizeSuccessfulApply(result.appliedPatchIds, syncWarnings);
    }

    if (result.warnings.length > 0) {
      toast.warning(result.warnings[0] || t("hooks.patchReview.appliedWithWarnings"));
    }

    if (result.failures.length > 0) {
      recordApplyFailure("rich_text", result);
      toast.warning(t("hooks.patchReview.appliedWithFailures", {
        applied: result.appliedPatchIds.length,
        failed: result.failures.length,
      }));
      return false;
    }

    return false;
  }, [
    activeDoc,
    activeDoc.content,
    activeDoc.id,
    activeDoc.mode,
    activeEditor,
    bumpEditorKey,
    onVersionSnapshot,
    onWorkspaceSync,
    setLiveEditorHtml,
    t,
    updateActiveDoc,
  ]);

  const applyReviewedPatches = useCallback(async () => {
    if (!patchSet) {
      toast.info(t("hooks.patchReview.loadFirst"));
      return false;
    }

    return applyPreparedPatchSet(patchSet);
  }, [applyPreparedPatchSet, patchSet, t]);

  const autoApplyPatchSet = useCallback(async (nextPatchSet: DocumentPatchSet) => {
    const acceptanceResult = applyPatchDecisions(
      nextPatchSet,
      nextPatchSet.patches.map((patch) => ({
        decidedAt: Date.now(),
        decision: "accepted" as const,
        patchId: patch.patchId,
      })),
    );

    if (acceptanceResult.warnings.length > 0) {
      toast.warning(acceptanceResult.warnings[0]?.message || t("hooks.patchReview.decisionWarning"));
    }

    setPatchSet(acceptanceResult.patchSet);
    return applyPreparedPatchSet(acceptanceResult.patchSet);
  }, [applyPreparedPatchSet, t]);

  const retryWorkspaceSync = useCallback(async () => {
    if (!pendingWorkspaceSync || !onWorkspaceSync) {
      return false;
    }

    setLastApplyReport(null);

    try {
      const syncResult = await onWorkspaceSync(pendingWorkspaceSync.document);
      const syncWarnings = getWorkspaceSyncWarnings(syncResult);

      setPendingWorkspaceSync(null);
      setPatchSet((currentPatchSet) => currentPatchSet ? { ...currentPatchSet, status: "completed" } : currentPatchSet);

      if (syncWarnings.length > 0) {
        setPatchReviewOpen(true);
        toast.warning(syncWarnings[0] || t("hooks.patchReview.appliedWithWarnings"));
        return true;
      }

      setPatchReviewOpen(false);
      toast.success(t("hooks.patchReview.appliedSuccess", { count: pendingWorkspaceSync.appliedPatchIds.length }));
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Workspace sync failed after local apply.";
      setLastApplyReport(createApplyReport({
        appliedPatchIds: pendingWorkspaceSync.appliedPatchIds,
        failures: [{ message }],
        patchSet: pendingWorkspaceSync.patchSet,
        phase: pendingWorkspaceSync.phase,
        scope: "sync",
        warnings: [],
      }));
      toast.warning(message);
      return false;
    }
  }, [onWorkspaceSync, pendingWorkspaceSync, t]);

  return {
    acceptedPatchCount,
    autoApplyPatchSet,
    applyReviewedPatches,
    clearPatchSet,
    closePatchReview,
    handleAcceptPatch: (patch: DocumentPatch) => handlePatchDecision(patch, "accepted"),
    handleAcceptPatches,
    handleEditPatch: (patch: DocumentPatch, suggestedText: string) => handlePatchDecision(patch, "edited", suggestedText),
    handleRejectPatch: (patch: DocumentPatch) => handlePatchDecision(patch, "rejected"),
    handleRejectPatches,
    hasPendingWorkspaceSync: pendingWorkspaceSync !== null,
    lastApplyReport,
    loadPatchSet,
    openPatchReview,
    patchCount,
    patchReviewOpen,
    patchSet,
    retryWorkspaceSync,
    setPatchReviewOpen,
  };
};
