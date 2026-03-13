import { useEffect } from "react";
import { useWorkspaceAuth } from "@/hooks/useWorkspaceAuth";
import { useWorkspaceChanges } from "@/hooks/useWorkspaceChanges";
import { useWorkspaceExport } from "@/hooks/useWorkspaceExport";
import { useWorkspaceFiles } from "@/hooks/useWorkspaceFiles";
import { useWorkspaceSync } from "@/hooks/useWorkspaceSync";
import { resolveImportedDocumentOptions } from "@/lib/io/documentIoShared";
import type { CreateDocumentOptions, DocumentData } from "@/types/document";

export interface WorkspaceRuntimeState {
  aiSummaryAvailable: boolean;
  apiHealth: ReturnType<typeof useWorkspaceAuth>["apiHealth"];
  authError: ReturnType<typeof useWorkspaceAuth>["error"];
  changesError: ReturnType<typeof useWorkspaceChanges>["error"];
  connected: boolean;
  connectivityDiagnostic: ReturnType<typeof useWorkspaceAuth>["connectivityDiagnostic"];
  disconnect: ReturnType<typeof useWorkspaceAuth>["disconnect"];
  error: ReturnType<typeof useWorkspaceAuth>["error"];
  exportDocument: ReturnType<typeof useWorkspaceExport>["exportDocument"];
  exportError: ReturnType<typeof useWorkspaceExport>["error"];
  files: ReturnType<typeof useWorkspaceFiles>["files"];
  filesError: ReturnType<typeof useWorkspaceFiles>["error"];
  importFile: ReturnType<typeof useWorkspaceFiles>["importFile"];
  isAuthLoading: boolean;
  isConnecting: boolean;
  isDisconnecting: boolean;
  isExporting: boolean;
  isImporting: boolean;
  isFilesLoading: boolean;
  isRefreshingDocument: boolean;
  isRefreshingFiles: boolean;
  isRescanning: boolean;
  isSyncing: boolean;
  lastRescannedAt: number | null;
  openGoogleConnect: ReturnType<typeof useWorkspaceAuth>["openGoogleConnect"];
  query: string;
  refetchAuth: ReturnType<typeof useWorkspaceAuth>["refetch"];
  refetchFiles: ReturnType<typeof useWorkspaceFiles>["refetch"];
  refreshDocument: ReturnType<typeof useWorkspaceChanges>["refreshDocument"];
  remoteChangedSources: ReturnType<typeof useWorkspaceChanges>["remoteChangedSources"];
  rescan: ReturnType<typeof useWorkspaceChanges>["rescan"];
  session: ReturnType<typeof useWorkspaceAuth>["session"];
  setQuery: ReturnType<typeof useWorkspaceFiles>["setQuery"];
  syncDocument: ReturnType<typeof useWorkspaceSync>["syncDocument"];
}

interface WorkspaceRuntimeProps {
  activeDocId: string;
  createDocument: (options?: CreateDocumentOptions) => DocumentData;
  documents: DocumentData[];
  importDialogOpen: boolean;
  onStateChange: (state: WorkspaceRuntimeState | null) => void;
  updateActiveDoc: (patch: Partial<DocumentData>) => void;
  updateDocument: (documentId: string, patch: Partial<DocumentData>) => void;
}

const WorkspaceRuntime = ({
  activeDocId,
  createDocument,
  documents,
  importDialogOpen,
  onStateChange,
  updateActiveDoc,
  updateDocument,
}: WorkspaceRuntimeProps) => {
  const workspaceAuth = useWorkspaceAuth();
  const workspaceSync = useWorkspaceSync({
    updateActiveDoc,
  });
  const workspaceExport = useWorkspaceExport({
    updateActiveDoc,
  });
  const workspaceFiles = useWorkspaceFiles({
    enabled: importDialogOpen && workspaceAuth.connected,
  });
  const workspaceChanges = useWorkspaceChanges({
    documents,
    enabled: workspaceAuth.connected,
    onImportRefresh: (importedDocument) => {
      createDocument(resolveImportedDocumentOptions({
        activeDocId,
        documents,
        importedDocument,
      }));
    },
    updateDocument,
  });

  useEffect(() => {
    onStateChange({
      aiSummaryAvailable: workspaceAuth.aiSummaryAvailable,
      apiHealth: workspaceAuth.apiHealth,
      authError: workspaceAuth.error,
      changesError: workspaceChanges.error,
      connected: workspaceAuth.connected,
      connectivityDiagnostic: workspaceAuth.connectivityDiagnostic,
      disconnect: workspaceAuth.disconnect,
      error: workspaceAuth.error,
      exportDocument: workspaceExport.exportDocument,
      exportError: workspaceExport.error,
      files: workspaceFiles.files,
      filesError: workspaceFiles.error,
      importFile: workspaceFiles.importFile,
      isAuthLoading: workspaceAuth.isLoading,
      isConnecting: workspaceAuth.isConnecting,
      isDisconnecting: workspaceAuth.isDisconnecting,
      isExporting: workspaceExport.isExporting,
      isImporting: workspaceFiles.isImporting,
      isFilesLoading: workspaceFiles.isLoading,
      isRefreshingDocument: workspaceChanges.isRefreshingDocument,
      isRefreshingFiles: workspaceFiles.isRefreshing,
      isRescanning: workspaceChanges.isRescanning,
      isSyncing: workspaceSync.isSyncing,
      lastRescannedAt: workspaceChanges.lastRescannedAt,
      openGoogleConnect: workspaceAuth.openGoogleConnect,
      query: workspaceFiles.query,
      refetchAuth: workspaceAuth.refetch,
      refetchFiles: workspaceFiles.refetch,
      refreshDocument: workspaceChanges.refreshDocument,
      remoteChangedSources: workspaceChanges.remoteChangedSources,
      rescan: workspaceChanges.rescan,
      session: workspaceAuth.session,
      setQuery: workspaceFiles.setQuery,
      syncDocument: workspaceSync.syncDocument,
    });
  }, [
    onStateChange,
    workspaceAuth.aiSummaryAvailable,
    workspaceAuth.apiHealth,
    workspaceAuth.error,
    workspaceAuth.connected,
    workspaceAuth.connectivityDiagnostic,
    workspaceAuth.disconnect,
    workspaceAuth.error,
    workspaceAuth.isConnecting,
    workspaceAuth.isDisconnecting,
    workspaceAuth.isLoading,
    workspaceAuth.openGoogleConnect,
    workspaceAuth.refetch,
    workspaceAuth.session,
    workspaceChanges.isRefreshingDocument,
    workspaceChanges.isRescanning,
    workspaceChanges.lastRescannedAt,
    workspaceChanges.error,
    workspaceChanges.refreshDocument,
    workspaceChanges.remoteChangedSources,
    workspaceChanges.rescan,
    workspaceExport.error,
    workspaceExport.exportDocument,
    workspaceExport.isExporting,
    workspaceFiles.files,
    workspaceFiles.error,
    workspaceFiles.importFile,
    workspaceFiles.isImporting,
    workspaceFiles.isLoading,
    workspaceFiles.isRefreshing,
    workspaceFiles.query,
    workspaceFiles.refetch,
    workspaceFiles.setQuery,
    workspaceSync.isSyncing,
    workspaceSync.syncDocument,
  ]);

  useEffect(() => () => onStateChange(null), [onStateChange]);

  return null;
};

export default WorkspaceRuntime;
