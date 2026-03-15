import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { exportWorkspaceDocument } from "@/lib/workspace/client";
import type { DocumentData } from "@/types/document";

interface UseWorkspaceExportOptions {
  updateActiveDoc: (patch: Partial<DocumentData>) => void;
}

export const useWorkspaceExport = ({
  updateActiveDoc,
}: UseWorkspaceExportOptions) => {
  const mutation = useMutation({
    mutationFn: exportWorkspaceDocument,
  });

  const exportDocument = useCallback(async (
    document: DocumentData,
    options?: {
      markdown?: string;
      title?: string;
    },
  ) => {
    if (document.workspaceBinding?.provider === "google_drive") {
      throw new Error("This document is already linked to Google Docs.");
    }

    if (document.mode === "json" || document.mode === "yaml") {
      throw new Error("Google Docs export is only available for rich-text documents.");
    }

    const resolvedTitle = options?.title?.trim() || document.name.trim() || "Untitled";
    const markdown = options?.markdown ?? document.sourceSnapshots?.markdown ?? document.content;
    const result = await mutation.mutateAsync({
      documentId: document.id,
      markdown,
      title: resolvedTitle,
    });

    updateActiveDoc({
      name: resolvedTitle,
      workspaceBinding: result.workspaceBinding,
    });

    return result;
  }, [mutation, updateActiveDoc]);

  return {
    error: mutation.error || null,
    exportDocument,
    isExporting: mutation.isPending,
  };
};
