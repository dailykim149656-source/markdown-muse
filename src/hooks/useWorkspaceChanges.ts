import { useCallback, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getWorkspaceChanges, importWorkspaceFile, rescanWorkspaceChanges } from "@/lib/workspace/client";
import type { CreateDocumentOptions, DocumentData } from "@/types/document";
import type { SourceChangeRecord } from "@/lib/knowledge/sourceFingerprint";

const WORKSPACE_CHANGES_QUERY_KEY = ["workspace-remote-changes"];

interface UseWorkspaceChangesOptions {
  documents: DocumentData[];
  enabled: boolean;
  onImportRefresh: (document: CreateDocumentOptions) => void;
  updateDocument: (documentId: string, patch: Partial<DocumentData>) => void;
}

const toRemoteChangedSources = (
  changes: Array<{
    detectedAt: number;
    documentId: string;
    name: string;
  }>,
): SourceChangeRecord[] =>
  changes.map((change) => ({
    changeType: "changed",
    documentId: change.documentId,
    documentName: change.name,
    scannedAt: change.detectedAt,
    sourceLabel: "Google",
  }));

export const useWorkspaceChanges = ({
  documents,
  enabled,
  onImportRefresh,
  updateDocument,
}: UseWorkspaceChangesOptions) => {
  const queryClient = useQueryClient();
  const changesQuery = useQuery({
    enabled,
    queryFn: getWorkspaceChanges,
    queryKey: WORKSPACE_CHANGES_QUERY_KEY,
    retry: false,
    staleTime: 10_000,
  });

  const rescanMutation = useMutation({
    mutationFn: rescanWorkspaceChanges,
    onSuccess: async (result) => {
      for (const change of result.changes) {
        const currentDocument = documents.find((document) => document.id === change.documentId);
        const workspaceBinding = currentDocument?.workspaceBinding;

        if (!workspaceBinding) {
          continue;
        }

        updateDocument(change.documentId, {
          workspaceBinding: {
            ...workspaceBinding,
            driveModifiedTime: change.modifiedTime || workspaceBinding.driveModifiedTime,
            syncError: "Remote Google Doc changed. Refresh before syncing.",
            syncWarnings: undefined,
            syncStatus: "conflict",
          },
        });
      }

      await queryClient.setQueryData(WORKSPACE_CHANGES_QUERY_KEY, result);
    },
  });

  const refreshDocumentMutation = useMutation({
    mutationFn: importWorkspaceFile,
    onSuccess: (result) => {
      onImportRefresh(result.document);
    },
  });

  const remoteChangedSources = useMemo(
    () => toRemoteChangedSources(changesQuery.data?.changes || []),
    [changesQuery.data?.changes],
  );

  useEffect(() => {
    for (const change of changesQuery.data?.changes || []) {
      const currentDocument = documents.find((document) => document.id === change.documentId);
      const workspaceBinding = currentDocument?.workspaceBinding;

      if (!workspaceBinding || workspaceBinding.syncStatus === "conflict") {
        continue;
      }

      updateDocument(change.documentId, {
        workspaceBinding: {
          ...workspaceBinding,
          driveModifiedTime: change.modifiedTime || workspaceBinding.driveModifiedTime,
          syncError: "Remote Google Doc changed. Refresh before syncing.",
          syncWarnings: undefined,
          syncStatus: "conflict",
        },
      });
    }
  }, [changesQuery.data?.changes, documents, updateDocument]);

  const refreshDocument = useCallback(async (documentId: string) => {
    const document = documents.find((candidate) => candidate.id === documentId);
    const fileId = document?.workspaceBinding?.fileId;

    if (!fileId) {
      return;
    }

    const result = await refreshDocumentMutation.mutateAsync({
      documentId,
      fileId,
    });
    await queryClient.invalidateQueries({ queryKey: WORKSPACE_CHANGES_QUERY_KEY });
    return result;
  }, [documents, queryClient, refreshDocumentMutation]);

  return {
    error: changesQuery.error || rescanMutation.error || refreshDocumentMutation.error || null,
    isRefreshingDocument: refreshDocumentMutation.isPending,
    isRescanning: rescanMutation.isPending,
    lastRescannedAt: changesQuery.data?.lastRescannedAt || null,
    refreshDocument,
    remoteChangedSources,
    rescan: rescanMutation.mutateAsync,
  };
};
