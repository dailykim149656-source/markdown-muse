import type { JSONContent } from "@tiptap/core";
import type { DocumentAst, DocumentMetadata } from "./documentAst";
import type { WorkspaceBinding } from "./workspace";

export type EditorMode = "markdown" | "latex" | "html" | "json" | "yaml";
export type StorageKind = "legacy" | "docsy";
export type SourceSnapshotMode = EditorMode | "asciidoc" | "rst";
export type SourceSnapshots = Partial<Record<SourceSnapshotMode, string>>;

export interface DocumentData {
  id: string;
  name: string;
  mode: EditorMode;
  content: string;
  createdAt: number;
  updatedAt: number;
  ast?: DocumentAst | null;
  metadata?: DocumentMetadata;
  sourceSnapshots?: SourceSnapshots;
  storageKind?: StorageKind;
  tiptapJson?: JSONContent | null;
  workspaceBinding?: WorkspaceBinding;
}

export interface AutoSaveData {
  version: 2;
  documents: DocumentData[];
  activeDocId: string;
  lastSaved: number;
}

export type AutoSaveIndicatorStatus = "saving" | "saved" | "error";

export interface AutoSaveIndicatorState {
  status: AutoSaveIndicatorStatus;
  lastSavedAt: number | null;
  error: string | null;
}

export type VersionSnapshotTrigger = "autosave" | "export" | "patch_apply";

export interface DocumentVersionSnapshotMetadata {
  exportFormat?: string;
  patchCount?: number;
  patchSetTitle?: string;
}

export interface DocumentVersionSnapshot {
  snapshotId: string;
  documentId: string;
  createdAt: number;
  mode: EditorMode;
  trigger: VersionSnapshotTrigger;
  contentHash: string;
  document: DocumentData;
  metadata?: DocumentVersionSnapshotMetadata;
}

export interface CreateDocumentOptions {
  ast?: DocumentAst | null;
  content?: string;
  createdAt?: number;
  id?: string;
  metadata?: DocumentMetadata;
  mode?: EditorMode;
  name?: string;
  replaceDocumentId?: string;
  sourceSnapshots?: SourceSnapshots;
  storageKind?: StorageKind;
  tiptapJson?: JSONContent | null;
  workspaceBinding?: WorkspaceBinding;
  updatedAt?: number;
}
