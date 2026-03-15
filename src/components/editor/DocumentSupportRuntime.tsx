import { useEffect } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { usePatchReview } from "@/hooks/usePatchReview";
import { useVersionHistory } from "@/hooks/useVersionHistory";
import type {
  DocumentData,
  DocumentVersionSnapshotMetadata,
} from "@/types/document";
import type { DocumentPatch, DocumentPatchSet } from "@/types/documentPatch";

export interface DocumentSupportRuntimeState {
  acceptedPatchCount: number;
  applyReviewedPatches: () => Promise<void>;
  clearPatchSet: () => void;
  closePatchReview: () => void;
  handleAcceptPatch: (patch: DocumentPatch) => void;
  handleEditPatch: (patch: DocumentPatch, suggestedText: string) => void;
  handleRejectPatch: (patch: DocumentPatch) => void;
  loadPatchSet: (patchSet: DocumentPatchSet) => void;
  openPatchReview: () => void;
  patchCount: number;
  patchReviewOpen: boolean;
  patchSet: DocumentPatchSet | null;
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
      applyReviewedPatches: patchReview.applyReviewedPatches,
      clearPatchSet: patchReview.clearPatchSet,
      closePatchReview: patchReview.closePatchReview,
      handleAcceptPatch: patchReview.handleAcceptPatch,
      handleEditPatch: patchReview.handleEditPatch,
      handleRejectPatch: patchReview.handleRejectPatch,
      loadPatchSet: patchReview.loadPatchSet,
      openPatchReview: patchReview.openPatchReview,
      patchCount: patchReview.patchCount,
      patchReviewOpen: patchReview.patchReviewOpen,
      patchSet: patchReview.patchSet,
      restoreVersionSnapshot: versionHistory.restoreVersionSnapshot,
      versionHistoryReady: versionHistory.versionHistoryReady,
      versionHistoryRestoring: versionHistory.versionHistoryRestoring,
      versionHistorySnapshots: versionHistory.versionHistorySnapshots,
      versionHistorySyncing: versionHistory.versionHistorySyncing,
    });
  }, [
    onStateChange,
    patchReview.acceptedPatchCount,
    patchReview.applyReviewedPatches,
    patchReview.clearPatchSet,
    patchReview.closePatchReview,
    patchReview.handleAcceptPatch,
    patchReview.handleEditPatch,
    patchReview.handleRejectPatch,
    patchReview.loadPatchSet,
    patchReview.openPatchReview,
    patchReview.patchCount,
    patchReview.patchReviewOpen,
    patchReview.patchSet,
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
