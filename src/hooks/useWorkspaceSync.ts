import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { applyWorkspaceDocument, WorkspaceApiError } from "@/lib/workspace/client";
import type { DocumentData } from "@/types/document";

interface UseWorkspaceSyncOptions {
  updateActiveDoc: (patch: Partial<DocumentData>) => void;
}

export const useWorkspaceSync = ({
  updateActiveDoc,
}: UseWorkspaceSyncOptions) => {
  const mutation = useMutation({
    mutationFn: applyWorkspaceDocument,
  });

  const syncDocument = useCallback(async (document: DocumentData) => {
    const binding = document.workspaceBinding;

    if (!binding || binding.provider !== "google_drive") {
      return null;
    }

    const markdown = document.sourceSnapshots?.markdown || document.content;

    updateActiveDoc({
      workspaceBinding: {
        ...binding,
        syncError: undefined,
        syncWarnings: undefined,
        syncStatus: "syncing",
      },
    });

    try {
      const result = await mutation.mutateAsync({
        baseRevisionId: binding.revisionId,
        documentId: document.id,
        fileId: binding.fileId,
        markdown,
      });

      updateActiveDoc({
        workspaceBinding: {
          ...binding,
          driveModifiedTime: result.driveModifiedTime,
          lastSyncedAt: result.appliedAt,
          revisionId: result.revisionId,
          syncError: undefined,
          syncWarnings: result.warnings.length > 0 ? result.warnings : undefined,
          syncStatus: result.syncStatus,
        },
      });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Workspace sync failed.";
      updateActiveDoc({
        workspaceBinding: {
          ...binding,
          syncError: message,
          syncWarnings: undefined,
          syncStatus: error instanceof WorkspaceApiError && error.statusCode === 409 ? "conflict" : "error",
        },
      });
      throw error;
    }
  }, [mutation, updateActiveDoc]);

  return {
    isSyncing: mutation.isPending,
    syncDocument,
  };
};
