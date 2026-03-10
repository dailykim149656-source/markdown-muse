import type { DocumentData, EditorMode } from "@/types/document";

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

export const migrateStoredDocumentData = (document: DocumentData): DocumentData => ({
  ...document,
  ast: document.ast ?? null,
  metadata: normalizeMetadata(document.metadata),
  sourceSnapshots: normalizeSourceSnapshots(document.sourceSnapshots, document.mode, document.content),
  storageKind: document.storageKind ?? "legacy",
  tiptapJson: document.tiptapJson ?? null,
});
