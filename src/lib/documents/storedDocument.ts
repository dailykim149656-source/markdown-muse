import type { DocumentData, EditorMode } from "@/types/document";
import type { WorkspaceBinding } from "@/types/workspace";
import { isUsableTiptapDocument } from "@/lib/ast/tiptapUsability";

const normalizeMetadata = (metadata: DocumentData["metadata"]) => ({
  ...(metadata || {}),
});

const normalizeSourceSnapshots = (
  snapshots: DocumentData["sourceSnapshots"],
  mode: EditorMode,
  content: string,
) => ({
  ...(snapshots || {}),
  [mode]: snapshots?.[mode] ?? content,
});

const normalizeWorkspaceBinding = (workspaceBinding: WorkspaceBinding | undefined) =>
  workspaceBinding ? { ...workspaceBinding } : undefined;

export const migrateStoredDocumentData = (document: DocumentData): DocumentData => ({
  ...document,
  ast: document.ast ?? null,
  metadata: normalizeMetadata(document.metadata),
  sourceSnapshots: normalizeSourceSnapshots(document.sourceSnapshots, document.mode, document.content),
  storageKind: document.storageKind ?? "legacy",
  tiptapJson: (() => {
    const normalizedSnapshots = normalizeSourceSnapshots(document.sourceSnapshots, document.mode, document.content);
    const primarySource = normalizedSnapshots?.[document.mode] || document.content || "";

    if (!isUsableTiptapDocument(document.tiptapJson) && primarySource.trim().length > 0) {
      return null;
    }

    return document.tiptapJson ?? null;
  })(),
  workspaceBinding: normalizeWorkspaceBinding(document.workspaceBinding),
});
