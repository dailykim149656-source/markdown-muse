import type { DocumentData, EditorMode } from "@/types/document";
import type { WorkspaceBinding } from "@/types/workspace";

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
  tiptapJson: document.tiptapJson ?? null,
  workspaceBinding: normalizeWorkspaceBinding(document.workspaceBinding),
});
