import { useEffect } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { usePatchReview } from "@/hooks/usePatchReview";
import { useVersionHistory } from "@/hooks/useVersionHistory";
import type {
  DocumentData,
  DocumentVersionSnapshotMetadata,
} from "@/types/document";
import type { DocumentPatch, DocumentPatchSet, PatchApplyReport } from "@/types/documentPatch";

export interface DocumentSupportRuntimeState {
  acceptedPatchCount: number;
  autoApplyPatchSet: (patchSet: DocumentPatchSet) => Promise<boolean>;
  applyReviewedPatches: () => Promise<boolean>;
  clearPatchSet: () => void;
  closePatchReview: () => void;
  hasPendingWorkspaceSync: boolean;
  handleAcceptPatch: (patch: DocumentPatch) => void;
  handleAcceptPatches: (patchIds: string[]) => void;
  handleEditPatch: (patch: DocumentPatch, suggestedText: string) => void;
  handleRejectPatch: (patch: DocumentPatch) => void;
  handleRejectPatches: (patchIds: string[]) => void;
  lastApplyReport: PatchApplyReport | null;
  loadPatchSet: (patchSet: DocumentPatchSet) => void;
  openPatchReview: () => void;
  patchCount: number;
  patchReviewOpen: boolean;
  patchSet: DocumentPatchSet | null;
  retryWorkspaceSync: () => Promise<boolean>;
  restoreVersionSnapshot: (snapshotId: string) => Promise<void>;
  versionHistoryReady: boolean;
  versionHistoryRestoring: boolean;
  versionHistorySnapshots: ReturnType<typeof useVersionHistory>["versionHistorySnapshots"];
  versionHistorySyncing: boolean;
}

interface DocumentSupportRuntimeProps {
  activeDoc: DocumentData;
  activeEditor: TiptapEditor | null;
  bumpEditorKey: () => void;
  historyEnabled: boolean;
  onStateChange: (state: DocumentSupportRuntimeState | null) => void;
  onVersionSnapshot: (document: DocumentData, metadata?: DocumentVersionSnapshotMetadata) => Promise<unknown> | unknown;
  onWorkspaceSync?: (document: DocumentData) => Promise<{ warnings?: string[] } | null | void> | { warnings?: string[] } | null | void;
  setLiveEditorHtml: (html: string) => void;
  updateActiveDoc: (patch: Partial<DocumentData>) => void;
}

const DocumentSupportRuntime = ({
  activeDoc,
  activeEditor,
  bumpEditorKey,
  historyEnabled,
  onStateChange,
  onVersionSnapshot,
  onWorkspaceSync,
  setLiveEditorHtml,
  updateActiveDoc,
}: DocumentSupportRuntimeProps) => {
  const patchReview = usePatchReview({
    activeDoc,
    activeEditor,
    bumpEditorKey,
    onWorkspaceSync,
    onVersionSnapshot,
    setLiveEditorHtml,
    updateActiveDoc,
  });
  const versionHistory = useVersionHistory({
    activeDoc,
    bumpEditorKey,
    enabled: historyEnabled,
    updateActiveDoc,
  });

  useEffect(() => {
    onStateChange({
      acceptedPatchCount: patchReview.acceptedPatchCount,
      autoApplyPatchSet: patchReview.autoApplyPatchSet,
      applyReviewedPatches: patchReview.applyReviewedPatches,
      clearPatchSet: patchReview.clearPatchSet,
      closePatchReview: patchReview.closePatchReview,
      hasPendingWorkspaceSync: patchReview.hasPendingWorkspaceSync,
      handleAcceptPatch: patchReview.handleAcceptPatch,
      handleAcceptPatches: patchReview.handleAcceptPatches,
      handleEditPatch: patchReview.handleEditPatch,
      handleRejectPatch: patchReview.handleRejectPatch,
      handleRejectPatches: patchReview.handleRejectPatches,
      lastApplyReport: patchReview.lastApplyReport,
      loadPatchSet: patchReview.loadPatchSet,
      openPatchReview: patchReview.openPatchReview,
      patchCount: patchReview.patchCount,
      patchReviewOpen: patchReview.patchReviewOpen,
      patchSet: patchReview.patchSet,
      retryWorkspaceSync: patchReview.retryWorkspaceSync,
      restoreVersionSnapshot: versionHistory.restoreVersionSnapshot,
      versionHistoryReady: versionHistory.versionHistoryReady,
      versionHistoryRestoring: versionHistory.versionHistoryRestoring,
      versionHistorySnapshots: versionHistory.versionHistorySnapshots,
      versionHistorySyncing: versionHistory.versionHistorySyncing,
    });
  }, [
    onStateChange,
    patchReview.acceptedPatchCount,
    patchReview.autoApplyPatchSet,
    patchReview.applyReviewedPatches,
    patchReview.clearPatchSet,
    patchReview.closePatchReview,
    patchReview.hasPendingWorkspaceSync,
    patchReview.handleAcceptPatch,
    patchReview.handleAcceptPatches,
    patchReview.handleEditPatch,
    patchReview.handleRejectPatch,
    patchReview.handleRejectPatches,
    patchReview.lastApplyReport,
    patchReview.loadPatchSet,
    patchReview.openPatchReview,
    patchReview.patchCount,
    patchReview.patchReviewOpen,
    patchReview.patchSet,
    patchReview.retryWorkspaceSync,
    versionHistory.restoreVersionSnapshot,
    versionHistory.versionHistoryReady,
    versionHistory.versionHistoryRestoring,
    versionHistory.versionHistorySnapshots,
    versionHistory.versionHistorySyncing,
  ]);

  useEffect(() => () => onStateChange(null), [onStateChange]);

  return null;
};

export default DocumentSupportRuntime;
